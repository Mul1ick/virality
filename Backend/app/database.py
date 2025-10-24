# from pymongo import MongoClient
# from app.config import settings

# client = MongoClient(settings.MONGO_URI)
# db = client[settings.DB_NAME]

# users_collection = db["users"]
# campaigns_collection = db["campaigns"]
# adsets_collection = db["adsets"]
# ads_collection = db["ads"]


# def save_or_update_user_token(user_id: str, token_data: dict, source: str):
#     users_collection.update_one(
#         {"user_id": user_id, "source": source},  # 👈 composite key
#         {"$set": {
#             "access_token": token_data["access_token"],
#             "refresh_token": token_data.get("refresh_token"),
#             "token_type": token_data.get("token_type"),
#             "expires_in": token_data.get("expires_in")
#         }},
#         upsert=True
#     )


# # ADD THIS NEW FUNCTION
# def get_user_token(user_id: str):
#     """Retrieves a user's token data from the database."""
#     user_data = users_collection.find_one({"user_id": user_id})
#     return user_data

# def save_campaigns(ad_account_id: str, campaigns_data: list):
#     # ... (this function is correct, no changes needed)
#     if not campaigns_data:
#         print("No campaigns to save.")
#         return

#     for campaign in campaigns_data:
#         campaign_id = campaign["id"]
#         campaign["ad_account_id"] = ad_account_id
#         campaigns_collection.update_one(
#             {"id": campaign_id},
#             {"$set": campaign},
#             upsert=True
#         )
#     print(f"Saved {len(campaigns_data)} campaigns for ad account {ad_account_id}")

# def save_campaign_insights(campaigns_with_insights: list):
#     """Merges insights data into existing campaign documents."""
#     if not campaigns_with_insights:
#         print("No campaign insights to save.")
#         return

#     for campaign in campaigns_with_insights:
#         # The insights data is nested, so we extract it.
#         insights = campaign.get("insights", {}).get("data", [{}])[0]
        
#         # Prepare the update document. We use dot notation for nested fields.
#         update_data = {
#             f"insights.{key}": value for key, value in insights.items()
#         }

#         campaigns_collection.update_one(
#             {"id": campaign["id"]},
#             {"$set": update_data},
#             upsert=False # We only update campaigns that already exist
#         )
#     print(f"Updated insights for {len(campaigns_with_insights)} campaigns.")


# def save_adsets(ad_account_id: str, adsets_data: list):
#     """Saves a list of ad sets to the adsets_collection."""
#     if not adsets_data:
#         print("No ad sets to save.")
#         return

#     for adset in adsets_data:
#         adset_id = adset["id"]
#         adset["ad_account_id"] = ad_account_id
#         adsets_collection.update_one(
#             {"id": adset_id},
#             {"$set": adset},
#             upsert=True
#         )
#     print(f"Saved {len(adsets_data)} ad sets for ad account {ad_account_id}")


# # 👇 ADD THIS NEW FUNCTION TO SAVE ADS
# def save_ads(ad_account_id: str, ads_data: list):
#     """Saves a list of ads to the ads_collection."""
#     if not ads_data:
#         print("No ads to save.")
#         return

#     for ad in ads_data:
#         ad_id = ad["id"]
#         ad["ad_account_id"] = ad_account_id
#         ads_collection.update_one(
#             {"id": ad_id},
#             {"$set": ad},
#             upsert=True
#         )
#     print(f"Saved {len(ads_data)} ads for ad account {ad_account_id}")

# def save_adset_insights(adsets_with_insights: list):
#     """Merges insights data into existing adset documents."""
#     if not adsets_with_insights:
#         print("No ad set insights to save.")
#         return

#     for adset in adsets_with_insights:
#         insights = adset.get("insights", {}).get("data", [{}])[0]
#         update_data = {
#             f"insights.{key}": value for key, value in insights.items()
#         }
#         adsets_collection.update_one(
#             {"id": adset["id"]},
#             {"$set": update_data},
#             upsert=False
#         )
#     print(f"Updated insights for {len(adsets_with_insights)} ad sets.")


# # 👇 ADD THIS NEW FUNCTION FOR AD INSIGHTS
# def save_ad_insights(ads_with_insights: list):
#     """Merges insights data into existing ad documents."""
#     if not ads_with_insights:
#         print("No ad insights to save.")
#         return

#     for ad in ads_with_insights:
#         insights = ad.get("insights", {}).get("data", [{}])[0]
#         update_data = {
#             f"insights.{key}": value for key, value in insights.items()
#         }
#         ads_collection.update_one(
#             {"id": ad["id"]},
#             {"$set": update_data},
#             upsert=False
#         )
#     print(f"Updated insights for {len(ads_with_insights)} ads.")

from pymongo import MongoClient, UpdateOne
from app.config import settings
from app.utils.logger import get_logger

logger = get_logger()
client = MongoClient(settings.MONGO_URI)
db = client[settings.DB_NAME]

# These collections are now unified for all platforms
users_collection = db["users"]
campaigns_collection = db["campaigns"]
adsets_collection = db["adsets"]
ads_collection = db["ads"]
meta_daily_insights_collection = db["meta_daily_insights"] # 👈 ADD THIS NEW COLLECTION
meta_daily_ad_insights_collection = db["meta_daily_ad_insights"]
meta_daily_campaign_insights_collection = db["meta_daily_campaign_insights"]


def save_or_update_user_token(user_id: str, token_data: dict, source: str):
    # ... (no changes to this function)
    users_collection.update_one(
        {"user_id": user_id, "source": source},
        {"$set": {
            "access_token": token_data["access_token"],
            "refresh_token": token_data.get("refresh_token"),
            "token_type": token_data.get("token_type"),
            "expires_in": token_data.get("expires_in")
        }},
        upsert=True
    )

def get_user_token(user_id: str):
    # ... (no changes to this function)
    user_data = users_collection.find_one({"user_id": user_id})
    return user_data


# 👇 NEW: A generic function to save any type of item (campaign, adset, ad)
def save_items(collection_name: str, ad_account_id: str, items_data: list, platform: str):
    """
    Saves a list of items to a specified collection, tagging them with the platform.
    """
    if not items_data:
        print(f"No items to save for {platform} in {collection_name}.")
        return

    collection = db[collection_name]
    for item in items_data:
        item_id = item["id"]
        item["platform"] = platform  # Add the platform field
        item["ad_account_id"] = ad_account_id
        
        # Use a composite key (id + platform) to ensure uniqueness across platforms
        collection.update_one(
            {"id": item_id, "platform": platform},
            {"$set": item},
            upsert=True
        )
    print(f"Saved {len(items_data)} {collection_name} for {platform} account {ad_account_id}")

    
def get_user_token_by_source(user_id: str, source: str):
    """
    Retrieves a user's token for a specific source (google, meta, shopify, etc.)
    without affecting existing Meta controller logic.
    """
    # In your provided code, you had a find_one with {"user_id": user_id}
    # This might return the wrong token if a user connects multiple platforms.
    # The correct query should filter by source as well.
    return users_collection.find_one({"user_id": user_id, "source": source})


# 👇 NEW: A generic function to save insights for any item type
def save_item_insights(collection_name: str, items_with_insights: list, platform: str):
    """
    Merges insights data into existing documents in a specified collection.
    """
    if not items_with_insights:
        print(f"No insights to save for {platform} in {collection_name}.")
        return

    collection = db[collection_name]
    for item in items_with_insights:
        insights = item.get("insights", {}).get("data", [{}])[0]
        update_data = {f"insights.{key}": value for key, value in insights.items()}

        # Update based on the composite key
        collection.update_one(
            {"id": item["id"], "platform": platform},
            {"$set": update_data},
            upsert=False
        )
    print(f"Updated insights for {len(items_with_insights)} {collection_name} from {platform}.")

# 👇 ADD THIS NEW FUNCTION to save historical daily insights
def save_daily_insights(user_id: str, ad_account_id: str, insights_data: list):
    """
    Saves or updates daily historical insights data using a bulk operation.
    """
    if not insights_data:
        logger.info("No daily insights to save.")
        return 0

    bulk_operations = []
    for record in insights_data:
        # Define the unique filter for each document
        filter_query = {
            "adset_id": record.get("adset_id"),
            "date_start": record.get("date_start"),
            "platform": "meta"
        }
        
        # Prepare the update document, adding user_id and ad_account_id
        update_doc = {
            "$set": {
                **record,
                "user_id": user_id,
                "ad_account_id": ad_account_id,
                "platform": "meta"
            }
        }
        
        # Add an UpdateOne operation to the list with upsert=True
        bulk_operations.append(UpdateOne(filter_query, update_doc, upsert=True))

    try:
        result = meta_daily_insights_collection.bulk_write(bulk_operations)
        logger.info(f"Bulk write summary: Matched={result.matched_count}, Upserted={result.upserted_count}, Modified={result.modified_count}")
        return result.upserted_count + result.modified_count
    except Exception as e:
        logger.error(f"Error during bulk save of daily insights: {e}")
        return 0

def save_daily_ad_insights(user_id: str, ad_account_id: str, insights_data: list):
    """Saves or updates daily historical AD insights data using a bulk operation."""
    if not insights_data:
        logger.info("No daily ad insights to save.")
        return 0

    bulk_operations = []
    for record in insights_data:
        filter_query = {
            "ad_id": record.get("ad_id"),
            "date_start": record.get("date_start"),
            "platform": "meta"
        }
        update_doc = {"$set": {**record, "user_id": user_id, "ad_account_id": ad_account_id, "platform": "meta"}}
        bulk_operations.append(UpdateOne(filter_query, update_doc, upsert=True))

    try:
        result = meta_daily_ad_insights_collection.bulk_write(bulk_operations)
        logger.info(f"[Ad] Bulk write summary: Matched={result.matched_count}, Upserted={result.upserted_count}, Modified={result.modified_count}")
        return result.upserted_count + result.modified_count
    except Exception as e:
        logger.error(f"Error during bulk save of daily ad insights: {e}")
        return 0

# --- NEW FUNCTION FOR CAMPAIGN-LEVEL INSIGHTS ---
def save_daily_campaign_insights(user_id: str, ad_account_id: str, insights_data: list):
    """Saves or updates daily historical CAMPAIGN insights data using a bulk operation."""
    if not insights_data:
        logger.info("No daily campaign insights to save.")
        return 0

    bulk_operations = []
    for record in insights_data:
        filter_query = {
            "campaign_id": record.get("campaign_id"),
            "date_start": record.get("date_start"),
            "platform": "meta"
        }
        update_doc = {"$set": {**record, "user_id": user_id, "ad_account_id": ad_account_id, "platform": "meta"}}
        bulk_operations.append(UpdateOne(filter_query, update_doc, upsert=True))

    try:
        result = meta_daily_campaign_insights_collection.bulk_write(bulk_operations)
        logger.info(f"[Campaign] Bulk write summary: Matched={result.matched_count}, Upserted={result.upserted_count}, Modified={result.modified_count}")
        return result.upserted_count + result.modified_count
    except Exception as e:
        logger.error(f"Error during bulk save of daily campaign insights: {e}")
        return 0

