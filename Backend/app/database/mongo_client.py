# FILE: app/database/mongo_client.py
"""
Unified MongoDB client and helper functions for all platforms.

Key improvements:
- Structured [DB][Section] logging
- Safe ObjectId/email fallback resolution
- Sectioned layout: Users, Platform Connections, Insights
- Consistent exception handling and comments
"""

from pymongo import MongoClient, UpdateOne
from bson import ObjectId
from datetime import datetime, timedelta
from fastapi import HTTPException
from app.config import config
from app.utils.logger import get_logger

logger = get_logger()

# ------------------------------------------------------------
# ⚙️ MongoDB Initialization
# ------------------------------------------------------------
client = MongoClient(config.settings.MONGO_URI)
db = client[config.settings.DB_NAME]

# Core collections
users_collection = db["users"]
campaigns_collection = db["campaigns"]
adsets_collection = db["adsets"]
ads_collection = db["ads"]

# Meta + Google daily insights
meta_daily_insights_collection = db["meta_daily_insights"]
meta_daily_ad_insights_collection = db["meta_daily_ad_insights"]
meta_daily_campaign_insights_collection = db["meta_daily_campaign_insights"]
google_daily_insights_collection = db["google_daily_insights"]

# ------------------------------------------------------------
# 🧩 UTILITY HELPERS
# ------------------------------------------------------------
def _resolve_user_query(user_id: str):
    """Tries to resolve user by ObjectId first, then email."""
    try:
        return {"_id": ObjectId(user_id)}
    except Exception:
        return {"email": user_id}


# ============================================================
# 👤 USER MANAGEMENT
# ============================================================
def get_user_by_id(user_id: str):
    """Retrieve user by ObjectId or email."""
    query = _resolve_user_query(user_id)
    try:
        user = users_collection.find_one(query)
        if not user:
            logger.warning(f"[DB][User] User not found for {user_id}")
        return user
    except Exception as e:
        logger.error(f"[DB][User] get_user_by_id failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database error retrieving user.")


def get_user_connection_status(user_id: str):
    """Retrieve simplified platform connection info for a user."""
    query = _resolve_user_query(user_id)
    try:
        user = users_collection.find_one(query, {"connected_platforms": 1, "_id": 0})
        if not user or "connected_platforms" not in user:
            return {}

        status = {}
        for platform, details in user.get("connected_platforms", {}).items():
            summary = {"connected": details.get("connected", False)}
            if platform == "meta":
                summary["ad_account_id"] = details.get("ad_account_id")
            elif platform == "google":
                summary.update({
                    "customer_ids": details.get("customer_ids"),
                    "manager_id": details.get("manager_id"),
                    "client_customer_id": details.get("client_customer_id"),
                    "selected_manager_id": details.get("selected_manager_id"),
                })
            elif platform == "shopify":
                summary["shop_url"] = details.get("shop_url")

            # Remove None fields
            status[platform] = {k: v for k, v in summary.items() if v is not None}

        logger.info(f"[DB][User] Connection status for {user_id}: {list(status.keys())}")
        return status
    except Exception as e:
        logger.error(f"[DB][User] get_user_connection_status failed: {e}", exc_info=True)
        return {}


# ============================================================
# 🔗 PLATFORM CONNECTION MANAGEMENT
# ============================================================
def save_or_update_platform_connection(user_id: str, platform: str, platform_data: dict):
    """
    Stores access tokens, expiry, IDs, and other platform details
    inside connected_platforms.<platform>.
    """
    query = _resolve_user_query(user_id)
    update_fields = {
        f"connected_platforms.{platform}.connected": True,
        f"connected_platforms.{platform}.connected_at": datetime.utcnow(),
    }

    # Tokens and expiry
    if "access_token" in platform_data:
        update_fields[f"connected_platforms.{platform}.access_token"] = platform_data["access_token"]
    if "refresh_token" in platform_data:
        update_fields[f"connected_platforms.{platform}.refresh_token"] = platform_data["refresh_token"]
    if "expires_in" in platform_data:
        expiry = datetime.utcnow() + timedelta(seconds=platform_data["expires_in"])
        update_fields[f"connected_platforms.{platform}.expires_in"] = platform_data["expires_in"]
        update_fields[f"connected_platforms.{platform}.token_expiry"] = expiry

    # Google-specific
    if platform == "google":
        for key in ["customer_ids", "manager_id", "client_customer_id", "selected_manager_id"]:
            if key in platform_data:
                update_fields[f"connected_platforms.{platform}.{key}"] = platform_data[key]

    # Meta-specific
    if platform == "meta" and "ad_account_id" in platform_data:
        update_fields[f"connected_platforms.{platform}.ad_account_id"] = platform_data["ad_account_id"]

    # Shopify-specific
    if platform == "shopify" and "shop_url" in platform_data:
        update_fields[f"connected_platforms.{platform}.shop_url"] = platform_data["shop_url"]

    # Save platform user id if available
    if "platform_user_id" in platform_data:
        update_fields[f"platform_ids.{platform}"] = platform_data["platform_user_id"]

    # Accounts list (Google)
    if "accounts" in platform_data:
        update_fields[f"connected_platforms.{platform}.accounts"] = platform_data["accounts"]

    try:
        result = users_collection.update_one(query, {"$set": update_fields}, upsert=True)
        logger.info(f"[DB][Platform] Updated {platform} for {user_id} (matched={result.matched_count})")
    except Exception as e:
        logger.error(f"[DB][Platform] save_or_update_platform_connection failed: {e}", exc_info=True)


def get_platform_connection_details(user_id: str, platform: str):
    """Retrieve specific platform connection details."""
    query = _resolve_user_query(user_id)
    try:
        user_doc = users_collection.find_one(query, {f"connected_platforms.{platform}": 1})
        return user_doc.get("connected_platforms", {}).get(platform) if user_doc else None
    except Exception as e:
        logger.error(f"[DB][Platform] get_platform_connection_details failed: {e}", exc_info=True)
        return None


# ============================================================
# 📊 ITEM STORAGE (Campaigns / Adsets / Ads)
# ============================================================
def save_items(collection_name: str, ad_account_id: str, items_data: list, platform: str):
    """
    Generic function to save items (campaign/adset/ad).
    Adds safe ID extraction and skips invalid records.
    """
    if not items_data:
        logger.info(f"[DB][Items] No {collection_name} to save for {platform}")
        return

    collection = db[collection_name]
    saved_count = 0

    for item in items_data:
        # 1️⃣ Try to extract an identifier safely
        doc_id = (
            item.get("id")
            or item.get("campaign_id")
            or item.get("ad_group_id")
            or item.get("resourceName")
        )

        if not doc_id:
            logger.warning(f"[DB][Items] Skipping {collection_name} record without ID: {item}")
            continue

        # 2️⃣ Add platform and ad_account metadata
        item["platform"] = platform
        item["ad_account_id"] = ad_account_id
        item["last_updated"] = datetime.utcnow()

        # 3️⃣ Upsert safely
        try:
            collection.update_one(
                {"id": doc_id, "platform": platform},
                {"$set": item},
                upsert=True
            )
            saved_count += 1
        except Exception as e:
            logger.error(f"[DB][Items] Failed to upsert {collection_name} record: {e}", exc_info=True)

    logger.info(f"[DB][Items] Saved {saved_count}/{len(items_data)} {collection_name} records for {platform}:{ad_account_id}")



# ============================================================
# 📈 INSIGHTS (Meta / Google Daily)
# ============================================================
def _bulk_write(collection, records, platform, user_id, ad_account_id, id_field: str):
    """Helper to bulk upsert insight records."""
    bulk_ops = []
    for record in records:
        date_field = record.get("date_start") or record.get("date")
        if not date_field:
            continue
        filter_query = {id_field: record.get(id_field), "date_start": date_field, "platform": platform}
        update_doc = {"$set": {**record, "user_id": user_id, "ad_account_id": ad_account_id, "platform": platform}}
        bulk_ops.append(UpdateOne(filter_query, update_doc, upsert=True))
    if not bulk_ops:
        return 0
    try:
        result = collection.bulk_write(bulk_ops)
        logger.info(f"[DB][Insights] Bulk upsert → matched={result.matched_count}, upserted={result.upserted_count}")
        return result.upserted_count + result.modified_count
    except Exception as e:
        logger.error(f"[DB][Insights] Bulk write failed: {e}", exc_info=True)
        return 0


# Meta insights
def save_daily_insights(user_id: str, ad_account_id: str, insights_data: list):
    return _bulk_write(meta_daily_insights_collection, insights_data, "meta", user_id, ad_account_id, "adset_id")

def save_daily_ad_insights(user_id: str, ad_account_id: str, insights_data: list):
    return _bulk_write(meta_daily_ad_insights_collection, insights_data, "meta", user_id, ad_account_id, "ad_id")

def save_daily_campaign_insights(user_id: str, ad_account_id: str, insights_data: list):
    return _bulk_write(meta_daily_campaign_insights_collection, insights_data, "meta", user_id, ad_account_id, "campaign_id")

# Google insights
def save_google_daily_insights(user_id: str, ad_account_id: str, insights_data: list):
    return _bulk_write(google_daily_insights_collection, insights_data, "google", user_id, ad_account_id, "campaign_id")


# ============================================================
# 🛍️ SHOPIFY TOKEN STORAGE
# ============================================================
def save_shopify_user_token(user_id: str, access_token: str, shop_url: str):
    """Save Shopify token & shop URL."""
    try:
        users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {
                "connected_platforms.shopify.connected": True,
                "connected_platforms.shopify.access_token": access_token,
                "connected_platforms.shopify.shop_url": shop_url,
                "connected_platforms.shopify.updated_at": datetime.utcnow()
            }},
            upsert=True
        )
        logger.info(f"[DB][Shopify] Token saved for user {user_id}, shop {shop_url}")
    except Exception as e:
        logger.error(f"[DB][Shopify] save_shopify_user_token failed: {e}", exc_info=True)
