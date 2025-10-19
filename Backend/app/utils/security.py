# from app.database import db, save_item_insights
# from app.controllers.meta_controller import get_ad_account_id
# from app.utils.logger import get_logger
# import requests

# logger = get_logger()
# users_collection = db["users"]

# def fetch_meta_insights(endpoint: str, access_token: str, ad_account_id: str, fields: str):
#     """Generic helper to fetch data with insights from the Meta API."""
#     url = f"https://graph.facebook.com/v19.0/{ad_account_id}/{endpoint}"
#     insight_fields = "spend,impressions,reach,frequency,cpm,inline_link_clicks,ctr"
#     params = {
#         "access_token": access_token,
#         "fields": f"{fields},insights.fields({insight_fields})",
#         "date_preset": "last_30d"
#     }
#     resp = requests.get(url, params=params)
#     resp.raise_for_status() # This will raise an error for bad responses (4xx or 5xx)
#     return resp.json().get("data", [])

# def sync_all_meta_data():
#     """The main job that syncs insights for all users with a Meta token."""
#     logger.info("🚀 Starting scheduled Meta data sync job...")

#     # Find all users who have connected their Meta account
#     meta_users = users_collection.find({"source": "meta"})

#     for user in meta_users:
#         user_id = user["user_id"]
#         access_token = user["access_token"]
#         logger.info(f"Syncing data for user {user_id}")

#         try:
#             ad_account_id = get_ad_account_id(access_token)

#             # Sync Campaign Insights
#             campaigns = fetch_meta_insights("campaigns", access_token, ad_account_id, "name,status,objective")
#             if campaigns:
#                 save_item_insights("campaigns", campaigns, "meta")

#             # Sync Ad Set Insights
#             adsets = fetch_meta_insights("adsets", access_token, ad_account_id, "name,status,daily_budget,campaign_id")
#             if adsets:
#                 save_item_insights("adsets", adsets, "meta")

#             # Sync Ad Insights
#             ads = fetch_meta_insights("ads", access_token, ad_account_id, "name,status,adset_id,creative{image_url,body}")
#             if ads:
#                 save_item_insights("ads", ads, "meta")

#             logger.info(f"✅ Successfully synced data for user {user_id}")

#         except Exception as e:
#             logger.error(f"Failed to sync data for user {user_id}. Error: {e}")

#     logger.info("🏁 Finished scheduled Meta data sync job.")

# app/utils/security.py
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from datetime import datetime, timedelta
from app.config import settings
from app.utils.logger import get_logger
import time

# In-memory store for rate limiting (simple for local testing)
# Format: { "user_id": [timestamp1, timestamp2, ...] }
request_timestamps = {}
RATE_LIMIT_DURATION = timedelta(hours=1)
RATE_LIMIT_REQUESTS = 5

logger = get_logger()

# This helper tells FastAPI where to look for the token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user_id(token: str = Depends(oauth2_scheme)) -> str:
    """
    Decodes the JWT token to extract the user's ID.
    This is a dependency that other functions will use.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("user_id")
        if user_id is None:
            logger.warning("Token payload is missing 'user_id'")
            raise credentials_exception
        return user_id
    except JWTError as e:
        logger.error(f"JWT Error: {e}")
        raise credentials_exception

def rate_limiter(user_id: str = Depends(get_current_user_id)) -> str:
    """
    Checks if a user has exceeded the request limit.
    This is the dependency used by the /analytics endpoint.
    """
    current_time = time.time()
    
    # Filter out old timestamps
    user_requests = [
        t for t in request_timestamps.get(user_id, []) 
        if current_time - t < RATE_LIMIT_DURATION.total_seconds()
    ]

    if len(user_requests) >= RATE_LIMIT_REQUESTS:
        logger.warning(f"Rate limit exceeded for user: {user_id}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit of {RATE_LIMIT_REQUESTS} requests per hour exceeded."
        )
    
    # Add current request timestamp and update the store
    user_requests.append(current_time)
    request_timestamps[user_id] = user_requests
    
    logger.info(f"Request count for user {user_id}: {len(user_requests)}/{RATE_LIMIT_REQUESTS}")
    return user_id