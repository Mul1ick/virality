

from fastapi import APIRouter, Query, HTTPException, BackgroundTasks,Depends
from fastapi.responses import RedirectResponse
import requests
import urllib.parse
from datetime import date
from dateutil.relativedelta import relativedelta

from app.utils.logger import get_logger
from app.config import settings
from app.database import (
    get_platform_connection_details, # Use this to get details later
    save_or_update_platform_connection, # Use this to save
    get_user_by_id, # Optional: if linking Meta ID to main App ID
    save_items,
    save_item_insights,
    save_daily_insights, # Assuming these save functions handle user_id/account_id correctly
    save_daily_ad_insights,
    save_daily_campaign_insights
)
from app.utils.meta_api_utils import generate_monthly_ranges, fetch_paginated_insights
from app.utils.security import create_state_token, decode_token, get_current_user_id    
from pydantic import BaseModel

router = APIRouter(prefix="/meta", tags=["Meta Ads"])
logger = get_logger()

# --- Constants ---
API_VERSION = "v20.0"
SCOPES = "ads_read,read_insights,ads_management,business_management" # Added business_management scope
PLATFORM_NAME = "meta"

# --- Authentication Endpoints ---

@router.get("/login")
async def meta_login(user_id: str = Depends(get_current_user_id)):
    """
    Builds the Meta OAuth login URL, including a JWT state parameter
    containing the application's user ID.
    Requires the user to be authenticated (pass JWT in Authorization header).
    """
    if not user_id:
        # This shouldn't happen if get_current_user_id works correctly
        raise HTTPException(status_code=401, detail="Could not validate credentials")

    # Create a short-lived JWT for the state parameter
    state_token = create_state_token(data={"sub": user_id})

    dialog_url = (f"https://www.facebook.com/{API_VERSION}/dialog/oauth?" + urllib.parse.urlencode({
        "client_id": settings.META_APP_ID,
        "redirect_uri": settings.META_REDIRECT_URI,
        "scope": SCOPES,
        "response_type": "code",
        "state": state_token # Pass the JWT as state
    }))
    logger.info(f"[Meta OAuth] Redirecting user {user_id} to consent screen with state.")
    return {"redirect_url": dialog_url}

@router.get("/callback")
def meta_callback(code: str = Query(..., description="Authorization code from Meta"),
                  state: str = Query(..., description="State parameter containing user ID JWT")):
    """
    Handles the callback from Meta, exchanges code for token, fetches ad account ID,
    and saves connection details to the user's document in MongoDB.
    """


    try:
        payload = decode_token(state) # Use your JWT decoding function
        main_app_user_id = payload.get("sub")
        if not main_app_user_id:
            raise HTTPException(status_code=400, detail="Invalid state: User ID missing")
        logger.info(f"[Meta OAuth Callback] State decoded successfully for user: {main_app_user_id}")
    except Exception as e: # Catch JWT errors (expired, invalid signature etc.)
        logger.error(f"[Meta OAuth Callback] Invalid state parameter: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid or expired state parameter: {e}")
    


    # 1. Exchange code for short-lived token
    token_url = f"https://graph.facebook.com/{API_VERSION}/oauth/access_token"
    token_params = {
        "client_id": settings.META_APP_ID,
        "redirect_uri": settings.META_REDIRECT_URI,
        "client_secret": settings.META_APP_SECRET,
        "code": code
    }
    try:
        resp = requests.get(token_url, params=token_params)
        resp.raise_for_status() # Raise HTTP errors
        short_lived_token_data = resp.json()
        if "error" in short_lived_token_data:
            logger.error(f"[Meta OAuth] Short-lived token error: {short_lived_token_data['error']}")
            raise HTTPException(status_code=400, detail=short_lived_token_data['error']['message'])
        short_lived_token = short_lived_token_data['access_token']
    except requests.exceptions.RequestException as e:
        logger.error(f"[Meta OAuth] Short-lived token request failed: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to exchange code with Meta: {e}")
    except Exception as e:
        logger.error(f"[Meta OAuth] Error parsing short-lived token response: {e}")
        raise HTTPException(status_code=500, detail="Error processing Meta response.")


    # 2. Exchange short-lived token for long-lived token
    long_lived_token_url = f"https://graph.facebook.com/{API_VERSION}/oauth/access_token"
    long_lived_params = {
        "grant_type": "fb_exchange_token",
        "client_id": settings.META_APP_ID,
        "client_secret": settings.META_APP_SECRET,
        "fb_exchange_token": short_lived_token
    }
    try:
        resp = requests.get(long_lived_token_url, params=long_lived_params)
        resp.raise_for_status()
        long_lived_token_data = resp.json()
        if "error" in long_lived_token_data:
            logger.error(f"[Meta OAuth] Long-lived token error: {long_lived_token_data['error']}")
            raise HTTPException(status_code=400, detail=long_lived_token_data['error']['message'])
        access_token = long_lived_token_data['access_token']
        expires_in = long_lived_token_data.get('expires_in') # Get expiry time
    except requests.exceptions.RequestException as e:
        logger.error(f"[Meta OAuth] Long-lived token request failed: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to get long-lived token from Meta: {e}")
    except Exception as e:
        logger.error(f"[Meta OAuth] Error parsing long-lived token response: {e}")
        raise HTTPException(status_code=500, detail="Error processing Meta long-lived token response.")

    # 3. Get Meta User ID (platform-specific user ID)
    try:
        user_info_url = f"https://graph.facebook.com/me?access_token={access_token}"
        user_info_resp = requests.get(user_info_url)
        user_info_resp.raise_for_status()
        user_data = user_info_resp.json()
        platform_user_id = user_data.get("id") # This is the Meta User ID
        if not platform_user_id:
             raise ValueError("Meta User ID not found in /me response")
        user_name = user_data.get("name", "Unknown User")
        logger.info(f"[Meta OAuth] Fetched Meta User ID: {platform_user_id}, Name: {user_name}")
    except requests.exceptions.RequestException as e:
         logger.error(f"[Meta OAuth] Failed to fetch user info (/me): {e}")
         raise HTTPException(status_code=502, detail=f"Failed to fetch user info from Meta: {e}")
    except Exception as e:
         logger.error(f"[Meta OAuth] Error processing user info response: {e}")
         raise HTTPException(status_code=500, detail="Error processing Meta user info.")

    # --- NEW: Fetch Ad Account ID ---
    


    # 4. Save Connection Details using the new function
    platform_data = {
        "access_token": access_token,
        "expires_in": expires_in,
        "platform_user_id": platform_user_id, # Store the Meta user ID
        # Add ad_account_id if found
    }

    # Pass the main application user ID to identify the document to update
    save_or_update_platform_connection(main_app_user_id, PLATFORM_NAME, platform_data) 
    logger.info(f"✅ [Meta OAuth] Saved/Updated Meta connection details for user {main_app_user_id}")

    # 5. Redirect back to frontend
    # Use the main_app_user_id in the redirect URL
    return RedirectResponse(url=f"http://localhost:8080/select-meta-account?user_id={main_app_user_id}")
# --- Live Data Sync Endpoints (Corrected & Completed) ---

# Note: All endpoints below now include {ad_account_id} in the path

@router.get("/campaigns/{user_id}/{ad_account_id}")
def get_and_save_campaigns(user_id: str, ad_account_id: str): # Added ad_account_id
    """Fetches campaigns for a specific user and ad account."""
    token_data = get_platform_connection_details(user_id, platform=PLATFORM_NAME)
    if not token_data or "access_token" not in token_data:
        raise HTTPException(status_code=404, detail="User token not found for Meta.")

    access_token = token_data["access_token"]

    formatted_ad_account_id = ad_account_id
    if not formatted_ad_account_id.startswith("act_"):
        formatted_ad_account_id = f"act_{ad_account_id}"
    # Removed: ad_account_id = get_ad_account_id(access_token)
    url = f"https://graph.facebook.com/{API_VERSION}/{formatted_ad_account_id}/campaigns"
    params = {"access_token": access_token, "fields": "name,status,objective"}
    try:
        resp = requests.get(url, params=params)
        resp.raise_for_status()
        campaigns = resp.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch Meta campaigns for account {ad_account_id}: {e}")
        error_detail = "Failed to fetch campaigns from Meta API."
        if e.response is not None:
            try:
                error_detail = e.response.json().get("error", {}).get("message", error_detail)
            except ValueError:
                error_detail = e.response.text or error_detail
        raise HTTPException(status_code=getattr(e.response, 'status_code', 502), detail=error_detail)

    if campaigns.get("data"):
        save_items("campaigns", ad_account_id, campaigns["data"], PLATFORM_NAME)

    return campaigns

@router.get("/adsets/{user_id}/{ad_account_id}")
def get_and_save_adsets(user_id: str, ad_account_id: str): # Added ad_account_id
    """Fetches ad sets for a specific user and ad account."""
    token_data = get_platform_connection_details(user_id, platform=PLATFORM_NAME)
    if not token_data or "access_token" not in token_data:
        raise HTTPException(status_code=404, detail="User token not found for Meta.")

    access_token = token_data["access_token"]
    formatted_ad_account_id = ad_account_id
    if not formatted_ad_account_id.startswith("act_"):
        formatted_ad_account_id = f"act_{ad_account_id}"
    # Removed: ad_account_id = get_ad_account_id(access_token)
    url = f"https://graph.facebook.com/{API_VERSION}/{formatted_ad_account_id}/adsets"
    params = {"access_token": access_token, "fields": "name,status,daily_budget,campaign_id"}
    try:
        resp = requests.get(url, params=params)
        resp.raise_for_status()
        adsets = resp.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch Meta adsets for account {ad_account_id}: {e}")
        error_detail = "Failed to fetch adsets from Meta API."
        if e.response is not None:
            try:
                error_detail = e.response.json().get("error", {}).get("message", error_detail)
            except ValueError:
                error_detail = e.response.text or error_detail
        raise HTTPException(status_code=getattr(e.response, 'status_code', 502), detail=error_detail)


    if adsets.get("data"):
        save_items("adsets", ad_account_id, adsets["data"], PLATFORM_NAME)

    return adsets

@router.get("/ads/{user_id}/{ad_account_id}")
def get_and_save_ads(user_id: str, ad_account_id: str): # Added ad_account_id
    """Fetches ads for a specific user and ad account."""
    token_data = get_platform_connection_details(user_id, platform=PLATFORM_NAME)
    if not token_data or "access_token" not in token_data:
        raise HTTPException(status_code=404, detail="User token not found for Meta.")

    access_token = token_data["access_token"]

    formatted_ad_account_id = ad_account_id
    if not formatted_ad_account_id.startswith("act_"):
        formatted_ad_account_id = f"act_{ad_account_id}"

    # Removed: ad_account_id = get_ad_account_id(access_token)
    url = f"https://graph.facebook.com/{API_VERSION}/{formatted_ad_account_id}/ads"
    params = {"access_token": access_token, "fields": "name,status,adset_id,creative{image_url,body}"}
    try:
        resp = requests.get(url, params=params)
        resp.raise_for_status()
        ads = resp.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch Meta ads for account {ad_account_id}: {e}")
        error_detail = "Failed to fetch ads from Meta API."
        if e.response is not None:
            try:
                error_detail = e.response.json().get("error", {}).get("message", error_detail)
            except ValueError:
                error_detail = e.response.text or error_detail
        raise HTTPException(status_code=getattr(e.response, 'status_code', 502), detail=error_detail)

    if ads.get("data"):
        save_items("ads", ad_account_id, ads["data"], PLATFORM_NAME)

    return ads

@router.get("/campaigns/insights/{user_id}/{ad_account_id}")
def get_campaign_insights(user_id: str, ad_account_id: str): # Added ad_account_id
    """Fetches campaign insights for a specific user and ad account."""
    token_data = get_platform_connection_details(user_id, platform=PLATFORM_NAME)
    if not token_data or "access_token" not in token_data:
        raise HTTPException(status_code=404, detail="User token not found for Meta.")

    access_token = token_data["access_token"]

    formatted_ad_account_id = ad_account_id
    if not formatted_ad_account_id.startswith("act_"):
        formatted_ad_account_id = f"act_{ad_account_id}"

    # Removed: ad_account_id = get_ad_account_id(access_token)
    url = f"https://graph.facebook.com/{API_VERSION}/{formatted_ad_account_id}/campaigns"
    insight_fields = "spend,impressions,reach,frequency,cpm,inline_link_clicks,ctr"
    params = {
        "access_token": access_token,
        "fields": f"name,status,objective,insights.fields({insight_fields})",
        "date_preset": "last_30d"
    }
    try:
        resp = requests.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch Meta campaign insights for account {ad_account_id}: {e}")
        error_detail = "Failed to fetch campaign insights from Meta API."
        if e.response is not None:
            try:
                error_detail = e.response.json().get("error", {}).get("message", error_detail)
            except ValueError:
                error_detail = e.response.text or error_detail
        raise HTTPException(status_code=getattr(e.response, 'status_code', 502), detail=error_detail)

    if data.get("data"):
        # Assuming save_item_insights implicitly uses the IDs within the data
        save_items("campaigns", ad_account_id, data["data"], PLATFORM_NAME)

    return data

@router.get("/adsets/insights/{user_id}/{ad_account_id}")
def get_adset_insights(user_id: str, ad_account_id: str): # Added ad_account_id
    """Fetches ad set insights for a specific user and ad account."""
    token_data = get_platform_connection_details(user_id, platform=PLATFORM_NAME)
    if not token_data or "access_token" not in token_data:
        raise HTTPException(status_code=404, detail="User token not found for Meta.")

    access_token = token_data["access_token"]

    formatted_ad_account_id = ad_account_id
    if not formatted_ad_account_id.startswith("act_"):
        formatted_ad_account_id = f"act_{ad_account_id}"

    # Removed: ad_account_id = get_ad_account_id(access_token)
    url = f"https://graph.facebook.com/{API_VERSION}/{formatted_ad_account_id}/adsets"
    insight_fields = "spend,impressions,reach,frequency,cpm,inline_link_clicks,ctr"
    params = {
        "access_token": access_token,
        "fields": f"name,status,daily_budget,campaign_id,insights.fields({insight_fields})",
        "date_preset": "last_30d"
    }
    try:
        resp = requests.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch Meta adset insights for account {ad_account_id}: {e}")
        error_detail = "Failed to fetch adset insights from Meta API."
        if e.response is not None:
            try:
                error_detail = e.response.json().get("error", {}).get("message", error_detail)
            except ValueError:
                error_detail = e.response.text or error_detail
        raise HTTPException(status_code=getattr(e.response, 'status_code', 502), detail=error_detail)


    if data.get("data"):
        save_items("adsets", ad_account_id, data["data"], PLATFORM_NAME)

    return data

@router.get("/ads/insights/{user_id}/{ad_account_id}")
def get_ad_insights(user_id: str, ad_account_id: str): # Added ad_account_id
    """Fetches ad insights for a specific user and ad account."""
    token_data = get_platform_connection_details(user_id, platform=PLATFORM_NAME)
    if not token_data or "access_token" not in token_data:
        raise HTTPException(status_code=404, detail="User token not found for Meta.")

    access_token = token_data["access_token"]

    formatted_ad_account_id = ad_account_id
    if not formatted_ad_account_id.startswith("act_"):
        formatted_ad_account_id = f"act_{ad_account_id}"

    # Removed: ad_account_id = get_ad_account_id(access_token)
    url = f"https://graph.facebook.com/{API_VERSION}/{formatted_ad_account_id}/ads"
    insight_fields = "spend,impressions,reach,frequency,cpm,inline_link_clicks,ctr"
    params = {
        "access_token": access_token,
        "fields": f"name,status,adset_id,creative{{image_url,body}},insights.fields({insight_fields})",
        "date_preset": "last_30d"
    }
    try:
        resp = requests.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch Meta ad insights for account {ad_account_id}: {e}")
        error_detail = "Failed to fetch ad insights from Meta API."
        if e.response is not None:
            try:
                error_detail = e.response.json().get("error", {}).get("message", error_detail)
            except ValueError:
                error_detail = e.response.text or error_detail
        raise HTTPException(status_code=getattr(e.response, 'status_code', 502), detail=error_detail)

    if data.get("data"):
        save_items("ads", ad_account_id, data["data"], PLATFORM_NAME)

    return data


# --- Generic Historical Fetch Task ---
# Modified to accept ad_account_id
async def run_historical_fetch(user_id: str, ad_account_id: str, level: str):
    """Generic background task to fetch historical data for a specified user, account, and level."""
    logger.info(f"[Background Task] Starting historical data fetch for user_id: {user_id}, account: {ad_account_id}, level: {level}")

    token_data = get_platform_connection_details(user_id, platform=PLATFORM_NAME)
    if not token_data or "access_token" not in token_data:
        logger.error(f"No valid Meta token for user_id: {user_id}. Aborting task for account {ad_account_id}.")
        return

    access_token = token_data["access_token"]
    formatted_ad_account_id = ad_account_id
    if not formatted_ad_account_id.startswith("act_"):
        formatted_ad_account_id = f"act_{ad_account_id}"

    # Removed: try/except block for get_ad_account_id as it's now passed in

    end_date = date.today()
    start_date = end_date - relativedelta(years=2, months=6) # Keeping the 2.5 year range
    monthly_ranges = generate_monthly_ranges(start_date, end_date)
    total_records_saved = 0

    # Determine fields and save function based on level
    if level == "ad":
        fields = "date_start,date_stop,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,impressions,clicks,spend,actions"
        save_function = save_daily_ad_insights
    elif level == "campaign":
        fields = "date_start,date_stop,campaign_id,campaign_name,impressions,clicks,spend,actions"
        save_function = save_daily_campaign_insights
    else: # Default to adset
        level = "adset" # Ensure level is explicitly set
        fields = "date_start,date_stop,campaign_id,campaign_name,adset_id,adset_name,impressions,clicks,spend,actions"
        save_function = save_daily_insights

    # Use the provided ad_account_id
    insights_url = f"https://graph.facebook.com/{API_VERSION}/{formatted_ad_account_id}/insights"
    base_params = {
        "access_token": access_token,
        "level": level,
        "time_increment": 1, # Daily breakdown
        "fields": fields,
        "limit": 500 # Max allowed by Meta API per page
    }

    for i, (since, until) in enumerate(monthly_ranges):
        logger.info(f"Fetching {level} data for account {ad_account_id}, month {i+1}/{len(monthly_ranges)}: {since} to {until}")

        time_range = {"since": since, "until": until}
        current_params = base_params.copy()
        current_params["time_range"] = str(time_range).replace("'", '"') # Format for API

        # Fetch potentially multiple pages of data for the month
        insights_data = await fetch_paginated_insights(insights_url, current_params)

        if insights_data:
            # Pass user_id and ad_account_id to the save function
            records_saved = save_function(user_id, ad_account_id, insights_data)
            total_records_saved += records_saved
            logger.info(f"Saved {records_saved} {level} insights for account {ad_account_id}, month {i+1}.")
        else:
            logger.info(f"No {level} insights data returned for account {ad_account_id}, {since} to {until}.")

    logger.info(f"[Background Task] COMPLETED for user: {user_id}, account: {ad_account_id}, level: {level}. Total records saved/updated: {total_records_saved}.")


# --- Historical Data Fetching Endpoints ---
# Modified to include ad_account_id in the path

@router.post("/fetch_historical_adsets/{user_id}/{ad_account_id}")
async def fetch_historical_adset_data(user_id: str, ad_account_id: str, background_tasks: BackgroundTasks):
    """Triggers background task to fetch historical adset data for a specific account."""
    background_tasks.add_task(run_historical_fetch, user_id, ad_account_id, "adset")
    return {"message": f"Historical adset data fetching started for user {user_id}, account {ad_account_id}."}

@router.post("/fetch_historical_ads/{user_id}/{ad_account_id}")
async def fetch_historical_ad_data(user_id: str, ad_account_id: str, background_tasks: BackgroundTasks):
    """Triggers background task to fetch historical ad data for a specific account."""
    background_tasks.add_task(run_historical_fetch, user_id, ad_account_id, "ad")
    return {"message": f"Historical ad data fetching started for user {user_id}, account {ad_account_id}."}

@router.post("/fetch_historical_campaigns/{user_id}/{ad_account_id}")
async def fetch_historical_campaign_data(user_id: str, ad_account_id: str, background_tasks: BackgroundTasks):
    """Triggers background task to fetch historical campaign data for a specific account."""
    background_tasks.add_task(run_historical_fetch, user_id, ad_account_id, "campaign")
    return {"message": f"Historical campaign data fetching started for user {user_id}, account {ad_account_id}."} 

@router.get("/ad-accounts")
def get_user_ad_accounts(user_id: str = Depends(get_current_user_id)):
    """
    Fetches all ad accounts associated with the user's Meta connection.
    Called by the frontend account selection page.
    """
    token_data = get_platform_connection_details(user_id, platform=PLATFORM_NAME)
    if not token_data or "access_token" not in token_data:
        raise HTTPException(status_code=404, detail="User token not found for Meta. Please reconnect.")

    access_token = token_data["access_token"]
    
    # Fetch ad accounts with user-friendly fields (name, business_name)
    ad_accounts_url = f"https://graph.facebook.com/{API_VERSION}/me/adaccounts"
    params = {
        "access_token": access_token,
        "fields": "id,name,business_name,account_status",
        "limit": 100 # Adjust as needed
    }
    
    try:
        resp = requests.get(ad_accounts_url, params=params)
        resp.raise_for_status()
        ad_accounts_data = resp.json()
        
        if "error" in ad_accounts_data:
             raise HTTPException(status_code=400, detail=ad_accounts_data["error"]["message"])
        
        # Clean up the ID by removing the 'act_' prefix for consistency
        accounts_list = ad_accounts_data.get("data", [])
        for acc in accounts_list:
            if acc.get("id", "").startswith("act_"):
                acc["id"] = acc["id"][4:]
                
        return {"accounts": accounts_list}

    except requests.exceptions.RequestException as e:
         logger.error(f"[Meta] Failed to fetch ad accounts for user {user_id}: {e}")
         raise HTTPException(status_code=502, detail=f"Failed to fetch ad accounts from Meta: {e}")
    except Exception as e:
         logger.error(f"[Meta] Error processing ad accounts response for user {user_id}: {e}")
         raise HTTPException(status_code=500, detail="Error processing Meta ad accounts.")


# Pydantic model for the request body
class SelectedAccount(BaseModel):
    ad_account_id: str
    ad_account_name: str # It's good to save the name too!

@router.post("/select-account")
def select_ad_account(account: SelectedAccount, user_id: str = Depends(get_current_user_id), background_tasks: BackgroundTasks=None):
    """
    Saves the user's chosen ad_account_id to their platform connection details.
    """
    logger.info(f"User {user_id} selected ad account: {account.ad_account_id}")
    
    # We update the *existing* connection with the new ad account ID
    # Your save_or_update_platform_connection should merge this data
    platform_data_to_add = {
        "ad_account_id": account.ad_account_id,
        "ad_account_name": account.ad_account_name
    }
    
    try:
        save_or_update_platform_connection(user_id, PLATFORM_NAME, platform_data_to_add)
        logger.info(f"✅ Successfully saved ad_account_id {account.ad_account_id} for user {user_id}")
        if background_tasks:
            background_tasks.add_task(run_historical_fetch, user_id, account.ad_account_id, "campaign")
            background_tasks.add_task(run_historical_fetch, user_id, account.ad_account_id, "adset")
            background_tasks.add_task(run_historical_fetch, user_id, account.ad_account_id, "ad")
        return {"message": "Ad account selected successfully."}
    
    except Exception as e:
        logger.error(f"Failed to save ad_account_id for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to save ad account selection.")
    