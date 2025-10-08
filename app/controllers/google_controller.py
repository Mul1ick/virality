from fastapi import APIRouter, Query
import requests
import urllib.parse
from app.utils.logger import get_logger
from app.config import settings
from app.utils.token_store import save_google_tokens, get_google_access_token
from app.utils.google_api import list_accessible_customers

router = APIRouter(prefix="/google", tags=["Google Ads"])
logger = get_logger()

@router.get("/login")
def google_login():
    """Build the Google OAuth login URL"""
    auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        + urllib.parse.urlencode({
            "client_id": settings.CLIENT_ID,
            "redirect_uri": settings.REDIRECT_URI,
            "response_type": "code",
            "scope": "https://www.googleapis.com/auth/adwords",
            "access_type": "offline",
            "prompt": "consent"
        })
    )
    logger.info("Generated Google login URL")
    return {"auth_url": auth_url}

@router.get("/callback")
def google_callback(code: str = Query(..., description="Authorization code from Google")):
    """Exchange code for access/refresh tokens"""
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": settings.CLIENT_ID,
        "client_secret": settings.CLIENT_SECRET,
        "redirect_uri": settings.REDIRECT_URI,
        "grant_type": "authorization_code",
    }
    resp = requests.post(token_url, data=data)
    tokens = resp.json()
    save_google_tokens(tokens)
    logger.info("Received tokens and saved to memory")
    return tokens



@router.get("/accounts")
def google_accounts():
    access_token = get_google_access_token()
    if not access_token:
        return {"error": "No access token found. Please login again."}

    resp = list_accessible_customers(access_token)
    logger.info(f"[Google Ads] Response status: {resp.status_code}")

    try:
        data = resp.json()
        logger.info("[Google Ads] Successfully decoded JSON.")
        return data
    except Exception:
        logger.error(f"[Google Ads] Non-JSON response received: {resp.text[:300]}")
        return {
            "error": "Invalid response from Google Ads API.",
            "status_code": resp.status_code,
            "raw_response": resp.text[:300],
        }
