from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import RedirectResponse
import requests
import urllib.parse
from app.utils.logger import get_logger
from app.config import settings
# Import your database functions
from app.database import save_or_update_user_token, save_campaigns

router = APIRouter(prefix="/meta", tags=["Meta Ads"])
logger = get_logger()
SCOPES = "ads_read,read_insights,ads_management"

@router.get("/login")
def meta_login():
    """Build the Meta OAuth login URL and redirect the user."""
    dialog_url = (f"https://www.facebook.com/v19.0/dialog/oauth?" + urllib.parse.urlencode({"client_id": settings.META_APP_ID,"redirect_uri": settings.META_REDIRECT_URI,"scope": SCOPES,"response_type": "code"}))
    return RedirectResponse(url=dialog_url)

@router.get("/callback")
def meta_callback(code: str = Query(..., description="Authorization code from Meta")):
    """Exchange code for a token and save it to the database."""
    token_url = "https://graph.facebook.com/v19.0/oauth/access_token"
    token_params = {"client_id": settings.META_APP_ID,"redirect_uri": settings.META_REDIRECT_URI,"client_secret": settings.META_APP_SECRET,"code": code}
    resp = requests.get(token_url, params=token_params)
    short_lived_token_data = resp.json()
    if "error" in short_lived_token_data: raise HTTPException(status_code=400, detail=short_lived_token_data['error']['message'])
    
    short_lived_token = short_lived_token_data['access_token']
    
    long_lived_token_url = "https://graph.facebook.com/v19.0/oauth/access_token"
    long_lived_params = {"grant_type": "fb_exchange_token","client_id": settings.META_APP_ID,"client_secret": settings.META_APP_SECRET,"fb_exchange_token": short_lived_token}
    resp = requests.get(long_lived_token_url, params=long_lived_params)
    long_lived_token_data = resp.json()
    if "error" in long_lived_token_data: raise HTTPException(status_code=400, detail=long_lived_token_data['error']['message'])
    
    # Get user ID and save the token to the database
    user_info_url = f"https://graph.facebook.com/me?access_token={long_lived_token_data['access_token']}"
    user_info_resp = requests.get(user_info_url)
    user_id = user_info_resp.json().get("id", "unknown_user") # Use .get for safety
    
    save_or_update_user_token(user_id, long_lived_token_data)
    
    # Redirect to the frontend dashboard after successful login
    return RedirectResponse(url=f"http://localhost:8080/?user_id={user_id}")


@router.get("/campaigns/{user_id}")
def get_and_save_campaigns(user_id: str):
    """Fetches campaigns for a user, saves them to the DB, and returns them."""
    # NOTE: In a real app, you'd fetch the token from the DB using the user_id
    # For now, we'll assume the most recent token in the DB is the one to use.
    # This part will need to be improved later.
    
    # A real implementation would look like:
    # token_data = get_user_token_from_db(user_id)
    # access_token = token_data['access_token']
    # This is a placeholder for now:
    return {"message": "Endpoint to fetch and save campaigns for a user."}
