from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader
from pymongo import MongoClient
from app.config import settings
from datetime import datetime, timedelta

# This is a placeholder for getting the current user.
# In a real app, this would come from a decoded JWT token or session.
async def get_current_user_id(api_key: str = Depends(APIKeyHeader(name="X-API-Key"))):
    if not api_key: # In a real app, you'd look up the user by API key
        return "test_user_id" 
    return api_key

# --- Rate Limiting Logic ---
client = MongoClient(settings.MONGO_URI)
db = client[settings.DB_NAME]
users_collection = db.users
HOURLY_LIMIT = 50 # Set your desired limit here

async def rate_limiter(user_id: str = Depends(get_current_user_id)):
    now = datetime.utcnow()
    one_hour_ago = now - timedelta(hours=1)

    # Find the user's document and their recent query timestamps
    user = users_collection.find_one({"user_id": user_id})

    if user and "query_timestamps" in user:
        # Filter timestamps to only include those from the last hour
        recent_queries = [ts for ts in user["query_timestamps"] if ts > one_hour_ago]
        
        if len(recent_queries) >= HOURLY_LIMIT:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Please try again later."
            )
        
        # Add current timestamp to the list
        users_collection.update_one(
            {"user_id": user_id},
            {"$push": {"query_timestamps": now}}
        )
    else:
        # If user or timestamps don't exist, create them
        users_collection.update_one(
            {"user_id": user_id},
            {"$set": {"query_timestamps": [now]}},
            upsert=True
        )
        
    return user_id