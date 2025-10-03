from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import RedirectResponse
import requests
import urllib.parse
from app.utils.logger import get_logger
from app.config import settings

router = APIRouter(prefix="/meta", tags=["Meta Ads"])
logger = get_logger()

# Define the permissions (scopes) you need
SCOPES = "ads_read,read_insights,ads_management"

@router.get("/login")
def meta_login():
    """Build the Meta OAuth login URL and redirect the user."""
    dialog_url = (
        f"https://www.facebook.com/v19.0/dialog/oauth?"
        + urllib.parse.urlencode({
            "client_id": settings.META_APP_ID,
            "redirect_uri": settings.META_REDIRECT_URI,
            "scope": SCOPES,
            "response_type": "code"
        })
    )
    logger.info("Redirecting user to Meta for login")
    return RedirectResponse(url=dialog_url)

@router.get("/callback")
def meta_callback(code: str = Query(..., description="Authorization code from Meta")):
    """
    Exchange authorization code for a long-lived access token and return it.
    """
    # 1. Exchange code for a short-lived access token
    token_url = "https://graph.facebook.com/v19.0/oauth/access_token"
    token_params = {
        "client_id": settings.META_APP_ID,
        "redirect_uri": settings.META_REDIRECT_URI,
        "client_secret": settings.META_APP_SECRET,
        "code": code,
    }
    resp = requests.get(token_url, params=token_params)
    short_lived_token_data = resp.json()

    if "error" in short_lived_token_data:
        logger.error(f"Error getting short-lived token: {short_lived_token_data['error']}")
        raise HTTPException(status_code=400, detail=short_lived_token_data['error']['message'])

    short_lived_token = short_lived_token_data['access_token']
    logger.info("Received short-lived token from Meta")

    # 2. Exchange short-lived token for a long-lived one
    long_lived_token_url = "https://graph.facebook.com/v19.0/oauth/access_token"
    long_lived_params = {
        "grant_type": "fb_exchange_token",
        "client_id": settings.META_APP_ID,
        "client_secret": settings.META_APP_SECRET,
        "fb_exchange_token": short_lived_token,
    }
    resp = requests.get(long_lived_token_url, params=long_lived_params)
    long_lived_token_data = resp.json()
    
    if "error" in long_lived_token_data:
        logger.error(f"Error getting long-lived token: {long_lived_token_data['error']}")
        raise HTTPException(status_code=400, detail=long_lived_token_data['error']['message'])

    logger.info("Exchanged for a long-lived token. Returning to client.")
    return long_lived_token_data

@router.get("/campaigns")
def get_campaigns(access_token: str):
    """Fetches campaigns using a provided access token."""
    # First, get the user's ad accounts
    ad_accounts_url = f"https://graph.facebook.com/v19.0/me/adaccounts"
    acc_params = {"access_token": access_token}
    ad_accounts_resp = requests.get(ad_accounts_url, params=acc_params)
    ad_accounts = ad_accounts_resp.json()

    if not ad_accounts.get("data"):
        return {"error": "No ad accounts found for this user."}

    first_ad_account_id = ad_accounts["data"][0]["id"]
    logger.info(f"Fetching campaigns for ad account: {first_ad_account_id}")

    # Now, fetch campaigns for that ad account
    campaigns_url = f"https://graph.facebook.com/v19.0/{first_ad_account_id}/campaigns"
    campaign_params = {
        "access_token": access_token,
        "fields": "name,status,objective"
    }
    campaigns_resp = requests.get(campaigns_url, params=campaign_params)
    
    return campaigns_resp.json()

@router.get("/create-test-campaign")
def create_test_campaign(access_token: str):
    """Creates a simple, paused test campaign using the API."""
    # 1. Get the user's ad account ID
    ad_accounts_url = f"https://graph.facebook.com/v19.0/me/adaccounts"
    acc_params = {"access_token": access_token}
    ad_accounts_resp = requests.get(ad_accounts_url, params=acc_params)
    ad_accounts = ad_accounts_resp.json()

    if not ad_accounts.get("data"):
        return {"error": "Could not find an ad account to create a campaign in."}
    
    ad_account_id = ad_accounts["data"][0]["id"]
    logger.info(f"Using ad account: {ad_account_id} to create campaign")

    # 2. Define the new campaign's data
    campaign_creation_url = f"https://graph.facebook.com/v19.0/{ad_account_id}/campaigns"
    
    # Pass the token as a URL parameter
    params = { "access_token": access_token }

    # Send the campaign details as a JSON payload
    json_payload = {
        "name": "My First API Campaign",
        "objective": "OUTCOME_TRAFFIC",
        "status": "PAUSED",
        "special_ad_categories": [],
    }

    # 3. Make the POST request using `json=`
    resp = requests.post(campaign_creation_url, params=params, json=json_payload)
    
    logger.info("Campaign creation attempt finished.")
    return resp.json()
