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
from bson import ObjectId


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


def get_user_by_id(user_id: str):
    """Retrieves the entire user document by their unique ID (_id or email)."""
    # Assuming user_id passed from frontend might be email during login/signup,
    # but MongoDB _id after verification. Adapt query as needed.
    # If using MongoDB ObjectId for _id:
    # from bson import ObjectId
    # try:
    #   return users_collection.find_one({"_id": ObjectId(user_id)})
    # except: # Fallback to email if ObjectId conversion fails
    #   return users_collection.find_one({"email": user_id})
    # For simplicity, if user_id is always the one from auth/verify-otp (_id as string):
    try:
        return users_collection.find_one({"_id": ObjectId(user_id)})
    except Exception as e:
        logger.warning(f"Could not find user by ObjectId '{user_id}', trying by email. Error: {e}")
        # Fallback for cases where email might be used as user_id identifier initially
        user_by_email = users_collection.find_one({"email": user_id})
        if user_by_email:
            return user_by_email
        # Fallback for cases where the Meta/Google user ID (numeric string) was used
        user_by_platform_id = users_collection.find_one({f"platform_ids.{user_id_source}": user_id}) # Requires adding platform_ids field
        if user_by_platform_id:
             logger.warning(f"Found user via platform_id for '{user_id}'. Consider using ObjectId consistently.")
             return user_by_platform_id
        logger.error(f"User not found by ObjectId or email for '{user_id}'")
        return None


def save_or_update_platform_connection(user_id: str, platform: str, platform_data: dict):
    """
    Updates a user's document to store connection details for a specific platform.
    Uses dot notation to update nested fields within connected_platforms.
    """
    update_fields = {}
    # Basic connection status and timestamp
    update_fields[f"connected_platforms.{platform}.connected"] = True
    update_fields[f"connected_platforms.{platform}.connected_at"] = datetime.utcnow()

    # Platform-specific tokens and IDs
    if "access_token" in platform_data:
        update_fields[f"connected_platforms.{platform}.access_token"] = platform_data["access_token"]
    if "refresh_token" in platform_data: # Mainly for Google
        update_fields[f"connected_platforms.{platform}.refresh_token"] = platform_data.get("refresh_token")
    if "expires_in" in platform_data: # Mainly for Meta
        update_fields[f"connected_platforms.{platform}.expires_in"] = platform_data.get("expires_in")
        update_fields[f"connected_platforms.{platform}.token_expiry"] = datetime.utcnow() + timedelta(seconds=platform_data.get("expires_in", 0))
    if "expiry" in platform_data: # Google's expiry timestamp
         update_fields[f"connected_platforms.{platform}.token_expiry"] = platform_data.get("expiry") # Assuming it's already a datetime object or ISO string

    # Store specific IDs needed later
    if platform == "meta" and "ad_account_id" in platform_data:
        update_fields[f"connected_platforms.{platform}.ad_account_id"] = platform_data["ad_account_id"]
    if platform == "google" and "customer_ids" in platform_data:
        # Ensure it's always stored as a list, even if only one is found
        customer_ids = platform_data.get("customer_ids", [])
        update_fields[f"connected_platforms.{platform}.customer_ids"] = customer_ids if isinstance(customer_ids, list) else [customer_ids]
        # Optionally store the specific manager/client IDs used if needed later
        if "manager_id" in platform_data:
             update_fields[f"connected_platforms.{platform}.manager_id"] = platform_data["manager_id"]
        if "client_customer_id" in platform_data:
             update_fields[f"connected_platforms.{platform}.client_customer_id"] = platform_data["client_customer_id"]
    if platform == "shopify" and "shop_url" in platform_data:
        update_fields[f"connected_platforms.{platform}.shop_url"] = platform_data["shop_url"]

    # Also store the platform's user identifier if available (e.g., Google user ID, Meta user ID)
    if "platform_user_id" in platform_data:
         update_fields[f"platform_ids.{platform}"] = platform_data["platform_user_id"]


    # Use the MongoDB '_id' (ObjectId) for updating the specific user document
    try:
        result = users_collection.update_one(
            {"_id": ObjectId(user_id)}, # Find user by primary MongoDB ID
            {"$set": update_fields},
            upsert=True # Creates the connected_platforms field if it doesn't exist
        )
        logger.info(f"Updated platform connection for user '{user_id}', platform '{platform}'. Matched: {result.matched_count}, Modified: {result.modified_count}, UpsertedId: {result.upserted_id}")
    except Exception as e:
         logger.error(f"Failed to update platform connection for user '{user_id}', platform '{platform}': {e}")
         # Attempt fallback using email if ObjectId failed (might happen during initial connection if only email is known)
         logger.info(f"Retrying update using email for user '{user_id}'")
         result_email = users_collection.update_one(
             {"email": user_id}, # Try finding user by email
             {"$set": update_fields},
             upsert=False # Do not create a new user doc if email not found
         )
         if result_email.matched_count == 0:
             logger.error(f"User not found by ObjectId or email for '{user_id}'. Platform connection update failed.")
         else:
              logger.info(f"Updated platform connection via email fallback for user '{user_id}', platform '{platform}'. Matched: {result_email.matched_count}, Modified: {result_email.modified_count}")


def get_platform_connection_details(user_id: str, platform: str):
    """
    Retrieves connection details (token, IDs) for a specific platform
    from the user's single document.
    """
    try:
        user_doc = users_collection.find_one(
            {"_id": ObjectId(user_id)},
            projection={f"connected_platforms.{platform}": 1} # Only fetch data for the requested platform
        )
        if user_doc and "connected_platforms" in user_doc and platform in user_doc["connected_platforms"]:
            return user_doc["connected_platforms"][platform]
        else:
            logger.warning(f"No connection details found for user '{user_id}', platform '{platform}'.")
            return None
    except Exception as e:
        logger.error(f"Error fetching platform details for user '{user_id}', platform '{platform}': {e}")
        # Fallback attempt using email
        logger.info(f"Retrying fetch using email for user '{user_id}'")
        user_doc_email = users_collection.find_one(
             {"email": user_id},
             projection={f"connected_platforms.{platform}": 1}
        )
        if user_doc_email and "connected_platforms" in user_doc_email and platform in user_doc_email["connected_platforms"]:
             return user_doc_email["connected_platforms"][platform]
        else:
            logger.error(f"User not found by ObjectId or email for '{user_id}'. Cannot fetch platform details.")
            return None


def get_user_connection_status(user_id: str):
    """
    Retrieves the connection status and essential IDs for all platforms for a user.
    Designed for the new GET /user/{user_id}/platforms endpoint.
    """
    try:
        user_doc = users_collection.find_one(
            {"_id": ObjectId(user_id)},
            projection={"connected_platforms": 1, "_id": 0} # Only fetch the connected_platforms field
        )

        if not user_doc or "connected_platforms" not in user_doc:
            return {} # Return empty if user or field doesn't exist

        # Simplify the structure for the frontend
        status = {}
        platforms_data = user_doc.get("connected_platforms", {})
        for platform, details in platforms_data.items():
            status[platform] = {
                "connected": details.get("connected", False),
                # Add essential IDs needed by the frontend to fetch data
                "ad_account_id": details.get("ad_account_id") if platform == "meta" else None,
                "customer_ids": details.get("customer_ids") if platform == "google" else None,
                 "manager_id": details.get("manager_id") if platform == "google" else None, # Pass manager_id
                 "client_customer_id": details.get("client_customer_id") if platform == "google" else None, # Pass client_id
                "shop_url": details.get("shop_url") if platform == "shopify" else None,
            }
            # Remove keys with None values for cleaner output
            status[platform] = {k: v for k, v in status[platform].items() if v is not None}

        return status

    except Exception as e:
        logger.error(f"Error fetching connection status for user '{user_id}': {e}")
        # Fallback attempt using email
        logger.info(f"Retrying fetch connection status using email for user '{user_id}'")
        user_doc_email = users_collection.find_one(
             {"email": user_id},
             projection={"connected_platforms": 1, "_id": 0}
        )
        if not user_doc_email or "connected_platforms" not in user_doc_email:
             return {}

        status_email = {}
        platforms_data_email = user_doc_email.get("connected_platforms", {})
        # ... (repeat the simplification logic from above) ...
        for platform, details in platforms_data_email.items():
             status_email[platform] = {
                 "connected": details.get("connected", False),
                 "ad_account_id": details.get("ad_account_id") if platform == "meta" else None,
                 "customer_ids": details.get("customer_ids") if platform == "google" else None,
                 "manager_id": details.get("manager_id") if platform == "google" else None,
                 "client_customer_id": details.get("client_customer_id") if platform == "google" else None,
                 "shop_url": details.get("shop_url") if platform == "shopify" else None,
             }
             status_email[platform] = {k: v for k, v in status_email[platform].items() if v is not None}
        return status_email


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


def save_shopify_user_token(user_id: str, access_token: str, shop_url: str):
    """
    Specifically saves Shopify user token and shop URL.
    """
    update_payload = {
        "user_id": user_id,
        "source": "shopify",
        "access_token": access_token,
        "shop_url": shop_url # Explicitly save shop_url
    }
    users_collection.update_one(
        {"user_id": user_id, "source": "shopify"},
        {"$set": update_payload},
        upsert=True
    )
    logger.info(f"Shopify token data saved for user '{user_id}'. Payload: {update_payload}")