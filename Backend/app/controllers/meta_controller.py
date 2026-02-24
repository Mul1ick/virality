from fastapi import APIRouter, Depends, Query, BackgroundTasks, HTTPException
from fastapi.responses import RedirectResponse
from app.controllers.auth_controller import create_access_token # Ensure this is accessible
from pydantic import BaseModel
from typing import List, Dict
from app.utils.logger import get_logger
from app.utils.security import create_state_token, decode_token, get_current_user_id
from app.services.meta_service import (
    exchange_code_for_token,
    get_user_info,
    save_meta_connection,
    fetch_and_save,
    run_historical_fetch,
    get_demographics_data,
    run_historical_demographics_fetch # <--- Verified Import
)
from app.database.mongo_client import save_or_update_platform_connection, get_platform_connection_details, db
from app.config import config
import requests

router = APIRouter(tags=["Meta Ads"])
logger = get_logger()

API_VERSION = "v20.0"
SCOPES = "ads_read,read_insights,ads_management,business_management"
PLATFORM_NAME = "meta"

def _get_data_from_db(collection_name: str, ad_account_id: str) -> List[Dict]:
    """Reads stored Meta data from MongoDB."""
    try:
        cursor = db[collection_name].find(
            {"ad_account_id": ad_account_id, "platform": "meta"},
            {"_id": 0} 
        )
        return list(cursor)
    except Exception as e:
        logger.error(f"[DB Read] Failed to read {collection_name}: {e}")
        return []
    
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
    user_info = get_user_info(token_data.get("access_token"))
    save_meta_connection(user_id, token_data.get("access_token"), token_data.get("expires_in"), user_info.get("id"))

    transfer_token = create_access_token(data={
        "sub": user_id, 
        "type": "oauth_handshake"
    })

    # save_meta_connection(user_id, access_token, expires_in, platform_user_id)
    return RedirectResponse(
        url=f"{config.settings.FRONTEND_URL}/select-meta-account?user_id={user_id}&token={transfer_token}"
    )


# ---------------------------------------------------------------------------
# 📊 Live Data Routes (READ-ONLY FROM DB)
# ---------------------------------------------------------------------------

@router.get("/campaigns/{user_id}/{ad_account_id}")
def get_campaigns(user_id: str, ad_account_id: str):
    data = _get_data_from_db("campaigns", ad_account_id)
    return {"data": data}


@router.get("/adsets/{user_id}/{ad_account_id}")
def get_adsets(user_id: str, ad_account_id: str):
    data = _get_data_from_db("adsets", ad_account_id)
    return {"data": data}


@router.get("/ads/{user_id}/{ad_account_id}")
def get_ads(user_id: str, ad_account_id: str):
    data = _get_data_from_db("ads", ad_account_id)
    return {"data": data}


# ---------------------------------------------------------------------------
# 🔄 Sync Routes (Hits Meta API)
# ---------------------------------------------------------------------------

@router.post("/sync/recent/{user_id}/{ad_account_id}")
async def sync_recent_data(
    user_id: str, 
    ad_account_id: str, 
    background_tasks: BackgroundTasks
):
    """
    Fetches the latest list of Campaigns, AdSets, and Ads from Meta
    and updates the database. Call this when user clicks 'Refresh'.
    """
    def _sync_task():
        logger.info(f"[Meta Sync] Starting recent data sync for {ad_account_id}")
        try:
            # 1. Campaigns
            fetch_and_save(
                endpoint="campaigns",
                user_id=user_id,
                ad_account_id=ad_account_id,
                fields="name,status,objective",
                collection="campaigns"
            )
            # 2. AdSets
            fetch_and_save(
                endpoint="adsets",
                user_id=user_id,
                ad_account_id=ad_account_id,
                fields="name,status,daily_budget,campaign_id",
                collection="adsets"
            )
            # 3. Ads
            fetch_and_save(
                endpoint="ads",
                user_id=user_id,
                ad_account_id=ad_account_id,
                fields="name,status,adset_id,creative{image_url,body}",
                collection="ads"
            )
            logger.info(f"[Meta Sync] ✅ Recent data sync complete for {ad_account_id}")
        except Exception as e:
            logger.error(f"[Meta Sync] Failed: {e}")

    background_tasks.add_task(_sync_task)
    return {"message": "Sync started. Data will update shortly."}


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
    # Trigger Combined Historical Fetch immediately after selection
    if background_tasks:
        background_tasks.add_task(run_historical_fetch, user_id, account.ad_account_id, "campaign")
        background_tasks.add_task(run_historical_demographics_fetch, user_id, account.ad_account_id, "campaign")
        # Also trigger for AdSets and Ads if needed, or rely on user to trigger full sync
            
    return {"message": "Ad account selection saved. Sync started."}

# ---------------------------------------------------------------------------
# 🧾 Demographic Fetch
# ---------------------------------------------------------------------------

@router.get("/demographics/{user_id}/{ad_account_id}")
async def get_demographics(
    user_id: str, 
    ad_account_id: str, 
    date_preset: str = "maximum",
    current_user_id: str = Depends(get_current_user_id)
):
    """
    Returns insights broken down by Age and Gender for the whole account.
    """
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    data = await get_demographics_data(user_id, ad_account_id, date_preset)
    return {"data": data}


# ---------------------------------------------------------------------------
# 🧾 Historical & Demographic Fetch (COMBINED)
# ---------------------------------------------------------------------------

@router.post("/fetch_historical_{level}/{user_id}/{ad_account_id}")
async def fetch_historical(
    user_id: str,
    ad_account_id: str,
    level: str,
    background_tasks: BackgroundTasks,
):
    """Trigger historical data fetch (Main + Demographics)."""
    # 1. Fetch main daily trends
    background_tasks.add_task(run_historical_fetch, user_id, ad_account_id, level)
    
    # 2. Fetch demographics (monthly aggregation)
    background_tasks.add_task(run_historical_demographics_fetch, user_id, ad_account_id, level)
    
    return {"message": f"Historical {level} + Demographics sync started."}


# ---------------------------------------------------------------------------
# 📊 Demographic Data Getter (Item Specific)
# ---------------------------------------------------------------------------

@router.get("/demographics/data/{level}/{item_id}") 
def get_item_demographics(
    level: str,
    item_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """
    Get stored demographics for a specific Campaign, AdSet, or Ad.
    """
    collection_map = {
        "campaign": "meta_demographics_campaign",
        "adset": "meta_demographics_adset",
        "ad": "meta_demographics_ad"
    }
    
    if level not in collection_map:
        raise HTTPException(status_code=400, detail="Invalid level")

    id_field = f"{level}_id"
    collection = db[collection_map[level]]

    pipeline = [
        {"$match": {id_field: item_id, "user_id": user_id}},
        # 🔥 STEP 1: Convert Strings to Numbers
        {"$addFields": {
            "num_impressions": {"$toInt": {"$ifNull": ["$impressions", 0]}},
            "num_clicks": {"$toInt": {"$ifNull": ["$clicks", 0]}},
            "num_spend": {"$toDouble": {"$ifNull": ["$spend", 0]}},
            "num_reach": {"$toInt": {"$ifNull": ["$reach", 0]}},
        }},
        # 🔥 STEP 2: Sum the Converted Numbers
        {"$group": {
            "_id": {"age": "$age", "gender": "$gender"},
            "impressions": {"$sum": "$num_impressions"},
            "clicks": {"$sum": "$num_clicks"},
            "spend": {"$sum": "$num_spend"},
            "reach": {"$sum": "$num_reach"}
        }},
        {"$project": {
            "_id": 0,
            "age": "$_id.age",
            "gender": "$_id.gender",
            "impressions": 1,
            "clicks": 1,
            "spend": 1,
            "reach": 1
        }},
        {"$sort": {"age": 1}}
    ]

    results = list(collection.aggregate(pipeline))
    return {"data": results}