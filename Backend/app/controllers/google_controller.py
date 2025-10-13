from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import RedirectResponse
import requests
import urllib.parse
from app.utils.logger import get_logger
from app.config import settings
from app.database import save_or_update_user_token

router = APIRouter(prefix="/google", tags=["Google Ads"])
logger = get_logger()

# OAuth scopes for Google Ads
SCOPES = "https://www.googleapis.com/auth/adwords"

@router.get("/login")
def google_login():
    """Step 1️⃣: Redirect user to Google OAuth consent screen."""
    auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        + urllib.parse.urlencode({
            "client_id": settings.CLIENT_ID,
            "redirect_uri": settings.REDIRECT_URI,
            "response_type": "code",
            "scope": SCOPES,
            "access_type": "offline",   # Required for refresh token
            "prompt": "consent"         # Always ask for account choice
        })
    )
    logger.info("[Google OAuth] Redirecting to consent screen...")
    return RedirectResponse(url=auth_url)


@router.get("/callback")
def google_callback(code: str = Query(..., description="Authorization code from Google")):
    """Step 2️⃣: Exchange code for tokens and save them in MongoDB."""
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

    if "error" in tokens:
        logger.error(f"[Google OAuth] Token exchange failed: {tokens}")
        raise HTTPException(status_code=400, detail=tokens.get("error_description", "Token exchange failed"))

    access_token = tokens.get("access_token")

    # Get basic user info for identification
    user_info_url = "https://www.googleapis.com/oauth2/v2/userinfo"
    headers = {"Authorization": f"Bearer {access_token}"}
    user_resp = requests.get(user_info_url, headers=headers)
    user_data = user_resp.json()
    user_id = user_data.get("id", "unknown_user")

    # Save token in MongoDB
    save_or_update_user_token(user_id, tokens, source="google")

    logger.info(f"✅ [Google OAuth] Tokens saved for user {user_id}")

    # Redirect to frontend dashboard
    return RedirectResponse(url=f"http://localhost:8080/?user_id={user_id}")
