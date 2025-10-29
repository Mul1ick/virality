"""
Meta Service
------------
Encapsulates Meta OAuth, token exchange, and ad data retrieval logic.
"""

import asyncio
import requests
from datetime import date
from dateutil.relativedelta import relativedelta
from fastapi import HTTPException
from app.config.config import settings
from app.database.mongo_client import (
    save_or_update_platform_connection,
    get_platform_connection_details,
    save_items,
    save_daily_ad_insights,
    save_daily_campaign_insights,
    save_daily_insights,
)
from app.utils.meta_api import generate_monthly_ranges, fetch_paginated_insights
from app.utils.logger import get_logger

logger = get_logger()
API_VERSION = "v20.0"
PLATFORM_NAME = "meta"


# ---------------------------------------------------------------------------
# 🔐 OAuth and Token Management
# ---------------------------------------------------------------------------
def exchange_code_for_token(code: str) -> dict:
    """Exchange OAuth code → short-lived → long-lived access token."""
    try:
        # Step 1: Short-lived token
        short_url = f"https://graph.facebook.com/{API_VERSION}/oauth/access_token"
        short_params = {
            "client_id": settings.META_APP_ID,
            "redirect_uri": settings.META_REDIRECT_URI,
            "client_secret": settings.META_APP_SECRET,
            "code": code,
        }
        short_resp = requests.get(short_url, params=short_params)
        short_resp.raise_for_status()
        short_token = short_resp.json().get("access_token")
        if not short_token:
            raise ValueError("Missing short-lived token")

        # Step 2: Long-lived token
        long_url = f"https://graph.facebook.com/{API_VERSION}/oauth/access_token"
        long_params = {
            "grant_type": "fb_exchange_token",
            "client_id": settings.META_APP_ID,
            "client_secret": settings.META_APP_SECRET,
            "fb_exchange_token": short_token,
        }
        long_resp = requests.get(long_url, params=long_params)
        long_resp.raise_for_status()
        return long_resp.json()
    except Exception as e:
        logger.exception(f"[Meta Service] Token exchange failed: {e}")
        raise HTTPException(status_code=502, detail="Meta token exchange failed.")


def get_user_info(access_token: str) -> dict:
    """Retrieve user profile info from Meta Graph API."""
    try:
        resp = requests.get(f"https://graph.facebook.com/me", params={"access_token": access_token})
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.error(f"[Meta Service] Failed to fetch user info: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch Meta user info.")


def save_meta_connection(user_id: str, access_token: str, expires_in: int, platform_user_id: str):
    """Save or update the Meta connection details."""
    platform_data = {
        "access_token": access_token,
        "expires_in": expires_in,
        "platform_user_id": platform_user_id,
    }
    save_or_update_platform_connection(user_id, PLATFORM_NAME, platform_data)
    logger.info(f"✅ [Meta] Saved/Updated connection for user {user_id}")


# ---------------------------------------------------------------------------
# 📊 Fetch Live Data (Campaigns, Adsets, Ads)
# ---------------------------------------------------------------------------
def fetch_and_save(endpoint: str, user_id: str, ad_account_id: str, fields: str, collection: str):
    """Generic fetch-and-save helper for campaigns, adsets, and ads."""
    token_data = get_platform_connection_details(user_id, platform=PLATFORM_NAME)
    if not token_data or "access_token" not in token_data:
        raise HTTPException(status_code=404, detail="Meta access token missing.")

    access_token = token_data["access_token"]
    account = f"act_{ad_account_id}" if not ad_account_id.startswith("act_") else ad_account_id
    url = f"https://graph.facebook.com/{API_VERSION}/{account}/{endpoint}"

    try:
        resp = requests.get(url, params={"access_token": access_token, "fields": fields})
        resp.raise_for_status()
        data = resp.json()
        if data.get("data"):
            save_items(collection, ad_account_id, data["data"], PLATFORM_NAME)
        return data
    except requests.exceptions.RequestException as e:
        logger.error(f"[Meta] Failed to fetch {endpoint} for {ad_account_id}: {e}")
        detail = e.response.text if e.response else "Meta API request failed."
        raise HTTPException(status_code=502, detail=detail)


# ---------------------------------------------------------------------------
# 🕓 Historical Insights Fetch
# ---------------------------------------------------------------------------
async def run_historical_fetch(user_id: str, ad_account_id: str, level: str):
    """Fetch 2.5 years of historical insights (campaign/adset/ad) in background."""
    token_data = get_platform_connection_details(user_id, platform=PLATFORM_NAME)
    if not token_data or "access_token" not in token_data:
        logger.error(f"[Meta Historical] Missing token for user {user_id}")
        return

    access_token = token_data["access_token"]
    account = f"act_{ad_account_id}" if not ad_account_id.startswith("act_") else ad_account_id
    insights_url = f"https://graph.facebook.com/{API_VERSION}/{account}/insights"

    # Determine field set and storage function
    if level == "ad":
        fields = "date_start,date_stop,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,impressions,clicks,spend,actions"
        saver = save_daily_ad_insights
    elif level == "campaign":
        fields = "date_start,date_stop,campaign_id,campaign_name,impressions,clicks,spend,actions"
        saver = save_daily_campaign_insights
    else:
        fields = "date_start,date_stop,campaign_id,campaign_name,adset_id,adset_name,impressions,clicks,spend,actions"
        saver = save_daily_insights

    # Generate monthly ranges
    end_date = date.today()
    start_date = end_date - relativedelta(years=2, months=6)
    monthly_ranges = generate_monthly_ranges(start_date, end_date)
    total_saved = 0

    base_params = {
        "access_token": access_token,
        "level": level,
        "time_increment": 1,
        "fields": fields,
        "limit": 500,
    }

    for i, (since, until) in enumerate(monthly_ranges):
        time_range = {"since": since, "until": until}
        params = base_params.copy()
        params["time_range"] = str(time_range).replace("'", '"')

        logger.info(f"[Meta Historical] {level} data for {ad_account_id}: {since}→{until}")
        insights = await fetch_paginated_insights(insights_url, params)
        if insights:
            count = saver(user_id, ad_account_id, insights)
            total_saved += count
            logger.info(f"Saved {count} {level} records for {ad_account_id} [{i+1}/{len(monthly_ranges)}]")

    logger.info(f"[Meta Historical] Done. {total_saved} total {level} records saved for {ad_account_id}.")
