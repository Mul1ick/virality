# FILE: app/controllers/google_controller.py

from fastapi import APIRouter, Query, HTTPException, Depends
from fastapi.responses import RedirectResponse
import requests
import urllib.parse
from datetime import datetime # Needed if you calculate expiry time

from app.utils.logger import get_logger
from app.config import settings
# 👇 NEW IMPORTS for new architecture
from app.database import save_or_update_platform_connection, get_platform_connection_details, save_items
# 👇 NEW IMPORTS for security/auth
from app.utils.security import create_state_token, decode_token, get_current_user_id
# 👇 Keep existing API utils
from app.utils.google_api import (
    list_campaigns_for_child,
    list_accessible_customers,
    list_adgroups_for_campaign,
    list_ads_for_adgroup
)

router = APIRouter(prefix="/google", tags=["Google Ads"])
logger = get_logger() # Use __name__ for better logging context

# Define scopes (ensure openid is included)
SCOPES = "https://www.googleapis.com/auth/adwords https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email openid"

# --- Refactored OAuth Endpoints ---

@router.get("/login")
def google_login(
    current_user_id: str = Depends(get_current_user_id) # Require authentication
):
    """
    Initiates Google OAuth flow, passing user_id securely via JWT state.
    """
    state_jwt = create_state_token(data={"sub": current_user_id}) # Generate JWT for state

    auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        + urllib.parse.urlencode({
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": SCOPES,
            "access_type": "offline", # Request refresh token
            "prompt": "consent", # Force consent screen, important for getting refresh token reliably
            "state": state_jwt # Pass JWT as state parameter
        })
    )
    logger.info(f"[Google OAuth] Redirecting user {current_user_id} to consent screen...")
    return {"redirect_url": auth_url}


@router.get("/callback")
def google_callback(
    code: str = Query(..., description="Authorization code from Google"),
    state: str = Query(..., description="State parameter containing JWT") # Receive JWT state
):
    """
    Handles Google OAuth callback.
    Verifies state, exchanges code, fetches user info & ad accounts, saves connection.
    """
    # 1. Decode state JWT to securely get the user_id
    try:
        token_payload = decode_token(state)
        main_app_user_id = token_payload.get("sub")
        if not main_app_user_id:
            raise HTTPException(status_code=400, detail="Invalid state token: Missing user identifier")
        logger.info(f"[Google OAuth Callback] State token decoded successfully for user: {main_app_user_id}")
    except HTTPException as e:
        logger.error(f"[Google OAuth Callback] Invalid state token: {e.detail}")
        return RedirectResponse(url=f"http://localhost:8080/profile?connect_status=google_error&error=invalid_state")
    except Exception as e:
        logger.error(f"[Google OAuth Callback] Error decoding state token: {e}")
        return RedirectResponse(url=f"http://localhost:8080/profile?connect_status=google_error&error=state_decode_error")

    # 2. Exchange Code for Tokens
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }
    try:
        resp = requests.post(token_url, data=data)
        resp.raise_for_status() # Raise exception for non-2xx status codes
        tokens = resp.json()
        logger.info(f"[Google OAuth Callback] Token exchange successful for user: {main_app_user_id}")
    except requests.exceptions.RequestException as e:
        error_detail = e.response.text if e.response else str(e)
        logger.error(f"[Google OAuth Callback] Token exchange failed for user {main_app_user_id}: {error_detail}")
        return RedirectResponse(url=f"http://localhost:8080/profile?connect_status=google_error&error=token_exchange_failed")

    access_token = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token") # Capture the refresh token

    if not access_token:
        logger.error(f"[Google OAuth Callback] Access token missing in response for user {main_app_user_id}")
        return RedirectResponse(url=f"http://localhost:8080/profile?connect_status=google_error&error=missing_access_token")

    # 3. Get Google User Info (Platform User ID)
    platform_user_id = "fetch_failed" # Default value
    try:
        user_info_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        user_resp = requests.get(user_info_url, headers={"Authorization": f"Bearer {access_token}"})
        user_resp.raise_for_status()
        user_data = user_resp.json()
        platform_user_id = user_data.get("id") or user_data.get("email") or "unknown_google_user"
        logger.info(f"[Google OAuth Callback] Fetched platform_user_id: {platform_user_id}")
    except requests.exceptions.RequestException as e:
        logger.error(f"[Google OAuth Callback] Failed to fetch Google user info for {main_app_user_id}: {e}")
        # Decide if this is critical - maybe proceed without platform_user_id?

    # 4. Get Accessible Google Ads Customer IDs
    customer_ids = []
    try:
        acc_resp = list_accessible_customers(access_token)
        if acc_resp.status_code == 200:
            resource_names = acc_resp.json().get("resourceNames", [])
            # Filter out potential empty strings or malformed names
            customer_ids = [name.split("/")[-1] for name in resource_names if name and "/" in name]
            logger.info(f"[Google OAuth Callback] Found accessible customer IDs for user {main_app_user_id}: {customer_ids}")
        else:
             logger.error(f"[Google OAuth Callback] Failed to list accessible customers for {main_app_user_id}. Status: {acc_resp.status_code}, Response: {acc_resp.text}")
    except Exception as e:
        logger.error(f"[Google OAuth Callback] Error calling list_accessible_customers for {main_app_user_id}: {e}")

    # 5. Prepare Data for Saving
    platform_data_to_save = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "platform_user_id": platform_user_id,
        "customer_ids": customer_ids,
        # Google tokens expire, but refresh token is used to get new ones. Storing expiry isn't essential here.
    }

    # 6. Save Connection Details using the NEW database function
    save_or_update_platform_connection(
        user_id=main_app_user_id, # Use the ID verified from the state JWT
        platform="google",
        platform_data=platform_data_to_save
    )
    logger.info(f"✅ [Google OAuth Callback] Connection details saved for user {main_app_user_id}")

    # 7. Redirect to Frontend Profile Page
    return RedirectResponse(url=f"http://localhost:8080/profile?user_id={main_app_user_id}&connect_status=google_success")


# --- Refactored Data Fetching Endpoints ---

@router.get("/accounts/{user_id}")
def get_google_accounts(
    user_id: str,
    current_user_id: str = Depends(get_current_user_id) # Add authentication check
):
    """Fetches stored accessible Google Ads accounts for the authenticated user."""
    # Validate that the requested user_id matches the authenticated user
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden: Cannot access another user's accounts")

    # Use the new function to get stored connection details
    connection_details = get_platform_connection_details(user_id, "google")

    # Check if connection exists and has customer IDs
    if not connection_details or "customer_ids" not in connection_details:
        # It's better to return empty list than 404 if connection exists but no accounts were found during callback
        if connection_details and connection_details.get("connected"):
             logger.warning(f"Google connected for user {user_id} but no customer IDs stored.")
             return {"user_id": user_id, "customer_ids": []}
        else:
             raise HTTPException(status_code=404, detail="Google Ads connection not found for this user.")

    customer_ids = connection_details.get("customer_ids", [])
    logger.info(f"Retrieved Google customer IDs for user {user_id}: {customer_ids}")
    return {"user_id": user_id, "customer_ids": customer_ids}


@router.get("/campaigns/{user_id}")
def get_google_campaigns(
    user_id: str,
    customer_id: str = Query(..., description="The Google Ads Client Customer ID"),
    manager_id: str = Query(..., description="The parent Google Ads Manager Account ID"),
    current_user_id: str = Depends(get_current_user_id) # Add authentication check
):
    """Fetches and saves campaigns for a specific client account, requires authentication."""
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    connection_details = get_platform_connection_details(user_id, "google")
    if not connection_details or not connection_details.get("access_token"):
        raise HTTPException(status_code=404, detail="Google Ads connection details not found or token missing.")

    access_token = connection_details.get("access_token")
    # Consider validating customer_id against stored connection_details['customer_ids'] here for extra security

    try:
        resp = list_campaigns_for_child(
            access_token=access_token,
            child_customer_id=customer_id,
            login_customer_id=manager_id
        )
        # Check specific Google Ads API errors if needed, raise_for_status() handles HTTP errors
        if resp.status_code != 200:
             # Log detailed error from Google Ads API response if available
             error_detail = resp.text
             logger.error(f"[Google Ads] API error fetching campaigns for user {user_id}, customer {customer_id}: {error_detail}")
             raise HTTPException(status_code=resp.status_code, detail=error_detail)

    except requests.exceptions.RequestException as e:
        error_detail = e.response.text if e.response else str(e)
        logger.error(f"[Google Ads] Network/HTTP error fetching campaigns for user {user_id}, customer {customer_id}: {error_detail}")
        raise HTTPException(status_code=e.response.status_code if e.response else 500, detail=error_detail)
    except Exception as e:
        logger.exception(f"[Google Ads] Unexpected error fetching campaigns for user {user_id}, customer {customer_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error fetching campaigns.")

    data = resp.json().get("results", [])
    if data:
        campaigns_to_save = []
        for item in data:
            # Safely get nested dictionaries
            merged_campaign = item.get('campaign', {})
            merged_campaign.update(item.get('metrics', {}))
            merged_campaign.update(item.get('campaignBudget', {}))
            campaigns_to_save.append(merged_campaign)

        # Assuming save_items handles potential database errors
        save_items(
            collection_name="campaigns",
            ad_account_id=customer_id,
            items_data=campaigns_to_save,
            platform="google"
        )
        logger.info(f"✅ Saved {len(campaigns_to_save)} Google campaigns for user {user_id}, customer {customer_id}.")

    return {"customer_id": customer_id, "campaign_count": len(data), "campaigns": data}


@router.get("/adgroups/{user_id}")
def get_google_adgroups(
    user_id: str,
    customer_id: str = Query(...),
    manager_id: str = Query(...),
    campaign_id: str = Query(...),
    current_user_id: str = Depends(get_current_user_id) # Add authentication check
):
    """Fetches and saves ad groups for a specific campaign, requires authentication."""
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    connection_details = get_platform_connection_details(user_id, "google")
    if not connection_details or not connection_details.get("access_token"):
        raise HTTPException(status_code=404, detail="Google Ads connection details not found.")

    access_token = connection_details.get("access_token")

    try:
        resp = list_adgroups_for_campaign(
            access_token=access_token,
            child_customer_id=customer_id,
            login_customer_id=manager_id,
            campaign_id=campaign_id
        )
        if resp.status_code != 200:
             error_detail = resp.text
             logger.error(f"[Google Ads] API error fetching ad groups for user {user_id}, campaign {campaign_id}: {error_detail}")
             raise HTTPException(status_code=resp.status_code, detail=error_detail)

    except requests.exceptions.RequestException as e:
        error_detail = e.response.text if e.response else str(e)
        logger.error(f"[Google Ads] Network/HTTP error fetching ad groups for user {user_id}, campaign {campaign_id}: {error_detail}")
        raise HTTPException(status_code=e.response.status_code if e.response else 500, detail=error_detail)
    except Exception as e:
        logger.exception(f"[Google Ads] Unexpected error fetching ad groups for user {user_id}, campaign {campaign_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error fetching ad groups.")

    data = resp.json().get("results", [])
    if data:
        adgroups_to_save = []
        for item in data:
             merged_adgroup = item.get('adGroup', {})
             merged_adgroup.update(item.get('metrics', {}))
             adgroups_to_save.append(merged_adgroup)

        save_items(
            collection_name="adsets", # Saving to 'adsets' collection
            ad_account_id=customer_id,
            items_data=adgroups_to_save,
            platform="google"
        )
        logger.info(f"✅ Saved {len(adgroups_to_save)} Google Ad Groups for user {user_id}, campaign {campaign_id}.")

    return {"campaign_id": campaign_id, "adgroup_count": len(data), "adgroups": data}


@router.get("/ads/{user_id}")
def get_google_ads(
    user_id: str,
    customer_id: str = Query(...),
    manager_id: str = Query(...),
    ad_group_id: str = Query(...),
    current_user_id: str = Depends(get_current_user_id) # Add authentication check
):
    """Fetches and saves ads for a specific ad group, requires authentication."""
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    connection_details = get_platform_connection_details(user_id, "google")
    if not connection_details or not connection_details.get("access_token"):
        raise HTTPException(status_code=404, detail="Google Ads connection details not found.")

    access_token = connection_details.get("access_token")

    try:
        resp = list_ads_for_adgroup(
            access_token=access_token,
            child_customer_id=customer_id,
            login_customer_id=manager_id,
            ad_group_id=ad_group_id
        )
        if resp.status_code != 200:
             error_detail = resp.text
             logger.error(f"[Google Ads] API error fetching ads for user {user_id}, ad group {ad_group_id}: {error_detail}")
             raise HTTPException(status_code=resp.status_code, detail=error_detail)

    except requests.exceptions.RequestException as e:
        error_detail = e.response.text if e.response else str(e)
        logger.error(f"[Google Ads] Network/HTTP error fetching ads for user {user_id}, ad group {ad_group_id}: {error_detail}")
        raise HTTPException(status_code=e.response.status_code if e.response else 500, detail=error_detail)
    except Exception as e:
        logger.exception(f"[Google Ads] Unexpected error fetching ads for user {user_id}, ad group {ad_group_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error fetching ads.")

    data = resp.json().get("results", [])
    if data:
        ads_to_save = []
        for item in data:
            merged_ad = item.get('adGroupAd', {}).get('ad', {})
            merged_ad.update(item.get('metrics', {}))
            merged_ad['status'] = item.get('adGroupAd', {}).get('status')
            ads_to_save.append(merged_ad)

        save_items(
            collection_name="ads",
            ad_account_id=customer_id,
            items_data=ads_to_save,
            platform="google"
        )
        logger.info(f"✅ Saved {len(ads_to_save)} Google Ads for user {user_id}, ad group {ad_group_id}.")

    return {"ad_group_id": ad_group_id, "ad_count": len(data), "ads": data}