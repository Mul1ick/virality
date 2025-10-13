from pymongo import MongoClient
from app.config import settings

client = MongoClient(settings.MONGO_URI)
db = client[settings.DB_NAME]

users_collection = db["users"]
campaigns_collection = db["campaigns"]

def save_or_update_user_token(user_id: str, token_data: dict, source: str):
    users_collection.update_one(
        {"user_id": user_id, "source": source},  # 👈 composite key
        {"$set": {
            "access_token": token_data["access_token"],
            "refresh_token": token_data.get("refresh_token"),
            "token_type": token_data.get("token_type"),
            "expires_in": token_data.get("expires_in")
        }},
        upsert=True
    )


# ADD THIS NEW FUNCTION
def get_user_token(user_id: str):
    """Retrieves a user's token data from the database."""
    user_data = users_collection.find_one({"user_id": user_id})
    return user_data

def save_campaigns(ad_account_id: str, campaigns_data: list):
    # ... (this function is correct, no changes needed)
    if not campaigns_data:
        print("No campaigns to save.")
        return

    for campaign in campaigns_data:
        campaign_id = campaign["id"]
        campaign["ad_account_id"] = ad_account_id
        campaigns_collection.update_one(
            {"id": campaign_id},
            {"$set": campaign},
            upsert=True
        )
    print(f"Saved {len(campaigns_data)} campaigns for ad account {ad_account_id}")
