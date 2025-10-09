from pymongo import MongoClient
from app.config import settings

client = MongoClient(settings.MONGO_URI)
db = client[settings.DB_NAME]

users_collection = db["users"]
campaigns_collection = db["campaigns"]

def save_or_update_user_token(user_id: str, token_data: dict):
    """Saves or updates a user's Meta access token."""
    users_collection.update_one(
        {"user_id": user_id},
        {"$set": {
            "access_token": token_data["access_token"],
            "token_type": token_data.get("token_type"),
            "expires_in": token_data.get("expires_in")
        }},
        upsert=True  # This will insert a new document if one doesn't exist
    )
    print(f"Token saved for user {user_id}")

def save_campaigns(ad_account_id: str, campaigns_data: list):
    """Saves a list of campaigns to the database, updating any existing ones."""
    if not campaigns_data:
        print("No campaigns to save.")
        return

    for campaign in campaigns_data:
        # Use the campaign ID as the unique identifier
        campaign_id = campaign["id"]
        
        # Add the ad_account_id to the campaign data for reference
        campaign["ad_account_id"] = ad_account_id

        campaigns_collection.update_one(
            {"id": campaign_id},
            {"$set": campaign},
            upsert=True
        )
    print(f"Saved {len(campaigns_data)} campaigns for ad account {ad_account_id}")
