# # FILE: app/database.py
# """
# Centralized MongoDB operations for all platforms (Google, Meta, Shopify).
# This module handles user profiles, platform connections, and data ingestion.
# """

# from pymongo import MongoClient, UpdateOne
# from bson import ObjectId
# from datetime import datetime, timedelta
# from app.config.config import settings
# from app.utils.logger import get_logger

# logger = get_logger()

# # ---------------------------------------------------------------------
# # 🔗 Database Connection
# # ---------------------------------------------------------------------
# client = MongoClient(settings.MONGO_URI)
# db = client[settings.DB_NAME]

# # Unified collection references
# users_collection = db["users"]
# campaigns_collection = db["campaigns"]
# adsets_collection = db["adsets"]
# ads_collection = db["ads"]

# meta_daily_insights_collection = db["meta_daily_insights"]
# meta_daily_ad_insights_collection = db["meta_daily_ad_insights"]
# meta_daily_campaign_insights_collection = db["meta_daily_campaign_insights"]
# google_daily_insights_collection = db["google_daily_insights"]

# # ---------------------------------------------------------------------
# # 👤 User Management
# # ---------------------------------------------------------------------
# def get_user_by_id(user_id: str):
#     """Retrieve a user by ObjectId or fallback to email."""
#     try:
#         return users_collection.find_one({"_id": ObjectId(user_id)})
#     except Exception as e:
#         logger.warning(f"[USER] Invalid ObjectId for '{user_id}'. Trying by email. Error: {e}")
#         user_doc = users_collection.find_one({"email": user_id})
#         if user_doc:
#             return user_doc
#         logger.error(f"[USER] User not found by ObjectId or email for '{user_id}'")
#         return None


# def save_or_update_platform_connection(user_id: str, platform: str, platform_data: dict):
#     """
#     Saves or updates platform-specific connection details for a user.
#     Automatically handles tokens, expiry, and identifiers.
#     """
#     update_fields = {
#         f"connected_platforms.{platform}.connected": True,
#         f"connected_platforms.{platform}.connected_at": datetime.utcnow(),
#     }

#     # Token fields
#     if "access_token" in platform_data:
#         update_fields[f"connected_platforms.{platform}.access_token"] = platform_data["access_token"]
#     if "refresh_token" in platform_data:
#         update_fields[f"connected_platforms.{platform}.refresh_token"] = platform_data["refresh_token"]
#     if "expires_in" in platform_data:
#         expiry = datetime.utcnow() + timedelta(seconds=platform_data.get("expires_in", 0))
#         update_fields[f"connected_platforms.{platform}.token_expiry"] = expiry
#     if "expiry" in platform_data:
#         update_fields[f"connected_platforms.{platform}.token_expiry"] = platform_data["expiry"]

#     # Platform-specific fields
#     if platform == "google":
#         for key in ["customer_ids", "manager_id", "client_customer_id", "selected_manager_id", "accounts"]:
#             if key in platform_data:
#                 update_fields[f"connected_platforms.{platform}.{key}"] = platform_data[key]
#     elif platform == "meta":
#         if "ad_account_id" in platform_data:
#             update_fields[f"connected_platforms.{platform}.ad_account_id"] = platform_data["ad_account_id"]
#     elif platform == "shopify":
#         if "shop_url" in platform_data:
#             update_fields[f"connected_platforms.{platform}.shop_url"] = platform_data["shop_url"]

#     # Common platform user ID
#     if "platform_user_id" in platform_data:
#         update_fields[f"platform_ids.{platform}"] = platform_data["platform_user_id"]

#     try:
#         result = users_collection.update_one(
#             {"_id": ObjectId(user_id)},
#             {"$set": update_fields},
#             upsert=True,
#         )
#         logger.info(
#             f"[PLATFORM] Updated {platform} connection for {user_id} "
#             f"(Matched={result.matched_count}, Modified={result.modified_count})"
#         )
#     except Exception as e:
#         logger.error(f"[PLATFORM] Failed to update {platform} connection for {user_id}: {e}")


# def get_platform_connection_details(user_id: str, platform: str):
#     """Return token + config details for a user's connected platform."""
#     try:
#         doc = users_collection.find_one(
#             {"_id": ObjectId(user_id)},
#             projection={f"connected_platforms.{platform}": 1},
#         )
#         data = (doc or {}).get("connected_platforms", {}).get(platform)
#         if not data:
#             logger.warning(f"[PLATFORM] No details found for {platform} ({user_id})")
#         return data
#     except Exception as e:
#         logger.error(f"[PLATFORM] Error fetching {platform} details for {user_id}: {e}")
#         return None


# def get_user_connection_status(user_id: str):
#     """Return simplified connection overview for all platforms."""
#     try:
#         user_doc = users_collection.find_one(
#             {"_id": ObjectId(user_id)},
#             projection={"connected_platforms": 1, "_id": 0},
#         )
#         if not user_doc:
#             return {}

#         status = {}
#         for platform, details in user_doc.get("connected_platforms", {}).items():
#             base = {"connected": details.get("connected", False)}
#             if platform == "meta":
#                 base["ad_account_id"] = details.get("ad_account_id")
#             elif platform == "google":
#                 for k in ["customer_ids", "manager_id", "client_customer_id", "selected_manager_id"]:
#                     if details.get(k):
#                         base[k] = details[k]
#             elif platform == "shopify":
#                 base["shop_url"] = details.get("shop_url")
#             status[platform] = {k: v for k, v in base.items() if v is not None}
#         return status
#     except Exception as e:
#         logger.error(f"[USER] Error fetching connection status for {user_id}: {e}")
#         return {}

# # ---------------------------------------------------------------------
# # 📊 Generic Save Operations
# # ---------------------------------------------------------------------
# def save_items(collection_name: str, ad_account_id: str, items_data: list, platform: str):
#     """Save or update bulk campaign/adset/ad data."""
#     if not items_data:
#         logger.info(f"[DB] No items to save for {platform}/{collection_name}.")
#         return

#     collection = db[collection_name]
#     ops = [
#         UpdateOne(
#             {"id": item["id"], "platform": platform},
#             {"$set": {**item, "ad_account_id": ad_account_id, "platform": platform}},
#             upsert=True,
#         )
#         for item in items_data
#     ]
#     result = collection.bulk_write(ops)
#     logger.info(f"[DB] {collection_name}: Matched={result.matched_count}, Modified={result.modified_count}")


# def save_item_insights(collection_name: str, items_with_insights: list, platform: str):
#     """Merge insight data into existing campaign/adset/ad docs."""
#     if not items_with_insights:
#         logger.info(f"[INSIGHTS] No insights to save for {platform}/{collection_name}.")
#         return

#     collection = db[collection_name]
#     ops = []
#     for item in items_with_insights:
#         insights = item.get("insights", {}).get("data", [{}])[0]
#         update_doc = {f"insights.{k}": v for k, v in insights.items()}
#         ops.append(UpdateOne({"id": item["id"], "platform": platform}, {"$set": update_doc}))
#     collection.bulk_write(ops)
#     logger.info(f"[INSIGHTS] Updated {len(items_with_insights)} records in {collection_name}.")


# # ---------------------------------------------------------------------
# # 📈 Meta Insights (Daily)
# # ---------------------------------------------------------------------
# def _bulk_write(collection, filter_key: str, user_id: str, ad_account_id: str, insights: list, platform="meta"):
#     """Generic helper for daily insight saves."""
#     if not insights:
#         return 0
#     ops = [
#         UpdateOne(
#             {filter_key: r.get(filter_key), "date_start": r.get("date_start"), "platform": platform},
#             {"$set": {**r, "user_id": user_id, "ad_account_id": ad_account_id, "platform": platform}},
#             upsert=True,
#         )
#         for r in insights
#     ]
#     result = collection.bulk_write(ops)
#     logger.info(f"[INSIGHTS:{filter_key}] Matched={result.matched_count}, Upserted={result.upserted_count}")
#     return result.upserted_count + result.modified_count


# def save_daily_insights(user_id, ad_account_id, insights): return _bulk_write(meta_daily_insights_collection, "adset_id", user_id, ad_account_id, insights)
# def save_daily_ad_insights(user_id, ad_account_id, insights): return _bulk_write(meta_daily_ad_insights_collection, "ad_id", user_id, ad_account_id, insights)
# def save_daily_campaign_insights(user_id, ad_account_id, insights): return _bulk_write(meta_daily_campaign_insights_collection, "campaign_id", user_id, ad_account_id, insights)


# # ---------------------------------------------------------------------
# # 🛍 Shopify
# # ---------------------------------------------------------------------
# def save_shopify_user_token(user_id: str, access_token: str, shop_url: str):
#     """Save Shopify token + shop details."""
#     try:
#         users_collection.update_one(
#             {"_id": ObjectId(user_id)},
#             {"$set": {
#                 "connected_platforms.shopify.connected": True,
#                 "connected_platforms.shopify.shop_url": shop_url,
#                 "connected_platforms.shopify.access_token": access_token,
#                 "connected_platforms.shopify.connected_at": datetime.utcnow()
#             }},
#             upsert=True,
#         )
#         logger.info(f"[SHOPIFY] Token saved for {user_id} ({shop_url})")
#     except Exception as e:
#         logger.error(f"[SHOPIFY] Error saving token for {user_id}: {e}")


# # ---------------------------------------------------------------------
# # 📊 Google
# # ---------------------------------------------------------------------
# def save_google_daily_insights(user_id: str, ad_account_id: str, insights_data: list):
#     """Bulk-upsert daily Google Ads insights."""
#     if not insights_data:
#         logger.info("[GOOGLE] No daily insights to save.")
#         return 0
#     ops = [
#         UpdateOne(
#             {"campaign_id": r.get("campaign_id"), "date": r.get("date"), "platform": "google"},
#             {"$set": {**r, "user_id": user_id, "ad_account_id": ad_account_id, "platform": "google"}},
#             upsert=True,
#         )
#         for r in insights_data
#     ]
#     result = google_daily_insights_collection.bulk_write(ops)
#     logger.info(f"[GOOGLE] Bulk write: Matched={result.matched_count}, Upserted={result.upserted_count}")
#     return result.upserted_count + result.modified_count
