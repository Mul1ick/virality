"""
Test script to manually trigger Google Ads daily insights sync.

Location: Backend/tests/test_google_sync.py

Usage:
    python -m tests.test_google_sync
"""

import requests
import json
import sys
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

# ============================================================================
# CONFIGURATION - UPDATE THESE VALUES
# ============================================================================

API_BASE_URL = "http://localhost:8000"

# Your actual values from the logs
USER_ID = "69442e82d6dcd71c44e07fc9"
CUSTOMER_ID = "5754295060"
MANAGER_ID = "9571948031"  # Optional, set to None if direct account

# Get your JWT token by logging in or from browser localStorage
# In browser console: localStorage.getItem('token')
JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJnZGhhdml0d29ya0BnbWFpbC5jb20iLCJ1c2VyX2lkIjoiNjk0NDJlODJkNmRjZDcxYzQ0ZTA3ZmM5IiwiaXNBZG1pbiI6ZmFsc2UsImV4cCI6MTc2NjczOTU5MX0.KKFClEfyT_CD7K_8Z2dOlyEH6XrDA46S18IhxN5asGE"  # Replace with actual token

DAYS_BACK = 30  # How many days of historical data to fetch

# ============================================================================


def test_sync_google_data():
    """
    Test the Google Ads daily insights sync endpoint.
    This will populate google_daily_campaign_insights collection.
    """
    
    print("=" * 70)
    print("🔄 Google Ads Daily Insights Sync Test")
    print("=" * 70)
    print(f"\n📊 Configuration:")
    print(f"   API URL: {API_BASE_URL}")
    print(f"   User ID: {USER_ID}")
    print(f"   Customer ID: {CUSTOMER_ID}")
    print(f"   Manager ID: {MANAGER_ID}")
    print(f"   Days Back: {DAYS_BACK}")
    print(f"   Token: {'✅ Set' if JWT_TOKEN != 'YOUR_JWT_TOKEN_HERE' else '❌ NOT SET'}")
    
    if JWT_TOKEN == "YOUR_JWT_TOKEN_HERE":
        print("\n❌ ERROR: Please set your JWT_TOKEN in the script!")
        print("\n💡 To get your token:")
        print("   1. Open browser DevTools (F12)")
        print("   2. Go to Console tab")
        print("   3. Type: localStorage.getItem('token')")
        print("   4. Copy the token and paste it in this script")
        return
    
    # Prepare request
    url = f"{API_BASE_URL}/google/sync/{USER_ID}"
    headers = {
        "Authorization": f"Bearer {JWT_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "customer_id": CUSTOMER_ID,
        "manager_id": MANAGER_ID if MANAGER_ID else None,
        "days_back": DAYS_BACK
    }
    
    print(f"\n🚀 Sending sync request to: {url}")
    print(f"📦 Payload: {json.dumps(payload, indent=2)}")
    
    try:
        # Make the request
        response = requests.post(url, headers=headers, json=payload, timeout=120)
        
        print(f"\n📡 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("\n✅ SUCCESS! Daily insights synced.")
            print(f"\n📊 Results:")
            print(f"   Campaigns saved: {result.get('campaigns_saved', 0)}")
            print(f"   Ad Groups saved: {result.get('adgroups_saved', 0)}")
            print(f"   Ads saved: {result.get('ads_saved', 0)}")
            print(f"   Total records: {result.get('total_records', 0)}")
            
            print("\n🎯 Next Steps:")
            print("   1. Refresh your frontend dashboard")
            print("   2. The charts should now show Google Ads data")
            print("   3. Check MongoDB to verify data:")
            print(f"      db.google_daily_campaign_insights.find({{user_id: '{USER_ID}'}}).limit(5)")
            
        elif response.status_code == 401:
            print("\n❌ Authentication Failed!")
            print("   Your JWT token is invalid or expired.")
            print("   Please get a fresh token from browser localStorage.")
            
        elif response.status_code == 403:
            print("\n❌ Forbidden!")
            print("   User ID mismatch or permission denied.")
            
        else:
            print(f"\n❌ Request Failed!")
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text[:500]}")
            
    except requests.exceptions.Timeout:
        print("\n⏱️ Request Timeout!")
        print("   The sync is taking longer than 120 seconds.")
        print("   This might be normal for large accounts with lots of data.")
        print("   Check backend logs and MongoDB to see if data is being saved.")
        
    except requests.exceptions.ConnectionError:
        print("\n❌ Connection Error!")
        print(f"   Could not connect to {API_BASE_URL}")
        print("   Make sure your FastAPI backend is running.")
        
    except Exception as e:
        print(f"\n❌ Unexpected Error: {e}")
    
    print("\n" + "=" * 70)


def verify_mongodb_data():
    """
    Optional: Check if MongoDB has the data (requires pymongo).
    """
    try:
        from app.database.mongo_client import db
        
        print("\n🔍 Checking MongoDB...")
        
        collection = db["google_daily_campaign_insights"]
        count = collection.count_documents({"user_id": USER_ID})
        
        print(f"✅ Found {count} records in google_daily_campaign_insights")
        
        if count > 0:
            sample = collection.find_one({"user_id": USER_ID})
            print(f"\n📄 Sample record:")
            print(f"   Date: {sample.get('date_start')}")
            print(f"   Campaign: {sample.get('campaign_name')}")
            print(f"   Spend: ${float(sample.get('cost_micros', 0)) / 1000000:.2f}")
            print(f"   Clicks: {sample.get('clicks')}")
            print(f"   Impressions: {sample.get('impressions')}")
        
    except ImportError:
        print("\n💡 To check MongoDB directly, run in your Backend directory:")
        print(f"   python -c \"from app.database.mongo_client import db; print(db['google_daily_campaign_insights'].count_documents({{'user_id': '{USER_ID}'}}))\"\n")
    except Exception as e:
        print(f"\n⚠️ Could not check MongoDB: {e}")


if __name__ == "__main__":
    test_sync_google_data()
    
    # Optionally verify data in MongoDB
    print("\n" + "=" * 70)
    verify_mongodb_data()