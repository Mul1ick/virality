# FILE: Backend/test_demographics_debug.py
import sys
import os
import asyncio
import requests
from datetime import date
from dateutil.relativedelta import relativedelta

# Add project root to path so imports work
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database.mongo_client import db, save_demographics, get_platform_connection_details
from app.config.config import settings

# --- CONFIGURATION ---
API_VERSION = "v20.0"

# ---------------------------------------------------------
# 1. HELPER TO GET A USER
# ---------------------------------------------------------
def get_test_user():
    print("🔍 Looking for a user with Meta connection...")
    user = db["users"].find_one({"connected_platforms.meta.access_token": {"$exists": True}})
    
    if not user:
        print("❌ No user found with Meta connection!")
        sys.exit(1)
        
    user_id = str(user["_id"])
    print(f"✅ Found User ID: {user_id}")
    
    meta_data = user.get("connected_platforms", {}).get("meta", {})
    token = meta_data.get("access_token")
    ad_account_id = meta_data.get("ad_account_id")
    
    if not ad_account_id:
        print("⚠️ User has token but no Ad Account selected.")
        # Try to find one from previous fetches or ask user
        ad_account_id = input("👉 Enter your Ad Account ID (numeric only): ").strip()
    
    return user_id, token, ad_account_id

# ---------------------------------------------------------
# 2. DIRECT API FETCH (No async complexity for this test)
# ---------------------------------------------------------
def test_fetch_from_meta(token, ad_account_id):
    print(f"\n🌍 Fetching Demographics from Meta API for act_{ad_account_id}...")
    
    account_id = f"act_{ad_account_id}" if not ad_account_id.startswith("act_") else ad_account_id
    url = f"https://graph.facebook.com/{API_VERSION}/{account_id}/insights"
    
    # Simple params - Last 30 days only to keep it fast
    params = {
        "access_token": token,
        "level": "campaign",
        "date_preset": "maximum",
        "breakdowns": "age,gender",
        "fields": "campaign_id,campaign_name,impressions,spend,clicks",
        "limit": 10
    }
    
    try:
        resp = requests.get(url, params=params)
        data = resp.json()
        
        if "error" in data:
            print(f"❌ Meta API Error: {data['error']['message']}")
            return []
            
        results = data.get("data", [])
        print(f"✅ Meta returned {len(results)} rows of demographic data.")
        
        if len(results) > 0:
            print(f"   Sample: {results[0]['age']} | {results[0]['gender']} | Impressions: {results[0]['impressions']}")
            
        return results
        
    except Exception as e:
        print(f"❌ Request Failed: {e}")
        return []

# ---------------------------------------------------------
# 3. TEST DB SAVE
# ---------------------------------------------------------
def test_db_save(user_id, ad_account_id, data):
    print("\n💾 Testing Database Save...")
    
    if not data:
        print("⚠️ No data to save. Skipping.")
        return

    try:
        # Using the function we (hopefully) added to mongo_client.py
        count = save_demographics(
            collection_name="meta_demographics_campaign",
            items_data=data,
            platform="meta",
            user_id=user_id,
            ad_account_id=ad_account_id,
            id_field="campaign_id"
        )
        print(f"✅ DB Function returned: {count} records modified/upserted.")
        
        # Verify manually
        actual_count = db["meta_demographics_campaign"].count_documents({"user_id": user_id})
        print(f"🧐 Actual count in 'meta_demographics_campaign': {actual_count}")
        
    except Exception as e:
        print(f"❌ DB Save Failed: {e}")
        import traceback
        traceback.print_exc()

# ---------------------------------------------------------
# MAIN EXECUTION
# ---------------------------------------------------------
if __name__ == "__main__":
    # 1. Get Creds
    user_id, token, ad_account_id = get_test_user()
    
    # 2. Fetch
    data = test_fetch_from_meta(token, ad_account_id)
    
    # 3. Save
    test_db_save(user_id, ad_account_id, data)