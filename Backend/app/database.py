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

from pymongo import MongoClient
from app.config import settings

client = MongoClient(settings.MONGO_URI)
db = client[settings.DB_NAME]

# These collections are now unified for all platforms
users_collection = db["users"]
campaigns_collection = db["campaigns"]
adsets_collection = db["adsets"]
ads_collection = db["ads"]


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

# ⛔️ OLD platform-specific functions are no longer needed and can be deleted.