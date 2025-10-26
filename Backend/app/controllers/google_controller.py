# FILE: app/controllers/google_controller.py
"""
FastAPI routes for handling Google OAuth and Google Ads data fetch flows.

What this file does:
- /google/login: returns an OAuth URL for the frontend to redirect the user to Google.
- /google/callback: completes OAuth; stores tokens + accessible accounts with basic info.
- /google/accounts/{user_id}: returns stored accessible accounts.
- /google/select-manager/{user_id}: saves selected MCC and stores its direct clients.
- /google/campaigns|/adgroups|/ads: fetches GAQL data for a chosen account and saves it.

Assumptions:
- You have working implementations for:
  - save_or_update_platform_connection(user_id, platform, platform_data)
  - get_platform_connection_details(user_id, platform)
  - save_items(collection_name, ad_account_id, items_data, platform)
  - create_state_token(data), decode_token(token), get_current_user_id(Depends)
- Settings includes:
  GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI,
  GOOGLE_DEVELOPER_TOKEN, (optional) GOOGLE_LOGIN_CUSTOMER_ID
"""

from __future__ import annotations

from typing import List, Dict, Optional

import urllib.parse
import requests
from datetime import datetime  # If you later store token expiry, etc.

from fastapi import APIRouter, Query, HTTPException, Depends
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from app.utils.logger import get_logger
from app.config import settings

# Database helpers
from app.database import (
    save_or_update_platform_connection,
    get_platform_connection_details,
    save_items,
)

# Security helpers
from app.utils.security import (
    create_state_token,
    decode_token,
    get_current_user_id,
)

# Google Ads API helpers (+ refresher)
from app.utils.google_api import (
    list_campaigns_for_child,
    list_accessible_customers,
    list_adgroups_for_campaign,
    list_ads_for_adgroup,
    get_account_details_batch,     # available if you want batch customer_client details
    get_direct_client_accounts,
    get_basic_account_info,
    refresh_google_access_token,   # ⬅️ token refresh helper
)


router = APIRouter(prefix="/google", tags=["Google Ads"])
logger = get_logger()

# OAuth scopes required for Ads + profile/email
SCOPES = " ".join([
    "https://www.googleapis.com/auth/adwords",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
    "openid",
])


# -----------------------------------------------------------------------------
# Pydantic request models
# -----------------------------------------------------------------------------

class SelectManagerPayload(BaseModel):
    """Payload for selecting a manager account (MCC)."""
    manager_id: str


# -----------------------------------------------------------------------------
# OAuth Flow
# -----------------------------------------------------------------------------

@router.get("/login")
def google_login(
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Step 1: Initiate Google OAuth flow.

    Returns:
        JSON containing `redirect_url` for the frontend to perform a browser redirect.
    """
    state_jwt = create_state_token(data={"sub": current_user_id})
    auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        + urllib.parse.urlencode({
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": SCOPES,
            "access_type": "offline",
            "prompt": "consent",
            "state": state_jwt,
        })
    )
    logger.info(f"[Google OAuth] Redirecting user {current_user_id}...")
    return {"redirect_url": auth_url}


@router.get("/callback")
def google_callback(
    code: str = Query(..., description="Authorization code from Google"),
    state: str = Query(..., description="Opaque state JWT returned by Google"),
):
    """
    Step 2: OAuth callback handler.

    Flow:
      1) Decode state JWT to find your own app's user ID.
      2) Exchange `code` for tokens (access_token, refresh_token, id_token).
      3) Fetch Google userinfo to store a platform identity reference (optional).
      4) List accessible customers and enrich with basic details.
      5) Save the connection bundle in your DB.
      6) Redirect to frontend profile page with success flag.

    Returns:
      HTTP Redirect to your frontend (or raise HTTPException on failures).
    """
    # 1) Decode state
    try:
        state_payload = decode_token(state)
        main_app_user_id = state_payload.get("sub")
        if not main_app_user_id:
            raise ValueError("State token missing 'sub'")
        logger.info(f"[Google Callback] State OK for user: {main_app_user_id}")
    except Exception as e:
        logger.error(f"[Google Callback] Invalid state token: {e}")
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    # 2) Exchange code -> tokens
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }
    try:
        t_resp = requests.post(token_url, data=data, timeout=20)
        if t_resp.status_code != 200:
            logger.error(f"[Google Callback] Token exchange failed: {t_resp.text}")
            raise HTTPException(status_code=502, detail="Failed to exchange auth code")
        tokens = t_resp.json()
        logger.info(f"[Google Callback] Token exchange OK for user: {main_app_user_id}")
    except requests.exceptions.RequestException as e:
        logger.error(f"[Google Callback] Token HTTP error: {e}")
        raise HTTPException(status_code=502, detail="Token exchange network error")

    access_token = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token")
    id_token = tokens.get("id_token")
    expires_in = tokens.get("expires_in")  # seconds
    if not access_token:
        raise HTTPException(status_code=502, detail="Missing access_token from Google")

    # 3) Fetch Google user info (optional but handy to track platform identity)
    platform_user_id: Optional[str] = None
    try:
        ui = requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=20,
        )
        if ui.status_code == 200:
            userinfo = ui.json()
            platform_user_id = userinfo.get("sub")  # Stable Google user id
            logger.info(f"[Google Callback] Fetched platform_user_id: {platform_user_id}")
        else:
            logger.warning(f"[Google Callback] userinfo failed: {ui.text}")
    except requests.exceptions.RequestException as e:
        logger.warning(f"[Google Callback] userinfo HTTP error: {e}")

    # 4) List accessible customers and enrich basic details
    detailed_accounts: List[Dict] = []
    try:
        acc_resp = list_accessible_customers(access_token)
        if acc_resp and acc_resp.status_code == 200:
            resource_names = acc_resp.json().get("resourceNames", [])
            logger.info(f"[Google Callback] Accessible resource names: {resource_names}")
            if resource_names:
                detailed_accounts = get_basic_account_info(access_token, resource_names)
                logger.info(f"[Google Callback] Basic account info count={len(detailed_accounts)}")
        else:
            error_text = acc_resp.text if acc_resp else "No response"
            status_code = acc_resp.status_code if acc_resp else 500
            logger.error(f"[Google Callback] listAccessibleCustomers failed ({status_code}): {error_text}")
    except Exception as e:
        logger.exception(f"[Google Callback] Error while fetching accounts: {e}")

    # 5) Save connection bundle (include expires_in so DB layer sets token_expiry)
    platform_data_to_save = {
        "connected": True,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "id_token": id_token,
        "platform_user_id": platform_user_id,
        "accounts": detailed_accounts,
        "scopes": SCOPES,
        "expires_in": expires_in,  # ⬅️ lets your DB helper compute token_expiry
    }
    save_or_update_platform_connection(
        user_id=main_app_user_id,
        platform="google",
        platform_data=platform_data_to_save,
    )
    logger.info(f"✅ [Google Callback] Connection details saved for user {main_app_user_id}")

    # 6) Frontend redirect - OLD 
    # return RedirectResponse(
    #     url=f"http://localhost:8080/profile?user_id={main_app_user_id}&connect_status=google_success"
    # )

    # NEW
    return RedirectResponse(
    url=f"http://localhost:8080/select-google-account?user_id={main_app_user_id}"
)


# -----------------------------------------------------------------------------
# Stored Accounts
# -----------------------------------------------------------------------------

@router.get("/accounts/{user_id}")
def get_google_accounts(
    user_id: str,
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Return the stored accessible accounts (ID, name, isManager) for a user.

    Raises:
        403 if user mismatch.
        404 if connection not found.
    """
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    connection_details = get_platform_connection_details(user_id, "google")

    if not connection_details or "accounts" not in connection_details:
        if connection_details and connection_details.get("connected"):
            logger.warning(f"Google connected for user {user_id} but no account details stored.")
            return {"user_id": user_id, "accounts": []}
        raise HTTPException(status_code=404, detail="Google Ads connection details not found.")

    accounts_list = connection_details.get("accounts", [])
    logger.info(f"Retrieved Google account details for user {user_id}: {len(accounts_list)} accounts.")
    return {"user_id": user_id, "accounts": accounts_list}


# -----------------------------------------------------------------------------
# Selecting MCC and Hydrating Direct Clients
# -----------------------------------------------------------------------------

@router.post("/select-manager/{user_id}")
def select_manager_and_get_clients(
    user_id: str,
    payload: SelectManagerPayload,
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Save a selected manager (MCC) ID and pull its directly-linked client accounts.

    Body:
        { "manager_id": "<MCC ID>" }

    Returns:
        { user_id, selected_manager_id, client_accounts: [...] }
    """
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    selected_manager_id = payload.manager_id
    if not selected_manager_id:
        raise HTTPException(status_code=400, detail="Missing 'manager_id'")

    connection_details = get_platform_connection_details(user_id, "google")
    if not connection_details or not connection_details.get("access_token"):
        raise HTTPException(status_code=404, detail="Google Ads connection details not found.")

    access_token = connection_details.get("access_token")

    client_accounts = get_direct_client_accounts(access_token, selected_manager_id)

    # Merge into existing google connection blob
    platform_data_update = {
        "selected_manager_id": selected_manager_id,
        "client_accounts": client_accounts,
    }
    save_or_update_platform_connection(
        user_id=user_id,
        platform="google",
        platform_data=platform_data_update,
    )

    logger.info(
        f"Set selected manager ID to {selected_manager_id} and stored {len(client_accounts)} client accounts for user {user_id}."
    )
    return {
        "user_id": user_id,
        "selected_manager_id": selected_manager_id,
        "client_accounts": client_accounts,
    }


# -----------------------------------------------------------------------------
# Helper: ensure fresh token (proactive check by token_expiry if available)
# -----------------------------------------------------------------------------

def _maybe_refresh_access_token(user_id: str, details: dict) -> str:
    """
    Check token_expiry (if present) and refresh if expired. Returns a usable access token.
    """
    access_token = details.get("access_token")
    token_expiry = details.get("token_expiry")

    # token_expiry may be a datetime or ISO string depending on how it's stored
    expiry_dt: Optional[datetime] = None
    if token_expiry:
        if isinstance(token_expiry, datetime):
            expiry_dt = token_expiry
        else:
            try:
                expiry_dt = datetime.fromisoformat(str(token_expiry).replace("Z", "+00:00"))
            except Exception:
                expiry_dt = None

    if (not access_token) or (expiry_dt and expiry_dt <= datetime.utcnow()):
        logger.info(f"[Google Ads] Access token expired/missing for user {user_id}, refreshing...")
        new_token = refresh_google_access_token(user_id)
        if new_token:
            return new_token

    return access_token


# -----------------------------------------------------------------------------
# Data Fetch Endpoints (Campaigns, AdGroups, Ads)
# -----------------------------------------------------------------------------

@router.get("/campaigns/{user_id}")
def get_google_campaigns(
    user_id: str,
    customer_id: str = Query(..., description="Google Ads Client Customer ID"),
    manager_id: str = Query(..., description="Parent MCC ID used as login-customer-id"),
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Fetch and store campaigns (with metrics) for a specific client account.

    Query Params:
        customer_id: client (child) account ID to query.
        manager_id: MCC ID to use for login context.
    """
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    details = get_platform_connection_details(user_id, "google")
    if not details:
        raise HTTPException(status_code=404, detail="Google Ads connection details not found.")

    access_token = _maybe_refresh_access_token(user_id, details)

    def _call(token: str):
        return list_campaigns_for_child(
            access_token=token,
            child_customer_id=customer_id,
            login_customer_id=manager_id,
        )

    try:
        resp = _call(access_token)
        if not resp or resp.status_code == 401:
            # Try a single refresh+retry on 401
            logger.warning(f"[Google Ads] 401 on campaigns. Refreshing token for user {user_id} and retrying...")
            rt = refresh_google_access_token(user_id)
            if not rt:
                error_detail = resp.text if resp else "Unauthorized and refresh failed"
                raise HTTPException(status_code=401, detail=error_detail)
            resp = _call(rt)

        if not resp or resp.status_code != 200:
            error_detail = resp.text if resp else "No response from API util"
            logger.error(f"[Google Ads] API error fetching campaigns: {error_detail}")
            raise HTTPException(status_code=resp.status_code if resp else 500, detail=error_detail)
    except requests.exceptions.RequestException as e:
        error_detail = e.response.text if getattr(e, "response", None) else str(e)
        logger.error(f"[Google Ads] Network/HTTP error fetching campaigns: {error_detail}")
        raise HTTPException(status_code=getattr(e.response, "status_code", 500) if getattr(e, "response", None) else 500, detail=error_detail)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[Google Ads] Unexpected error fetching campaigns: {e}")
        raise HTTPException(status_code=500, detail="Internal server error fetching campaigns.")

    data = resp.json().get("results", [])
    if data:
        campaigns_to_save: List[Dict] = []
        for item in data:
            merged = {}
            merged.update(item.get("campaign", {}) or {})
            merged.update(item.get("metrics", {}) or {})
            merged.update(item.get("campaignBudget", {}) or {})
            campaigns_to_save.append(merged)

        save_items(
            collection_name="campaigns",
            ad_account_id=customer_id,
            items_data=campaigns_to_save,
            platform="google",
        )
        logger.info(f"✅ Saved {len(campaigns_to_save)} Google campaigns for user {user_id}, customer {customer_id}.")

    return {"customer_id": customer_id, "campaign_count": len(data), "campaigns": data}


@router.get("/adgroups/{user_id}")
def get_google_adgroups(
    user_id: str,
    customer_id: str = Query(..., description="Client customer ID"),
    manager_id: str = Query(..., description="MCC ID"),
    campaign_id: str = Query(..., description="Campaign ID"),
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Fetch and store ad groups (with metrics) for a given campaign.
    """
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    details = get_platform_connection_details(user_id, "google")
    if not details:
        raise HTTPException(status_code=404, detail="Google Ads connection not found.")

    access_token = _maybe_refresh_access_token(user_id, details)

    def _call(token: str):
        return list_adgroups_for_campaign(
            access_token=token,
            child_customer_id=customer_id,
            login_customer_id=manager_id,
            campaign_id=campaign_id,
        )

    try:
        resp = _call(access_token)
        if not resp or resp.status_code == 401:
            logger.warning(f"[Google Ads] 401 on adgroups. Refreshing token for user {user_id} and retrying...")
            rt = refresh_google_access_token(user_id)
            if not rt:
                error_detail = resp.text if resp else "Unauthorized and refresh failed"
                raise HTTPException(status_code=401, detail=error_detail)
            resp = _call(rt)

        if not resp or resp.status_code != 200:
            error_detail = resp.text if resp else "No response from API util"
            logger.error(f"[Google Ads] API error fetching ad groups: {error_detail}")
            raise HTTPException(status_code=resp.status_code if resp else 500, detail=error_detail)
    except requests.exceptions.RequestException as e:
        error_detail = e.response.text if getattr(e, "response", None) else str(e)
        logger.error(f"[Google Ads] Network/HTTP error fetching ad groups: {error_detail}")
        raise HTTPException(status_code=getattr(e, "status_code", 500) if getattr(e, "response", None) else 500, detail=error_detail)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[Google Ads] Unexpected error fetching ad groups: {e}")
        raise HTTPException(status_code=500, detail="Internal server error fetching ad groups.")

    data = resp.json().get("results", [])
    if data:
        adgroups_to_save: List[Dict] = []
        for item in data:
            merged = {}
            merged.update(item.get("adGroup", {}) or {})
            merged.update(item.get("metrics", {}) or {})
            adgroups_to_save.append(merged)

        save_items(
            collection_name="adsets",   # your chosen collection name
            ad_account_id=customer_id,
            items_data=adgroups_to_save,
            platform="google",
        )
        logger.info(f"✅ Saved {len(adgroups_to_save)} Google Ad Groups for user {user_id}, campaign {campaign_id}.")

    return {"campaign_id": campaign_id, "adgroup_count": len(data), "adgroups": data}


@router.get("/ads/{user_id}")
def get_google_ads(
    user_id: str,
    customer_id: str = Query(..., description="Client customer ID"),
    manager_id: str = Query(..., description="MCC ID"),
    ad_group_id: str = Query(..., description="Ad group ID"),
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Fetch and store ads (with metrics) for a given ad group.
    """
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    details = get_platform_connection_details(user_id, "google")
    if not details:
        raise HTTPException(status_code=404, detail="Google Ads connection not found.")

    access_token = _maybe_refresh_access_token(user_id, details)

    def _call(token: str):
        return list_ads_for_adgroup(
            access_token=token,
            child_customer_id=customer_id,
            login_customer_id=manager_id,
            ad_group_id=ad_group_id,
        )

    try:
        resp = _call(access_token)
        if not resp or resp.status_code == 401:
            logger.warning(f"[Google Ads] 401 on ads. Refreshing token for user {user_id} and retrying...")
            rt = refresh_google_access_token(user_id)
            if not rt:
                error_detail = resp.text if resp else "Unauthorized and refresh failed"
                raise HTTPException(status_code=401, detail=error_detail)
            resp = _call(rt)

        if not resp or resp.status_code != 200:
            error_detail = resp.text if resp else "No response from API util"
            logger.error(f"[Google Ads] API error fetching ads: {error_detail}")
            raise HTTPException(status_code=resp.status_code if resp else 500, detail=error_detail)
    except requests.exceptions.RequestException as e:
        error_detail = e.response.text if getattr(e, "response", None) else str(e)
        logger.error(f"[Google Ads] Network/HTTP error fetching ads: {error_detail}")
        raise HTTPException(status_code=getattr(e, "status_code", 500) if getattr(e, "response", None) else 500, detail=error_detail)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[Google Ads] Unexpected error fetching ads: {e}")
        raise HTTPException(status_code=500, detail="Internal server error fetching ads.")

    data = resp.json().get("results", [])
    if data:
        ads_to_save: List[Dict] = []
        for item in data:
            # ad is nested under adGroupAd.ad
            ad_root = (item.get("adGroupAd", {}) or {}).get("ad", {}) or {}
            merged = {}
            merged.update(ad_root)
            merged.update(item.get("metrics", {}) or {})
            # status sits on adGroupAd (not inside ad)
            merged["status"] = (item.get("adGroupAd", {}) or {}).get("status")
            ads_to_save.append(merged)

        save_items(
            collection_name="ads",
            ad_account_id=customer_id,
            items_data=ads_to_save,
            platform="google",
        )
        logger.info(f"✅ Saved {len(ads_to_save)} Google Ads for user {user_id}, ad group {ad_group_id}.")

    return {"ad_group_id": ad_group_id, "ad_count": len(data), "ads": data}


@router.get("/insights/{user_id}")
async def get_google_insights(user_id: str, customer_id: str, manager_id: Optional[str] = None):
    """
    Retrieves daily campaign performance insights (clicks, impressions, CTR, cost, conversions)
    for the specified customer_id, saves to Mongo, and returns summary.
    """
    from app.utils.google_api import get_campaign_insights, refresh_google_access_token
    from app.database import get_platform_connection_details, save_google_daily_insights

    details = get_platform_connection_details(user_id, "google")
    if not details:
        raise HTTPException(status_code=400, detail="Google not connected for this user")

    access_token = details.get("access_token")
    if not access_token:
        access_token = refresh_google_access_token(user_id)
    if not access_token:
        raise HTTPException(status_code=401, detail="Google access token missing or expired")

    insights = get_campaign_insights(access_token, customer_id, manager_id)
    count = save_google_daily_insights(user_id, customer_id, insights)

    return {
        "user_id": user_id,
        "customer_id": customer_id,
        "insight_count": count,
        "insights": insights[:10]  # Preview only top 10
    }

