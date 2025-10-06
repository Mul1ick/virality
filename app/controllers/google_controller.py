from fastapi import APIRouter, Query
import requests
import urllib.parse
from app.utils.logger import get_logger
from app.config import settings

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
    logger.info("Received tokens from Google")
    return tokens
