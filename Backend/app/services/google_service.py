# FILE: app/services/google_service.py
"""
Google Ads Service Layer
-------------------------
Encapsulates all business logic for Google Ads integration.
Keeps controllers lightweight and consistent with Shopify/Meta design.

Responsibilities:
- OAuth2 login + callback
- Account and MCC selection
- Campaigns / AdGroups / Ads / Insights fetching
- Token refresh + expiry handling
"""

from __future__ import annotations
from typing import List, Dict, Optional
from datetime import datetime
import requests
import urllib.parse

from fastapi import HTTPException
from app.utils.logger import get_logger
from app.config import config
from app.database.mongo_client import (
    save_or_update_platform_connection,
    get_platform_connection_details,
    save_items,
    save_google_daily_insights,
)
from app.utils.security import create_state_token, decode_token
from app.utils.google_api import (
    list_campaigns_for_child,
    list_accessible_customers,
    list_adgroups_for_campaign,
    list_ads_for_adgroup,
    get_basic_account_info,
    get_direct_client_accounts,
    refresh_google_access_token,
    get_campaign_insights,
)

logger = get_logger()


class GoogleService:
    PLATFORM_NAME = "google"
    SCOPES = " ".join([
        "https://www.googleapis.com/auth/adwords",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
        "openid",
    ])

    # ---------------------- OAUTH FLOW ----------------------
    @staticmethod
    def build_login_url(user_id: str) -> str:
        """Return a Google OAuth URL with JWT state parameter."""
        state_token = create_state_token(data={"sub": user_id})
        auth_url = (
            "https://accounts.google.com/o/oauth2/v2/auth?"
            + urllib.parse.urlencode({
                "client_id": config.settings.GOOGLE_CLIENT_ID,
                "redirect_uri": config.settings.GOOGLE_REDIRECT_URI,
                "response_type": "code",
                "scope": GoogleService.SCOPES,
                "access_type": "offline",
                "prompt": "consent",
                "state": state_token,
            })
        )
        return auth_url

    @staticmethod
    def handle_callback(code: str, state: str) -> str:
        """Exchange code for tokens, fetch accounts, and save connection."""
        try:
            payload = decode_token(state)
            main_app_user_id = payload.get("sub")
            if not main_app_user_id:
                raise ValueError("Missing user_id in state token")
        except Exception as e:
            logger.error(f"[Google Callback] Invalid state token: {e}")
            raise HTTPException(status_code=400, detail="Invalid OAuth state")

        # Exchange code for tokens
        token_url = "https://oauth2.googleapis.com/token"
        data = {
            "code": code,
            "client_id": config.settings.GOOGLE_CLIENT_ID,
            "client_secret": config.settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": config.settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        }
        try:
            resp = requests.post(token_url, data=data, timeout=20)
            resp.raise_for_status()
            tokens = resp.json()
        except requests.RequestException as e:
            raise HTTPException(status_code=502, detail=f"Token exchange failed: {e}")

        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")
        expires_in = tokens.get("expires_in")
        id_token = tokens.get("id_token")

        # Get Google user info
        platform_user_id = None
        try:
            ui = requests.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=20,
            )
            if ui.status_code == 200:
                platform_user_id = ui.json().get("sub")
        except Exception:
            logger.warning("Could not fetch Google userinfo.")

        # Fetch accessible accounts
        detailed_accounts = []
        try:
            acc_resp = list_accessible_customers(access_token)
            if acc_resp and acc_resp.status_code == 200:
                resource_names = acc_resp.json().get("resourceNames", [])
                if resource_names:
                    detailed_accounts = get_basic_account_info(access_token, resource_names)
        except Exception as e:
            logger.warning(f"[Google Callback] Failed to list accounts: {e}")

        # Save connection
        platform_data = {
            "connected": True,
            "access_token": access_token,
            "refresh_token": refresh_token,
            "id_token": id_token,
            "platform_user_id": platform_user_id,
            "accounts": detailed_accounts,
            "scopes": GoogleService.SCOPES,
            "expires_in": expires_in,
        }
        save_or_update_platform_connection(main_app_user_id, GoogleService.PLATFORM_NAME, platform_data)

        logger.info(f"✅ Google connection saved for user {main_app_user_id}")
        return main_app_user_id

    # ---------------------- ACCOUNT HANDLING ----------------------
    @staticmethod
    def get_stored_accounts(user_id: str) -> List[Dict]:
        details = get_platform_connection_details(user_id, GoogleService.PLATFORM_NAME)
        if not details or "accounts" not in details:
            raise HTTPException(status_code=404, detail="No stored Google accounts found.")
        return details.get("accounts", [])

    @staticmethod
    def select_manager_and_fetch_clients(user_id: str, manager_id: str) -> List[Dict]:
        details = get_platform_connection_details(user_id, GoogleService.PLATFORM_NAME)
        if not details or not details.get("access_token"):
            raise HTTPException(status_code=404, detail="Google Ads connection not found.")

        access_token = details["access_token"]
        client_accounts = get_direct_client_accounts(access_token, manager_id)

        save_or_update_platform_connection(user_id, GoogleService.PLATFORM_NAME, {
            "selected_manager_id": manager_id,
            "client_accounts": client_accounts,
        })
        return client_accounts

    @staticmethod
    def save_client_selection(user_id: str, client_id: str):
        save_or_update_platform_connection(user_id, GoogleService.PLATFORM_NAME, {
            "client_customer_id": client_id
        })
        logger.info(f"✅ Saved Google client {client_id} for user {user_id}")

    # ---------------------- TOKEN ----------------------
    @staticmethod
    def _maybe_refresh_token(user_id: str) -> str:
        details = get_platform_connection_details(user_id, GoogleService.PLATFORM_NAME)
        if not details:
            raise HTTPException(status_code=404, detail="Google Ads connection not found.")

        access_token = details.get("access_token")
        expiry = details.get("token_expiry")
        if not expiry:
            expiry_dt = None
        else:
            try:
                expiry_dt = datetime.fromisoformat(str(expiry).replace("Z", "+00:00"))
            except Exception:
                expiry_dt = None

        if (not access_token) or (expiry_dt and expiry_dt <= datetime.utcnow()):
            logger.info(f"[Google] Token expired, refreshing for user {user_id}")
            new_token = refresh_google_access_token(user_id)
            if not new_token:
                raise HTTPException(status_code=401, detail="Token refresh failed")
            return new_token
        return access_token

    # ---------------------- DATA FETCH ----------------------
    @staticmethod
    def fetch_campaigns(user_id: str, customer_id: str, manager_id: str):
        token = GoogleService._maybe_refresh_token(user_id)
        resp = list_campaigns_for_child(token, customer_id, manager_id)
        if not resp or resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code if resp else 500, detail="Failed to fetch campaigns.")
        data = resp.json().get("results", [])
        save_items("campaigns", customer_id, data, GoogleService.PLATFORM_NAME)
        return data

    @staticmethod
    def fetch_adgroups(user_id: str, customer_id: str, manager_id: str, campaign_id: str):
        token = GoogleService._maybe_refresh_token(user_id)
        resp = list_adgroups_for_campaign(token, customer_id, manager_id, campaign_id)
        if not resp or resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code if resp else 500, detail="Failed to fetch ad groups.")
        data = resp.json().get("results", [])
        save_items("adsets", customer_id, data, GoogleService.PLATFORM_NAME)
        return data

    @staticmethod
    def fetch_ads(user_id: str, customer_id: str, manager_id: str, ad_group_id: str):
        token = GoogleService._maybe_refresh_token(user_id)
        resp = list_ads_for_adgroup(token, customer_id, manager_id, ad_group_id)
        if not resp or resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code if resp else 500, detail="Failed to fetch ads.")
        data = resp.json().get("results", [])
        save_items("ads", customer_id, data, GoogleService.PLATFORM_NAME)
        return data

    @staticmethod
    def fetch_insights(user_id: str, customer_id: str, manager_id: Optional[str] = None):
        token = GoogleService._maybe_refresh_token(user_id)
        insights = get_campaign_insights(token, customer_id, manager_id)
        count = save_google_daily_insights(user_id, customer_id, insights)
        return {"count": count, "data": insights}
