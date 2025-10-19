# app/controllers/google_controller.py
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import RedirectResponse
import requests, urllib.parse
from app.utils.logger import get_logger
from app.config import settings
from app.database import get_user_token_by_source, save_or_update_user_token
from app.utils.google_api import list_campaigns_for_child, list_accessible_customers

router = APIRouter(prefix="/google", tags=["Google Ads"])
logger = get_logger()

# Include userinfo scopes so we can reliably fetch Google user id/email
SCOPES = "https://www.googleapis.com/auth/adwords https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email"


@router.get("/login")
def google_login():
    auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        + urllib.parse.urlencode({
            "client_id": settings.CLIENT_ID,
            "redirect_uri": settings.REDIRECT_URI,
            "response_type": "code",
            "scope": SCOPES,
            "access_type": "offline",
            "prompt": "consent"
        })
    )
    logger.info("[Google OAuth] Redirecting user to consent screen...")
    return RedirectResponse(url=auth_url)


@router.get("/callback")
def google_callback(code: str = Query(..., description="Authorization code from Google")):
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
    user_info_url = "https://www.googleapis.com/oauth2/v2/userinfo"
    user_resp = requests.get(user_info_url, headers={"Authorization": f"Bearer {access_token}"})
    user_data = user_resp.json()
    user_id = user_data.get("id") or user_data.get("email") or "unknown_user"

    save_or_update_user_token(user_id, tokens, source="google")
    logger.info(f"✅ [Google OAuth] Tokens saved for user {user_id}")

    return RedirectResponse(url=f"http://localhost:8080/?user_id={user_id}")


@router.get("/accounts/{user_id}")
def get_google_accounts(user_id: str):
    token_data = get_user_token_by_source(user_id, source="google")
    if not token_data:
        raise HTTPException(status_code=404, detail="Google Ads account not linked for this user")

    resp = list_accessible_customers(token_data.get("access_token"))
    if resp.status_code != 200:
        logger.error(f"[Google Ads] Failed to list customers: {resp.text}")
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    resource_names = resp.json().get("resourceNames", [])
    customer_ids = [r.split("/")[-1] for r in resource_names]
    return {"user_id": user_id, "customer_ids": customer_ids}


@router.get("/campaigns/{user_id}")
def get_google_campaigns(user_id: str, customer_id: str = Query(..., description="Google Ads Customer ID")):
    token_data = get_user_token_by_source(user_id, source="google")
    if not token_data:
        raise HTTPException(status_code=404, detail="User not linked to Google Ads")

    resp = list_campaigns_for_child(token_data.get("access_token"), child_customer_id=customer_id)
    if resp.status_code != 200:
        logger.error(f"[Google Ads] Campaign fetch failed: {resp.text}")
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    data = resp.json().get("results", [])
    return {"customer_id": customer_id, "campaign_count": len(data), "campaigns": data}
