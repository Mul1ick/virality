# from fastapi import APIRouter, Query, HTTPException
# from fastapi.responses import RedirectResponse
# import requests
# import urllib.parse
# from app.utils.logger import get_logger
# from app.config import settings
# # Import your database functions
# from app.database import (
#     save_or_update_user_token, get_user_token,
#     save_campaigns, save_campaign_insights,
#     save_adsets, save_adset_insights,
#     save_ads, save_ad_insights
# )

# router = APIRouter(prefix="/meta", tags=["Meta Ads"])
# logger = get_logger()
# SCOPES = "ads_read,read_insights,ads_management"

# @router.get("/login")
# def meta_login():
#     """Build the Meta OAuth login URL and redirect the user."""
#     dialog_url = (f"https://www.facebook.com/v19.0/dialog/oauth?" + urllib.parse.urlencode({"client_id": settings.META_APP_ID,"redirect_uri": settings.META_REDIRECT_URI,"scope": SCOPES,"response_type": "code"}))
#     return RedirectResponse(url=dialog_url)

# @router.get("/callback")
# def meta_callback(code: str = Query(..., description="Authorization code from Meta")):
#     """Exchange code for a token and save it to the database."""
#     token_url = "https://graph.facebook.com/v19.0/oauth/access_token"
#     token_params = {"client_id": settings.META_APP_ID,"redirect_uri": settings.META_REDIRECT_URI,"client_secret": settings.META_APP_SECRET,"code": code}
#     resp = requests.get(token_url, params=token_params)
#     short_lived_token_data = resp.json()
#     if "error" in short_lived_token_data: raise HTTPException(status_code=400, detail=short_lived_token_data['error']['message'])
    
#     short_lived_token = short_lived_token_data['access_token']
    
#     long_lived_token_url = "https://graph.facebook.com/v19.0/oauth/access_token"
#     long_lived_params = {"grant_type": "fb_exchange_token","client_id": settings.META_APP_ID,"client_secret": settings.META_APP_SECRET,"fb_exchange_token": short_lived_token}
#     resp = requests.get(long_lived_token_url, params=long_lived_params)
#     long_lived_token_data = resp.json()
#     if "error" in long_lived_token_data: raise HTTPException(status_code=400, detail=long_lived_token_data['error']['message'])
    
#     # Get user ID and save the token to the database
#     user_info_url = f"https://graph.facebook.com/me?access_token={long_lived_token_data['access_token']}"
#     user_info_resp = requests.get(user_info_url)
#     user_id = user_info_resp.json().get("id", "unknown_user") # Use .get for safety
    
#     save_or_update_user_token(user_id, long_lived_token_data, source="meta")
    
#     # Redirect to the frontend dashboard after successful login
#     return RedirectResponse(url=f"http://localhost:8080/?user_id={user_id}")


# @router.get("/campaigns/{user_id}")
# def get_and_save_campaigns(user_id: str):
#     """Fetches campaigns for a user, saves them to the DB, and returns them."""
#     # 1. Get the user's token from the database
#     user_data = get_user_token(user_id)
#     if not user_data or "access_token" not in user_data:
#         raise HTTPException(status_code=404, detail="User or token not found. Please log in again.")
    
#     access_token = user_data["access_token"]
    
#     # 2. Fetch ad accounts
#     ad_accounts_url = f"https://graph.facebook.com/v19.0/me/adaccounts"
#     acc_params = {"access_token": access_token}
#     ad_accounts_resp = requests.get(ad_accounts_url, params=acc_params)
#     ad_accounts = ad_accounts_resp.json()

#     if "error" in ad_accounts:
#         raise HTTPException(status_code=400, detail=ad_accounts["error"]["message"])
#     if not ad_accounts.get("data"):
#         return {"data": [], "message": "No ad accounts found for this user."}

#     first_ad_account_id = ad_accounts["data"][0]["id"]
    
#     # 3. Fetch campaigns
#     campaigns_url = f"https://graph.facebook.com/v19.0/{first_ad_account_id}/campaigns"
#     campaign_params = {"access_token": access_token, "fields": "name,status,objective"}
#     campaigns_resp = requests.get(campaigns_url, params=campaign_params)
#     campaigns = campaigns_resp.json()

#     # 4. Save the fetched campaigns to the database
#     if campaigns.get("data"):
#         save_campaigns(first_ad_account_id, campaigns["data"])
    
#     # 5. Return the campaign data
#     return campaigns

# @router.get("/campaigns/insights/{user_id}")
# def get_campaign_insights(user_id: str):
#     """Fetches campaigns with performance insights for a user."""
#     user_data = get_user_token(user_id)
#     if not user_data or "access_token" not in user_data:
#         raise HTTPException(status_code=404, detail="User or token not found.")
    
#     access_token = user_data["access_token"]
    
#     ad_accounts_url = f"https://graph.facebook.com/v19.0/me/adaccounts"
#     acc_params = {"access_token": access_token}
#     ad_accounts_resp = requests.get(ad_accounts_url, params=acc_params)
#     ad_accounts = ad_accounts_resp.json()

#     if "error" in ad_accounts:
#         raise HTTPException(status_code=400, detail=ad_accounts["error"]["message"])
#     if not ad_accounts.get("data"):
#         return {"data": [], "message": "No ad accounts found for this user."}

#     first_ad_account_id = ad_accounts["data"][0]["id"]
    
#     insights_url = f"https://graph.facebook.com/v19.0/{first_ad_account_id}/campaigns"
    
#     # Define the specific metrics you want from the API
#     insight_fields = "spend,impressions,reach,frequency,cpm,inline_link_clicks,ctr"
    
#     # Construct the parameters for the API call
#     params = {
#         "access_token": access_token,
#         "fields": f"name,status,objective,insights.fields({insight_fields})", # Ask for insights here
#         "date_preset": "last_30d" # Match the "Last 30 days" from your screenshot
#     }
    
#     resp = requests.get(insights_url, params=params)
#     campaigns_with_insights = resp.json()
    
#     if "error" in campaigns_with_insights:
#         raise HTTPException(status_code=400, detail=campaigns_with_insights["error"]["message"])

#     # Save the fetched insights to the database
#     if campaigns_with_insights.get("data"):
#         save_campaign_insights(campaigns_with_insights["data"])
    
#     return campaigns_with_insights

# @router.get("/adsets/{user_id}")
# def get_and_save_adsets(user_id: str):
#     """Fetches ad sets for a user, saves them to the DB, and returns them."""
#     user_data = get_user_token(user_id)
#     if not user_data or "access_token" not in user_data:
#         raise HTTPException(status_code=404, detail="User or token not found.")
    
#     access_token = user_data["access_token"]
    
#     # Fetch ad accounts to get an ad_account_id
#     ad_accounts_url = f"https://graph.facebook.com/v19.0/me/adaccounts"
#     acc_params = {"access_token": access_token}
#     ad_accounts_resp = requests.get(ad_accounts_url, params=acc_params)
#     ad_accounts = ad_accounts_resp.json()

#     if "error" in ad_accounts:
#         raise HTTPException(status_code=400, detail=ad_accounts["error"]["message"])
#     if not ad_accounts.get("data"):
#         return {"data": [], "message": "No ad accounts found for this user."}

#     first_ad_account_id = ad_accounts["data"][0]["id"]
    
#     # Fetch ad sets using the ad account ID
#     adsets_url = f"https://graph.facebook.com/v19.0/{first_ad_account_id}/adsets"
#     adset_params = {"access_token": access_token, "fields": "name,status,daily_budget,campaign_id"}
#     adsets_resp = requests.get(adsets_url, params=adset_params)
#     adsets = adsets_resp.json()

#     # Save and return the ad sets
#     if adsets.get("data"):
#         save_adsets(first_ad_account_id, adsets["data"])
    
#     return adsets


# # 👇 ADD THIS NEW ENDPOINT FOR ADS
# @router.get("/ads/{user_id}")
# def get_and_save_ads(user_id: str):
#     """Fetches ads for a user, saves them to the DB, and returns them."""
#     user_data = get_user_token(user_id)
#     if not user_data or "access_token" not in user_data:
#         raise HTTPException(status_code=404, detail="User or token not found.")
    
#     access_token = user_data["access_token"]
    
#     # Fetch ad accounts
#     ad_accounts_url = f"https://graph.facebook.com/v19.0/me/adaccounts"
#     acc_params = {"access_token": access_token}
#     ad_accounts_resp = requests.get(ad_accounts_url, params=acc_params)
#     ad_accounts = ad_accounts_resp.json()

#     if "error" in ad_accounts:
#         raise HTTPException(status_code=400, detail=ad_accounts["error"]["message"])
#     if not ad_accounts.get("data"):
#         return {"data": [], "message": "No ad accounts found for this user."}

#     first_ad_account_id = ad_accounts["data"][0]["id"]
    
#     # Fetch ads using the ad account ID
#     ads_url = f"https://graph.facebook.com/v19.0/{first_ad_account_id}/ads"
#     # Requesting the creative is useful for showing previews on your dashboard
#     ads_params = {"access_token": access_token, "fields": "name,status,adset_id,creative{image_url,body}"}
#     ads_resp = requests.get(ads_url, params=ads_params)
#     ads = ads_resp.json()
    
#     # Save and return the ads
#     if ads.get("data"):
#         save_ads(first_ad_account_id, ads["data"])
        
#     return ads


# @router.get("/adsets/insights/{user_id}")
# def get_adset_insights(user_id: str):
#     """Fetches ad sets with performance insights."""
#     user_data = get_user_token(user_id)
#     if not user_data or "access_token" not in user_data:
#         raise HTTPException(status_code=404, detail="User or token not found.")
    
#     access_token = user_data["access_token"]
    
#     ad_accounts_url = f"https://graph.facebook.com/v19.0/me/adaccounts"
#     acc_params = {"access_token": access_token}
#     ad_accounts_resp = requests.get(ad_accounts_url, params=acc_params)
#     ad_accounts = ad_accounts_resp.json()

#     if "error" in ad_accounts:
#         raise HTTPException(status_code=400, detail=ad_accounts["error"]["message"])
#     if not ad_accounts.get("data"):
#         return {"data": [], "message": "No ad accounts found for this user."}

#     first_ad_account_id = ad_accounts["data"][0]["id"]
    
#     adsets_url = f"https://graph.facebook.com/v19.0/{first_ad_account_id}/adsets"
#     insight_fields = "spend,impressions,reach,frequency,cpm,inline_link_clicks,ctr"
    
#     params = {
#         "access_token": access_token,
#         "fields": f"name,status,daily_budget,campaign_id,insights.fields({insight_fields})",
#         "date_preset": "last_30d"
#     }
    
#     resp = requests.get(adsets_url, params=params)
#     adsets_with_insights = resp.json()

#     if "error" in adsets_with_insights:
#         raise HTTPException(status_code=400, detail=adsets_with_insights["error"]["message"])

#     if adsets_with_insights.get("data"):
#         save_adset_insights(adsets_with_insights["data"])
    
#     return adsets_with_insights


# # 👇 ADD THIS NEW ENDPOINT FOR AD INSIGHTS
# @router.get("/ads/insights/{user_id}")
# def get_ad_insights(user_id: str):
#     """Fetches ads with performance insights."""
#     user_data = get_user_token(user_id)
#     if not user_data or "access_token" not in user_data:
#         raise HTTPException(status_code=404, detail="User or token not found.")
    
#     access_token = user_data["access_token"]
    
#     ad_accounts_url = f"https://graph.facebook.com/v19.0/me/adaccounts"
#     acc_params = {"access_token": access_token}
#     ad_accounts_resp = requests.get(ad_accounts_url, params=acc_params)
#     ad_accounts = ad_accounts_resp.json()

#     if "error" in ad_accounts:
#         raise HTTPException(status_code=400, detail=ad_accounts["error"]["message"])
#     if not ad_accounts.get("data"):
#         return {"data": [], "message": "No ad accounts found for this user."}

#     first_ad_account_id = ad_accounts["data"][0]["id"]
    
#     ads_url = f"https://graph.facebook.com/v19.0/{first_ad_account_id}/ads"
#     insight_fields = "spend,impressions,reach,frequency,cpm,inline_link_clicks,ctr"
    
#     params = {
#         "access_token": access_token,
#         "fields": f"name,status,adset_id,creative{{image_url,body}},insights.fields({insight_fields})",
#         "date_preset": "last_30d"
#     }
    
#     resp = requests.get(ads_url, params=params)
#     ads_with_insights = resp.json()

#     if "error" in ads_with_insights:
#         raise HTTPException(status_code=400, detail=ads_with_insights["error"]["message"])
    
#     if ads_with_insights.get("data"):
#         save_ad_insights(ads_with_insights["data"])
        
#     return ads_with_insights

from fastapi import APIRouter, Query, HTTPException, BackgroundTasks
from fastapi.responses import RedirectResponse
import requests
import urllib.parse
from datetime import date
from dateutil.relativedelta import relativedelta

from app.utils.logger import get_logger
from app.config import settings
from app.database import (
    save_or_update_user_token,
    get_user_token_by_source,
    save_items,
    save_item_insights,
    save_daily_insights,
    save_daily_ad_insights,
    save_daily_campaign_insights
)
from app.utils.meta_api_utils import generate_monthly_ranges, fetch_paginated_insights

router = APIRouter(prefix="/meta", tags=["Meta Ads"])
logger = get_logger()

# --- Constants ---
API_VERSION = "v20.0"
SCOPES = "ads_read,read_insights,ads_management"
PLATFORM_NAME = "meta"

# --- Helper function to get the first ad account ID ---
def get_ad_account_id(access_token: str):
    """Fetches the first ad account ID for a given user token."""
    ad_accounts_url = f"https://graph.facebook.com/{API_VERSION}/me/adaccounts"
    params = {"access_token": access_token, "fields": "id"}
    try:
        resp = requests.get(ad_accounts_url, params=params)
        resp.raise_for_status()
        ad_accounts = resp.json()

        if not ad_accounts.get("data"):
            logger.warning("No ad accounts found for this user.")
            raise HTTPException(status_code=404, detail="No ad accounts found for this user.")
        
        return ad_accounts["data"][0]["id"]
    except requests.exceptions.HTTPError as e:
        logger.error(f"HTTP Error fetching ad account ID: {e.response.text}")
        raise HTTPException(status_code=e.response.status_code, detail=e.response.json().get("error", {}).get("message", "Failed to fetch ad accounts"))
    except Exception as e:
        logger.error(f"Unexpected error fetching ad account ID: {e}")
        raise HTTPException(status_code=500, detail="An internal error occurred while fetching ad accounts.")

# --- Authentication Endpoints ---

@router.get("/login")
def meta_login():
    dialog_url = (f"https://www.facebook.com/{API_VERSION}/dialog/oauth?" + urllib.parse.urlencode({
        "client_id": settings.META_APP_ID,
        "redirect_uri": settings.META_REDIRECT_URI,
        "scope": SCOPES,
        "response_type": "code"
    }))
    return RedirectResponse(url=dialog_url)

@router.get("/callback")
def meta_callback(code: str = Query(..., description="Authorization code from Meta")):
    token_url = f"https://graph.facebook.com/{API_VERSION}/oauth/access_token"
    token_params = {
        "client_id": settings.META_APP_ID,
        "redirect_uri": settings.META_REDIRECT_URI,
        "client_secret": settings.META_APP_SECRET,
        "code": code
    }
    resp = requests.get(token_url, params=token_params)
    short_lived_token_data = resp.json()
    if "error" in short_lived_token_data:
        raise HTTPException(status_code=400, detail=short_lived_token_data['error']['message'])
    
    short_lived_token = short_lived_token_data['access_token']
    
    long_lived_token_url = f"https://graph.facebook.com/{API_VERSION}/oauth/access_token"
    long_lived_params = {
        "grant_type": "fb_exchange_token",
        "client_id": settings.META_APP_ID,
        "client_secret": settings.META_APP_SECRET,
        "fb_exchange_token": short_lived_token
    }
    resp = requests.get(long_lived_token_url, params=long_lived_params)
    long_lived_token_data = resp.json()
    if "error" in long_lived_token_data:
        raise HTTPException(status_code=400, detail=long_lived_token_data['error']['message'])
    
    user_info_url = f"https://graph.facebook.com/me?access_token={long_lived_token_data['access_token']}"
    user_info_resp = requests.get(user_info_url)
    user_id = user_info_resp.json().get("id", "unknown_user")
    
    save_or_update_user_token(user_id, long_lived_token_data, source=PLATFORM_NAME)
    
    return RedirectResponse(url=f"http://localhost:8080/profile?user_id={user_id}&platform=meta")

# --- Live Data Sync Endpoints (Corrected & Completed) ---

@router.get("/campaigns/{user_id}")
def get_and_save_campaigns(user_id: str):
    token_data = get_user_token_by_source(user_id, source=PLATFORM_NAME)
    if not token_data or "access_token" not in token_data:
        raise HTTPException(status_code=404, detail="User token not found for Meta.")
    
    access_token = token_data["access_token"]
    ad_account_id = get_ad_account_id(access_token)
    url = f"https://graph.facebook.com/{API_VERSION}/{ad_account_id}/campaigns"
    params = {"access_token": access_token, "fields": "name,status,objective"}
    resp = requests.get(url, params=params)
    campaigns = resp.json()

    if campaigns.get("data"):
        save_items("campaigns", ad_account_id, campaigns["data"], PLATFORM_NAME)
    
    return campaigns

@router.get("/adsets/{user_id}")
def get_and_save_adsets(user_id: str):
    token_data = get_user_token_by_source(user_id, source=PLATFORM_NAME)
    if not token_data or "access_token" not in token_data:
        raise HTTPException(status_code=404, detail="User token not found for Meta.")
    
    access_token = token_data["access_token"]
    ad_account_id = get_ad_account_id(access_token)
    url = f"https://graph.facebook.com/{API_VERSION}/{ad_account_id}/adsets"
    params = {"access_token": access_token, "fields": "name,status,daily_budget,campaign_id"}
    resp = requests.get(url, params=params)
    adsets = resp.json()

    if adsets.get("data"):
        save_items("adsets", ad_account_id, adsets["data"], PLATFORM_NAME)
    
    return adsets

@router.get("/ads/{user_id}")
def get_and_save_ads(user_id: str):
    token_data = get_user_token_by_source(user_id, source=PLATFORM_NAME)
    if not token_data or "access_token" not in token_data:
        raise HTTPException(status_code=404, detail="User token not found for Meta.")
    
    access_token = token_data["access_token"]
    ad_account_id = get_ad_account_id(access_token)
    url = f"https://graph.facebook.com/{API_VERSION}/{ad_account_id}/ads"
    params = {"access_token": access_token, "fields": "name,status,adset_id,creative{image_url,body}"}
    resp = requests.get(url, params=params)
    ads = resp.json()

    if ads.get("data"):
        save_items("ads", ad_account_id, ads["data"], PLATFORM_NAME)
    
    return ads

@router.get("/campaigns/insights/{user_id}")
def get_campaign_insights(user_id: str):
    token_data = get_user_token_by_source(user_id, source=PLATFORM_NAME)
    if not token_data or "access_token" not in token_data:
        raise HTTPException(status_code=404, detail="User token not found for Meta.")

    access_token = token_data["access_token"]
    ad_account_id = get_ad_account_id(access_token)
    url = f"https://graph.facebook.com/{API_VERSION}/{ad_account_id}/campaigns"
    insight_fields = "spend,impressions,reach,frequency,cpm,inline_link_clicks,ctr"
    params = {
        "access_token": access_token,
        "fields": f"name,status,objective,insights.fields({insight_fields})",
        "date_preset": "last_30d"
    }
    resp = requests.get(url, params=params)
    data = resp.json()

    if data.get("data"):
        save_item_insights("campaigns", data["data"], PLATFORM_NAME)
    
    return data

@router.get("/adsets/insights/{user_id}")
def get_adset_insights(user_id: str):
    token_data = get_user_token_by_source(user_id, source=PLATFORM_NAME)
    if not token_data or "access_token" not in token_data:
        raise HTTPException(status_code=404, detail="User token not found for Meta.")
    
    access_token = token_data["access_token"]
    ad_account_id = get_ad_account_id(access_token)
    url = f"https://graph.facebook.com/{API_VERSION}/{ad_account_id}/adsets"
    insight_fields = "spend,impressions,reach,frequency,cpm,inline_link_clicks,ctr"
    params = {
        "access_token": access_token,
        "fields": f"name,status,daily_budget,campaign_id,insights.fields({insight_fields})",
        "date_preset": "last_30d"
    }
    resp = requests.get(url, params=params)
    data = resp.json()

    if data.get("data"):
        save_item_insights("adsets", data["data"], PLATFORM_NAME)
    
    return data

@router.get("/ads/insights/{user_id}")
def get_ad_insights(user_id: str):
    token_data = get_user_token_by_source(user_id, source=PLATFORM_NAME)
    if not token_data or "access_token" not in token_data:
        raise HTTPException(status_code=404, detail="User token not found for Meta.")
    
    access_token = token_data["access_token"]
    ad_account_id = get_ad_account_id(access_token)
    url = f"https://graph.facebook.com/{API_VERSION}/{ad_account_id}/ads"
    insight_fields = "spend,impressions,reach,frequency,cpm,inline_link_clicks,ctr"
    params = {
        "access_token": access_token,
        "fields": f"name,status,adset_id,creative{{image_url,body}},insights.fields({insight_fields})",
        "date_preset": "last_30d"
    }
    resp = requests.get(url, params=params)
    data = resp.json()
    
    if data.get("data"):
        save_item_insights("ads", data["data"], PLATFORM_NAME)
        
    return data


# --- Generic Historical Fetch Task ---
async def run_historical_fetch(user_id: str, level: str):
    """Generic background task to fetch historical data for a specified level."""
    logger.info(f"[Background Task] Starting historical data fetch for user_id: {user_id}, level: {level}")
    
    token_data = get_user_token_by_source(user_id, source=PLATFORM_NAME)
    if not token_data or "access_token" not in token_data:
        logger.error(f"No valid Meta token for user_id: {user_id}. Aborting.")
        return

    access_token = token_data["access_token"]
    
    try:
        ad_account_id = get_ad_account_id(access_token)
    except HTTPException as e:
        logger.error(f"Could not get ad_account_id for user_id: {user_id}. Error: {e.detail}")
        return

    end_date = date.today()
    start_date = end_date - relativedelta(years=2, months=6)
    monthly_ranges = generate_monthly_ranges(start_date, end_date)
    total_records_saved = 0

    if level == "ad":
        fields = "date_start,date_stop,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,impressions,clicks,spend,actions"
        save_function = save_daily_ad_insights
    elif level == "campaign":
        fields = "date_start,date_stop,campaign_id,campaign_name,impressions,clicks,spend,actions"
        save_function = save_daily_campaign_insights
    else:
        level = "adset"
        fields = "date_start,date_stop,campaign_id,campaign_name,adset_id,adset_name,impressions,clicks,spend,actions"
        save_function = save_daily_insights

    insights_url = f"https://graph.facebook.com/{API_VERSION}/{ad_account_id}/insights"
    base_params = {
        "access_token": access_token,
        "level": level,
        "time_increment": 1,
        "fields": fields,
        "limit": 500
    }

    for i, (since, until) in enumerate(monthly_ranges):
        logger.info(f"Fetching {level} data for month {i+1}/{len(monthly_ranges)}: {since} to {until}")
        
        time_range = {"since": since, "until": until}
        current_params = base_params.copy()
        current_params["time_range"] = str(time_range).replace("'", '"')

        insights_data = await fetch_paginated_insights(insights_url, current_params)
        
        if insights_data:
            records_saved = save_function(user_id, ad_account_id, insights_data)
            total_records_saved += records_saved
        else:
            logger.info(f"No {level} insights data returned for {since} to {until}.")

    logger.info(f"[Background Task] COMPLETED for user: {user_id}, level: {level}. Total records saved/updated: {total_records_saved}.")

# --- Historical Data Fetching Endpoints ---

@router.post("/fetch_historical_adsets/{user_id}")
async def fetch_historical_adset_data(user_id: str, background_tasks: BackgroundTasks):
    background_tasks.add_task(run_historical_fetch, user_id, "adset")
    return {"message": f"Historical adset data fetching started for user {user_id}."}

@router.post("/fetch_historical_ads/{user_id}")
async def fetch_historical_ad_data(user_id: str, background_tasks: BackgroundTasks):
    background_tasks.add_task(run_historical_fetch, user_id, "ad")
    return {"message": f"Historical ad data fetching started for user {user_id}."}

@router.post("/fetch_historical_campaigns/{user_id}")
async def fetch_historical_campaign_data(user_id: str, background_tasks: BackgroundTasks):
    background_tasks.add_task(run_historical_fetch, user_id, "campaign")
    return {"message": f"Historical campaign data fetching started for user {user_id}."}

