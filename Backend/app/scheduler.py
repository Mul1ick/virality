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