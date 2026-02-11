from __future__ import annotations
from typing import List, Dict, Optional
from datetime import datetime, timezone, timedelta
import requests
import urllib.parse
import json

from fastapi import HTTPException
from app.utils.logger import get_logger
from app.config.config import settings

from app.database.mongo_client import (
    save_or_update_platform_connection,
    get_platform_connection_details,
    save_items,
    db,
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
    get_campaign_daily_insights,
    get_adgroup_daily_insights,
    get_ad_daily_insights,
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
                "client_id": settings.GOOGLE_CLIENT_ID,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
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
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
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
        selected = next((a for a in details.get("accounts", []) if str(a.get("id")) == str(manager_id)), None)
        if not selected:
            raise HTTPException(status_code=404, detail="Selected account not found.")

        if selected.get("isManager", False):
            client_accounts = get_direct_client_accounts(access_token, manager_id)
            save_or_update_platform_connection(user_id, GoogleService.PLATFORM_NAME, {
                "selected_manager_id": manager_id,
                "client_accounts": client_accounts,
                "mode": "manager",
            })
            return client_accounts
        else:
            save_or_update_platform_connection(user_id, GoogleService.PLATFORM_NAME, {
                "client_customer_id": manager_id,
                "mode": "direct",
            })
            logger.info(f"[GoogleService] Direct client {manager_id} selected for user {user_id}")
            return [{"id": manager_id, "name": selected.get("name"), "isManager": False}]

    @staticmethod
    def save_client_selection(user_id: str, client_id: str):
        details = get_platform_connection_details(user_id, GoogleService.PLATFORM_NAME) or {}
        mode = details.get("mode", "direct")
        save_or_update_platform_connection(user_id, GoogleService.PLATFORM_NAME, {
            "client_customer_id": client_id,
            "mode": mode,
        })
        logger.info(f"✅ Saved Google client {client_id} for user {user_id} (mode={mode})")

    # ---------------------- TOKEN ----------------------
    @staticmethod
    def _maybe_refresh_token(user_id: str) -> str:
        details = get_platform_connection_details(user_id, GoogleService.PLATFORM_NAME)
        if not details:
            raise HTTPException(status_code=404, detail="Google Ads connection not found.")

        access_token = details.get("access_token")
        expiry = details.get("token_expiry")

        expiry_dt = None
        if expiry:
            try:
                expiry_dt = datetime.fromisoformat(str(expiry).replace("Z", "+00:00"))
                if expiry_dt.tzinfo is None:
                    expiry_dt = expiry_dt.replace(tzinfo=timezone.utc)
            except Exception:
                expiry_dt = None

        now_utc = datetime.now(timezone.utc)

        if (not access_token) or (expiry_dt and expiry_dt <= now_utc):
            logger.info(f"[Google] Token expired, refreshing for user {user_id}")
            new_token = refresh_google_access_token(user_id)
            if not new_token:
                raise HTTPException(status_code=401, detail="Token refresh failed")
            return new_token

        return access_token

    # ---------------------- DATA FETCH ----------------------
    @staticmethod
    def fetch_campaigns(user_id: str, customer_id: str, manager_id: Optional[str] = None, date_range: str = "LAST_30_DAYS"):
        """Fetch all campaigns and metrics for a Google Ads customer account."""
        token = GoogleService._maybe_refresh_token(user_id)
        details = get_platform_connection_details(user_id, GoogleService.PLATFORM_NAME) or {}
        
        ctx_manager_id = (
            manager_id
            or details.get("selected_manager_id")
            or details.get("client_customer_id")
            or customer_id
        )

        resp = list_campaigns_for_child(token, customer_id, ctx_manager_id, date_range)

        if not resp:
            raise HTTPException(status_code=500, detail="Google API returned no response.")
        if resp.status_code != 200:
            logger.error(f"[GoogleService] Campaign API failed → {resp.status_code}: {resp.text[:300]}")
            raise HTTPException(status_code=resp.status_code, detail="Failed to fetch campaigns.")

        raw_data = resp.json().get("results", [])
        
        transformed_data = []
        for item in raw_data:
            campaign = item.get("campaign", {})
            metrics = item.get("metrics", {})
            budget = item.get("campaignBudget", {})

            # ✅ v23 Fix: Support both new DateTime fields and legacy Date fields
            start_date = campaign.get("startDateTime") or campaign.get("startDate")
            end_date = campaign.get("endDateTime") or campaign.get("endDate")

            transformed_data.append({
                "id": campaign.get("id"),
                "name": campaign.get("name"),
                "status": campaign.get("status"),
                "advertising_channel_type": campaign.get("advertisingChannelType"),
                "bidding_strategy_type": campaign.get("biddingStrategyType"),
                "start_date": start_date,
                "end_date": end_date,
                "resource_name": campaign.get("resourceName"),
                "clicks": metrics.get("clicks", "0"),
                "conversions": metrics.get("conversions", 0),
                "cost_micros": metrics.get("costMicros", "0"),
                "impressions": metrics.get("impressions", "0"),
                "budget_amount_micros": budget.get("amountMicros", "0"),
            })

        save_items("campaigns", customer_id, transformed_data, GoogleService.PLATFORM_NAME)
        return transformed_data

    @staticmethod
    def fetch_adgroups(user_id: str, customer_id: str, manager_id: Optional[str], campaign_id: str, date_range: str = "LAST_30_DAYS"):
        token = GoogleService._maybe_refresh_token(user_id)
        details = get_platform_connection_details(user_id, GoogleService.PLATFORM_NAME) or {}
        mode = details.get("mode", "direct")
        ctx_manager_id = manager_id or (details.get("selected_manager_id") if mode == "manager" else None)

        resp = list_adgroups_for_campaign(token, customer_id, ctx_manager_id, campaign_id, date_range)

        if not resp or resp.status_code != 200:
            logger.error(f"[GoogleService] AdGroup API failed → {resp.status_code if resp else 'NO RESP'}")
            raise HTTPException(status_code=resp.status_code if resp else 500, detail="Failed to fetch ad groups.")

        raw_data = resp.json().get("results", [])
        transformed_data = []
        for item in raw_data:
            ad_group = item.get("adGroup", {})
            metrics = item.get("metrics", {})
            transformed_data.append({
                "id": ad_group.get("id"),
                "name": ad_group.get("name"),
                "status": ad_group.get("status"),
                "type": ad_group.get("type"),
                "campaign_id": campaign_id,
                "clicks": metrics.get("clicks", "0"),
                "conversions": metrics.get("conversions", 0),
                "cost_micros": metrics.get("costMicros", "0"),
                "impressions": metrics.get("impressions", "0"),
            })

        save_items("adsets", customer_id, transformed_data, GoogleService.PLATFORM_NAME)
        return transformed_data

    @staticmethod
    def fetch_ads(user_id: str, customer_id: str, manager_id: Optional[str], ad_group_id: str, date_range: str = "LAST_30_DAYS"):
        token = GoogleService._maybe_refresh_token(user_id)
        details = get_platform_connection_details(user_id, GoogleService.PLATFORM_NAME) or {}
        mode = details.get("mode", "direct")
        ctx_manager_id = manager_id or (details.get("selected_manager_id") if mode == "manager" else None)

        resp = list_ads_for_adgroup(token, customer_id, ctx_manager_id, ad_group_id, date_range)

        if not resp or resp.status_code != 200:
            logger.error(f"[GoogleService] Ads API failed → {resp.status_code if resp else 'NO RESP'}")
            raise HTTPException(status_code=resp.status_code if resp else 500, detail="Failed to fetch ads.")

        raw_data = resp.json().get("results", [])
        transformed_data = []
        for item in raw_data:
            ad = item.get("adGroupAd", {}).get("ad", {})
            metrics = item.get("metrics", {})
            transformed_data.append({
                "id": ad.get("id"),
                "name": ad.get("name") or f"Ad {ad.get('id', '')}",
                "status": item.get("adGroupAd", {}).get("status"),
                "ad_group_id": ad_group_id,
                "final_urls": ad.get("finalUrls", []),
                "clicks": metrics.get("clicks", "0"),
                "conversions": metrics.get("conversions", 0),
                "cost_micros": metrics.get("costMicros", "0"),
                "impressions": metrics.get("impressions", "0"),
            })

        save_items("ads", customer_id, transformed_data, GoogleService.PLATFORM_NAME)
        return transformed_data

    @staticmethod
    def fetch_campaign_insights(user_id, customer_id, manager_id, date_range, campaign_id=None):
        from app.utils.google_api import get_campaign_insights
        token = GoogleService._maybe_refresh_token(user_id)
        return get_campaign_insights(token, customer_id, manager_id, date_range, campaign_id)

    @staticmethod
    def fetch_adgroup_insights(user_id, customer_id, manager_id, date_range, campaign_id=None):
        from app.utils.google_api import get_adgroup_insights
        token = GoogleService._maybe_refresh_token(user_id)
        return get_adgroup_insights(token, customer_id, manager_id, date_range, campaign_id)

    @staticmethod
    def fetch_ad_insights(user_id, customer_id, manager_id, date_range, ad_group_id=None):
        from app.utils.google_api import get_ad_insights
        token = GoogleService._maybe_refresh_token(user_id)
        return get_ad_insights(token, customer_id, manager_id, date_range, ad_group_id)

    @staticmethod
    def fetch_all_adgroups(user_id: str, customer_id: str, manager_id: Optional[str], date_range: str = "LAST_30_DAYS"):
        token = GoogleService._maybe_refresh_token(user_id)
        details = get_platform_connection_details(user_id, GoogleService.PLATFORM_NAME) or {}
        ctx_manager_id = manager_id or details.get("selected_manager_id")

        from app.utils.google_api import list_all_adgroups_for_customer
        adgroups = list_all_adgroups_for_customer(token, customer_id, ctx_manager_id, date_range)

        if not adgroups:
            logger.warning(f"[GoogleService] No ad groups found for customer {customer_id}")
            return []

        data = [
            {
                "id": i.get("adGroup", {}).get("id"),
                "name": i.get("adGroup", {}).get("name"),
                "campaign_id": i.get("campaign", {}).get("id"),
                "status": i.get("adGroup", {}).get("status"),
                "type": i.get("adGroup", {}).get("type"),
                "impressions": int(i.get("metrics", {}).get("impressions", 0) or 0),
                "clicks": int(i.get("metrics", {}).get("clicks", 0) or 0),
                "cost_micros": int(i.get("metrics", {}).get("costMicros", 0) or i.get("metrics", {}).get("cost_micros", 0) or 0),
                "conversions": float(i.get("metrics", {}).get("conversions", 0) or 0),
            }
            for i in adgroups
        ]
        save_items("adsets", customer_id, data, GoogleService.PLATFORM_NAME)
        return data

    @staticmethod
    def fetch_all_ads(user_id: str, customer_id: str, manager_id: Optional[str], date_range: str = "LAST_30_DAYS"):
        token = GoogleService._maybe_refresh_token(user_id)
        details = get_platform_connection_details(user_id, GoogleService.PLATFORM_NAME) or {}
        ctx_manager_id = manager_id or details.get("selected_manager_id")

        from app.utils.google_api import list_all_ads_for_customer
        ads = list_all_ads_for_customer(token, customer_id, ctx_manager_id, date_range)

        if not ads:
            logger.warning(f"[GoogleService] No ads found for customer {customer_id}")
            return []

        data = [
            {
                "id": i.get("adGroupAd", {}).get("ad", {}).get("id"),
                "name": i.get("adGroupAd", {}).get("ad", {}).get("name") or f"Ad {i.get('adGroupAd', {}).get('ad', {}).get('id', '')}",
                "ad_group_id": i.get("adGroup", {}).get("id"),
                "campaign_id": i.get("campaign", {}).get("id"),
                "status": i.get("adGroupAd", {}).get("status"),
                "clicks": int(i.get("metrics", {}).get("clicks", 0) or 0),
                "impressions": int(i.get("metrics", {}).get("impressions", 0) or 0),
                "cost_micros": int(i.get("metrics", {}).get("costMicros", 0) or i.get("metrics", {}).get("cost_micros", 0) or 0),
                "conversions": float(i.get("metrics", {}).get("conversions", 0) or 0),
            }
            for i in ads
        ]
        save_items("ads", customer_id, data, GoogleService.PLATFORM_NAME)
        return data

    # ---------------------- DAILY INSIGHTS FOR TRENDS ----------------------

    @staticmethod
    def fetch_and_store_daily_campaign_insights(
        user_id: str,
        customer_id: str,
        manager_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        days_back: int = 30
    ):
        """Fetch daily campaign insights and store in google_daily_campaign_insights collection."""
        token = GoogleService._maybe_refresh_token(user_id)
        details = get_platform_connection_details(user_id, GoogleService.PLATFORM_NAME) or {}
        
        ctx_manager_id = (
            manager_id
            or details.get("selected_manager_id")
            or details.get("client_customer_id")
            or customer_id
        )
        
        if not end_date:
            end_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if not start_date:
            start_date_obj = datetime.now(timezone.utc) - timedelta(days=days_back)
            start_date = start_date_obj.strftime("%Y-%m-%d")
        
        if start_date > end_date:
            raise HTTPException(status_code=400, detail="start_date must be before end_date")
        
        logger.info(f"[GoogleService] Fetching daily campaign insights from {start_date} to {end_date}")

        resp = get_campaign_daily_insights(token, customer_id, ctx_manager_id, start_date, end_date)

        if not resp or resp.status_code != 200:
            logger.error(f"[GoogleService] Failed to fetch daily campaign insights")
            raise HTTPException(status_code=500, detail="Failed to fetch daily campaign insights")

        try:
            raw_data = resp.json().get("results", [])
        except Exception:
            raw_data = []

        if not raw_data:
            logger.info("No daily campaign records found.")
            return []

        final_records = []
        for item in raw_data:
            campaign = item.get("campaign", {})
            metrics = item.get("metrics", {})
            segments = item.get("segments", {})

            record_date = segments.get("date")
            if not record_date:
                continue

            cost_micros = metrics.get("costMicros") or metrics.get("cost_micros") or 0

            record = {
                "user_id": user_id,
                "platform": "google",
                "ad_account_id": customer_id,
                "campaign_id": str(campaign.get("id", "")),
                "campaign_name": campaign.get("name", "Unknown Campaign"),
                "date_start": record_date,
                "date_stop": record_date,
                "ad_network_type": segments.get("adNetworkType"),
                "clicks": str(metrics.get("clicks", 0)),
                "impressions": str(metrics.get("impressions", 0)),
                "cost_micros": str(cost_micros),
                "conversions": float(metrics.get("conversions", 0)),
                "ctr": float(metrics.get("ctr", 0)),
                "last_updated": datetime.now(timezone.utc)
            }
            final_records.append(record)

        # ✅ Save to MongoDB
        try:
            collection = db["google_daily_campaign_insights"]
            
            # Delete existing to avoid duplicates
            collection.delete_many({
                "user_id": user_id,
                "ad_account_id": customer_id,
                "date_start": {"$gte": start_date, "$lte": end_date}
            })
            
            if final_records:
                collection.insert_many(final_records)
                logger.info(f"[GoogleService] ✅ Inserted {len(final_records)} daily campaign records")
            
        except Exception as e:
            logger.error(f"[GoogleService] MongoDB error: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        
        return final_records

    @staticmethod
    def fetch_and_store_daily_adgroup_insights(
        user_id: str,
        customer_id: str,
        manager_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        days_back: int = 30
    ):
        """Fetch daily ad group insights and store in google_daily_adgroup_insights collection."""
        token = GoogleService._maybe_refresh_token(user_id)
        details = get_platform_connection_details(user_id, GoogleService.PLATFORM_NAME) or {}
        
        ctx_manager_id = (
            manager_id
            or details.get("selected_manager_id")
            or details.get("client_customer_id")
            or customer_id
        )
        
        if not end_date:
            end_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if not start_date:
            start_date_obj = datetime.now(timezone.utc) - timedelta(days=days_back)
            start_date = start_date_obj.strftime("%Y-%m-%d")
        
        logger.info(f"[GoogleService] Fetching daily adgroup insights: {start_date} to {end_date}")
        
        # NOTE: get_adgroup_daily_insights still returns a Response object (raw) in the updated api file
        resp = get_adgroup_daily_insights(token, customer_id, ctx_manager_id, start_date, end_date)
        
        if not resp or resp.status_code != 200:
            logger.error(f"Adgroup API error")
            raise HTTPException(status_code=500, detail="Google API error")
        
        try:
            raw_data = resp.json().get("results", [])
        except Exception:
            raw_data = []
            
        daily_records = []
        for item in raw_data:
            ad_group = item.get("adGroup", {})
            campaign = item.get("campaign", {})
            metrics = item.get("metrics", {})
            segments = item.get("segments", {})
            
            record_date = segments.get("date")
            if not record_date: continue
            
            cost_micros = metrics.get("costMicros") or metrics.get("cost_micros") or 0
            
            record = {
                "user_id": user_id,
                "platform": "google",
                "ad_account_id": customer_id,
                "adgroup_id": str(ad_group.get("id", "")),
                "adgroup_name": ad_group.get("name", "Unknown AdGroup"),
                "campaign_id": str(campaign.get("id", "")),
                "campaign_name": campaign.get("name", "Unknown Campaign"),
                "date_start": record_date,
                "date_stop": record_date,
                "status": ad_group.get("status", "UNKNOWN"),
                "clicks": str(metrics.get("clicks", 0)),
                "impressions": str(metrics.get("impressions", 0)),
                "cost_micros": str(cost_micros),
                "conversions": float(metrics.get("conversions", 0)),
                "last_updated": datetime.now(timezone.utc)
            }
            daily_records.append(record)
        
        if daily_records:
            try:
                collection = db["google_daily_adgroup_insights"]
                collection.delete_many({
                    "user_id": user_id,
                    "ad_account_id": customer_id,
                    "date_start": {"$gte": start_date, "$lte": end_date}
                })
                collection.insert_many(daily_records)
            except Exception as e:
                logger.error(f"MongoDB error: {e}")
        
        return daily_records

    @staticmethod
    def fetch_and_store_daily_ad_insights(
        user_id: str,
        customer_id: str,
        manager_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        days_back: int = 30
    ):
        """Fetch daily ad insights and store in google_daily_ad_insights collection."""
        token = GoogleService._maybe_refresh_token(user_id)
        details = get_platform_connection_details(user_id, GoogleService.PLATFORM_NAME) or {}
        
        ctx_manager_id = (
            manager_id
            or details.get("selected_manager_id")
            or details.get("client_customer_id")
            or customer_id
        )
        
        if not end_date:
            end_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if not start_date:
            start_date_obj = datetime.now(timezone.utc) - timedelta(days=days_back)
            start_date = start_date_obj.strftime("%Y-%m-%d")
        
        logger.info(f"[GoogleService] Fetching daily ad insights: {start_date} to {end_date}")
        
        # NOTE: get_ad_daily_insights still returns a Response object (raw)
        resp = get_ad_daily_insights(token, customer_id, ctx_manager_id, start_date, end_date)
        
        if not resp or resp.status_code != 200:
            raise HTTPException(status_code=500, detail="Google API error")
        
        try:
            raw_data = resp.json().get("results", [])
        except Exception:
            raw_data = []
        
        daily_records = []
        for item in raw_data:
            ad = item.get("adGroupAd", {}).get("ad", {})
            ad_group = item.get("adGroup", {})
            campaign = item.get("campaign", {})
            metrics = item.get("metrics", {})
            segments = item.get("segments", {})
            
            record_date = segments.get("date")
            if not record_date: continue
            
            cost_micros = metrics.get("costMicros") or metrics.get("cost_micros") or 0
            
            record = {
                "user_id": user_id,
                "platform": "google",
                "ad_account_id": customer_id,
                "ad_id": str(ad.get("id", "")),
                "ad_name": ad.get("name") or f"Ad {ad.get('id', '')}",
                "adgroup_id": str(ad_group.get("id", "")),
                "adgroup_name": ad_group.get("name", "Unknown AdGroup"),
                "campaign_id": str(campaign.get("id", "")),
                "campaign_name": campaign.get("name", "Unknown Campaign"),
                "date_start": record_date,
                "date_stop": record_date,
                "status": item.get("adGroupAd", {}).get("status", "UNKNOWN"),
                "clicks": str(metrics.get("clicks", 0)),
                "impressions": str(metrics.get("impressions", 0)),
                "cost_micros": str(cost_micros),
                "conversions": float(metrics.get("conversions", 0)),
                "last_updated": datetime.now(timezone.utc)
            }
            daily_records.append(record)
        
        if daily_records:
            try:
                collection = db["google_daily_ad_insights"]
                collection.delete_many({
                    "user_id": user_id,
                    "ad_account_id": customer_id,
                    "date_start": {"$gte": start_date, "$lte": end_date}
                })
                collection.insert_many(daily_records)
            except Exception as e:
                logger.error(f"MongoDB error: {e}")
        
        return daily_records