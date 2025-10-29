from fastapi import APIRouter, Depends, Query, BackgroundTasks, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from app.utils.logger import get_logger
from app.utils.security import create_state_token, decode_token, get_current_user_id
from app.services.meta_service import (
    exchange_code_for_token,
    get_user_info,
    save_meta_connection,
    fetch_and_save,
    run_historical_fetch,
)
from app.database.mongo_client import save_or_update_platform_connection, get_platform_connection_details
from app.config import config
import requests

router = APIRouter( tags=["Meta Ads"])
logger = get_logger()

API_VERSION = "v20.0"
SCOPES = "ads_read,read_insights,ads_management,business_management"
PLATFORM_NAME = "meta"


# ---------------------------------------------------------------------------
# 🔐 OAuth Flow
# ---------------------------------------------------------------------------
@router.get("/login")
async def meta_login(user_id: str = Depends(get_current_user_id)):
    """Redirect user to Meta OAuth consent page."""
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")

    state_token = create_state_token({"sub": user_id})
    auth_url = (
        f"https://www.facebook.com/{API_VERSION}/dialog/oauth?"
        f"client_id={config.settings.META_APP_ID}"
        f"&redirect_uri={config.settings.META_REDIRECT_URI}"
        f"&scope={SCOPES}"
        f"&response_type=code"
        f"&state={state_token}"
    )
    logger.info(f"[Meta OAuth] Redirecting user {user_id}")
    return {"redirect_url": auth_url}


@router.get("/callback")
def meta_callback(code: str = Query(...), state: str = Query(...)):
    """Handle Meta OAuth callback, save tokens and user mapping."""
    try:
        payload = decode_token(state)
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("Missing user ID in state")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid state: {e}")

    token_data = exchange_code_for_token(code)
    access_token = token_data.get("access_token")
    expires_in = token_data.get("expires_in")

    user_info = get_user_info(access_token)
    platform_user_id = user_info.get("id")

    save_meta_connection(user_id, access_token, expires_in, platform_user_id)
    return RedirectResponse(url=f"http://localhost:8080/select-meta-account?user_id={user_id}")


# ---------------------------------------------------------------------------
# 📊 Live Data Routes
# ---------------------------------------------------------------------------
@router.get("/campaigns/{user_id}/{ad_account_id}")
def get_campaigns(user_id: str, ad_account_id: str):
    """Fetches campaigns (basic info) and saves them."""
    # Arguments: endpoint, user_id, ad_account_id, fields, collection_name
    return fetch_and_save(
        endpoint="campaigns",
        user_id=user_id,
        ad_account_id=ad_account_id,
        fields="name,status,objective", # Fields from your old code
        collection="campaigns" # Collection name from your old code
    )


@router.get("/adsets/{user_id}/{ad_account_id}")
def get_adsets(user_id: str, ad_account_id: str):
    """Fetches ad sets (basic info) and saves them."""
    return fetch_and_save(
        endpoint="adsets",
        user_id=user_id,
        ad_account_id=ad_account_id,
        fields="name,status,daily_budget,campaign_id", # Fields from your old code
        collection="adsets" # Collection name from your old code
    )


@router.get("/ads/{user_id}/{ad_account_id}")
def get_ads(user_id: str, ad_account_id: str):
    """Fetches ads (basic info + creative) and saves them."""
    return fetch_and_save(
        endpoint="ads",
        user_id=user_id,
        ad_account_id=ad_account_id,
        fields="name,status,adset_id,creative{image_url,body}", # Fields from your old code
        collection="ads" # Collection name from your old code
    )


# ---------------------------------------------------------------------------
# 🧾 Historical Fetch
# ---------------------------------------------------------------------------
@router.post("/fetch_historical_{level}/{user_id}/{ad_account_id}")
async def fetch_historical(
    user_id: str,
    ad_account_id: str,
    level: str,
    background_tasks: BackgroundTasks,
):
    """Trigger historical data fetch (campaign/adset/ad)."""
    background_tasks.add_task(run_historical_fetch, user_id, ad_account_id, level)
    return {"message": f"Historical {level} data fetching started for {ad_account_id}."}


# ---------------------------------------------------------------------------
# 🧠 Ad Accounts + Selection
# ---------------------------------------------------------------------------
@router.get("/ad-accounts")
def get_user_ad_accounts(user_id: str = Depends(get_current_user_id)):
    """Return all ad accounts linked to Meta user."""
    token = get_platform_connection_details(user_id, platform=PLATFORM_NAME)
    if not token or "access_token" not in token:
        raise HTTPException(status_code=404, detail="Reconnect Meta.")

    url = f"https://graph.facebook.com/{API_VERSION}/me/adaccounts"
    params = {"access_token": token["access_token"], "fields": "id,name,business_name,account_status"}
    resp = requests.get(url, params=params)
    resp.raise_for_status()
    data = resp.json()

    accounts = data.get("data", [])
    for acc in accounts:
        if acc.get("id", "").startswith("act_"):
            acc["id"] = acc["id"][4:]
    return {"accounts": accounts}


class SelectedAccount(BaseModel):
    ad_account_id: str
    ad_account_name: str


@router.post("/select-account")
def select_ad_account(account: SelectedAccount, user_id: str = Depends(get_current_user_id), background_tasks: BackgroundTasks = None):
    """Save user's selected ad account and trigger background sync."""
    save_or_update_platform_connection(
        user_id, PLATFORM_NAME, {"ad_account_id": account.ad_account_id, "ad_account_name": account.ad_account_name}
    )
    if background_tasks:
        for level in ["campaign", "adset", "ad"]:
            background_tasks.add_task(run_historical_fetch, user_id, account.ad_account_id, level)
    return {"message": "Ad account selection saved and sync started."}
