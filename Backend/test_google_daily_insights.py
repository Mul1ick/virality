"""
Test script to fetch Google Ads daily insights and populate MongoDB collections.
Run this to create the google_daily_* collections that you'll see in Compass.
"""

import sys
import os

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.google_service import GoogleService
from app.database.mongo_client import db, get_platform_connection_details
from app.utils.logger import get_logger

logger = get_logger()


def main():
    print("\n" + "="*60)
    print("🚀 GOOGLE ADS DAILY INSIGHTS TEST")
    print("="*60 + "\n")
    
    # ============================================
    # STEP 1: GET YOUR USER ID AND CUSTOMER ID
    # ============================================
    print("📋 Step 1: Finding your user info...\n")
    
    # Try multiple queries to find users with Google
    queries = [
        {"platforms.google.connected": True},
        {"platforms.google.access_token": {"$exists": True}},
        {"platforms.google": {"$exists": True}},
    ]
    
    users = None
    for query in queries:
        users = list(db["users"].find(query).limit(1))
        if users:
            break
    
    if not users:
        # Just get ANY user and let them manually provide IDs
        print("⚠️ Could not auto-detect Google connection. Looking for any user...\n")
        users = list(db["users"].find().limit(5))
        
        if not users:
            print("❌ ERROR: No users found in database at all!")
            return
        
        print("Found these users:")
        for idx, u in enumerate(users):
            uid = u.get("_id") or u.get("user_id")
            email = u.get("email", "N/A")
            has_google = "google" in u.get("platforms", {})
            print(f"   {idx + 1}. User ID: {uid}")
            print(f"      Email: {email}")
            print(f"      Has Google: {'✅' if has_google else '❌'}")
            print()
        
        print("\n💡 MANUAL ENTRY REQUIRED:")
        user_id = input("Enter your user_id: ").strip()
        customer_id = input("Enter your Google Ads customer_id: ").strip()
        manager_id = input("Enter your manager_id (or press Enter to skip): ").strip() or None
        
        if not user_id or not customer_id:
            print("❌ user_id and customer_id are required!")
            return
        
        print(f"\n✅ Using:")
        print(f"   User ID: {user_id}")
        print(f"   Customer ID: {customer_id}")
        print(f"   Manager ID: {manager_id or 'None'}\n")
        
        # Skip to step 2
        
    else:
        user = users[0]
        user_id = user.get("_id") or user.get("user_id")
        
        print(f"✅ Found user: {user_id}")
    
        print(f"✅ Found user: {user_id}")
        
        # Get Google connection details
        google_details = get_platform_connection_details(user_id, "google")
        
        if not google_details:
            print("❌ ERROR: User has no Google connection details!")
            print("\n💡 Checking user document directly...")
            user_doc = db["users"].find_one({"_id": user_id} if "_id" in user else {"user_id": user_id})
            if user_doc:
                platforms = user_doc.get("platforms", {})
                print(f"   Available platforms: {list(platforms.keys())}")
                if "google" in platforms:
                    print(f"   Google keys: {list(platforms['google'].keys())}")
            return
        
        # Get customer ID
        customer_id = (
            google_details.get("client_customer_id") 
            or google_details.get("selected_manager_id")
        )
        
        if not customer_id:
            accounts = google_details.get("accounts", [])
            if accounts:
                customer_id = accounts[0].get("id")
        
        if not customer_id:
            print("❌ ERROR: Could not find customer_id!")
            print("Available keys in google_details:", list(google_details.keys()))
            print("\n💡 MANUAL ENTRY:")
            customer_id = input("Enter your Google Ads customer_id: ").strip()
            if not customer_id:
                return
        
        manager_id = google_details.get("selected_manager_id")
        
        print(f"✅ Customer ID: {customer_id}")
        print(f"   Manager ID: {manager_id or 'None (direct account)'}")
        
        # Check if token exists
        if not google_details.get("access_token"):
            print("❌ ERROR: No access_token found!")
            return
        
        print(f"✅ Access token exists\n")
    
    # ============================================
    # STEP 2: FETCH CAMPAIGN DAILY INSIGHTS
    # ============================================
    print("="*60)
    print("📊 Step 2: Fetching Campaign Daily Insights...")
    print("="*60 + "\n")
    
    try:
        campaigns = GoogleService.fetch_and_store_daily_campaign_insights(
            user_id=user_id,
            customer_id=customer_id,
            manager_id=manager_id,
            days_back=30
        )
        
        print(f"✅ SUCCESS! Fetched {len(campaigns)} campaign records\n")
        
        if campaigns:
            print("📄 Sample campaign record:")
            sample = campaigns[0]
            print(f"   Campaign: {sample.get('campaign_name')}")
            print(f"   Date: {sample.get('date_start')}")
            print(f"   Clicks: {sample.get('clicks')}")
            print(f"   Impressions: {sample.get('impressions')}")
            print(f"   Cost: ${int(sample.get('cost_micros', 0)) / 1_000_000:.2f}")
            print()
        
    except Exception as e:
        print(f"❌ ERROR fetching campaigns: {e}")
        import traceback
        traceback.print_exc()
        return
    
    # ============================================
    # STEP 3: FETCH AD GROUP DAILY INSIGHTS
    # ============================================
    print("="*60)
    print("📊 Step 3: Fetching Ad Group Daily Insights...")
    print("="*60 + "\n")
    
    try:
        adgroups = GoogleService.fetch_and_store_daily_adgroup_insights(
            user_id=user_id,
            customer_id=customer_id,
            manager_id=manager_id,
            days_back=30
        )
        
        print(f"✅ SUCCESS! Fetched {len(adgroups)} ad group records\n")
        
    except Exception as e:
        print(f"❌ ERROR fetching ad groups: {e}")
        import traceback
        traceback.print_exc()
    
    # ============================================
    # STEP 4: FETCH AD DAILY INSIGHTS
    # ============================================
    print("="*60)
    print("📊 Step 4: Fetching Ad Daily Insights...")
    print("="*60 + "\n")
    
    try:
        ads = GoogleService.fetch_and_store_daily_ad_insights(
            user_id=user_id,
            customer_id=customer_id,
            manager_id=manager_id,
            days_back=30
        )
        
        print(f"✅ SUCCESS! Fetched {len(ads)} ad records\n")
        
    except Exception as e:
        print(f"❌ ERROR fetching ads: {e}")
        import traceback
        traceback.print_exc()
    
    # ============================================
    # STEP 5: VERIFY MONGODB COLLECTIONS
    # ============================================
    print("="*60)
    print("🔍 Step 5: Verifying MongoDB Collections...")
    print("="*60 + "\n")
    
    collections = {
        "google_daily_campaign_insights": "Campaign",
        "google_daily_adgroup_insights": "Ad Group",
        "google_daily_ad_insights": "Ad"
    }
    
    total_records = 0
    
    for collection_name, label in collections.items():
        count = db[collection_name].count_documents({"user_id": user_id})
        total_records += count
        
        status = "✅" if count > 0 else "⚠️"
        print(f"{status} {collection_name}: {count} records")
        
        if count > 0:
            # Show a sample record
            sample = db[collection_name].find_one({"user_id": user_id})
            if sample:
                # Determine the name field based on label
                name_field = label.lower().replace(" ", "") + "_name"
                name_value = sample.get(name_field, 'N/A')
                
                print(f"   Sample {label}:")
                print(f"   - Date: {sample.get('date_start')}")
                print(f"   - Name: {name_value}")
                print(f"   - Clicks: {sample.get('clicks')}")
                print()
    
    # ============================================
    # FINAL SUMMARY
    # ============================================
    print("="*60)
    print("🎉 TEST COMPLETE!")
    print("="*60)
    print(f"\n✅ Total records created: {total_records}")
    print(f"\n📍 Next steps:")
    print(f"   1. Open MongoDB Compass and refresh")
    print(f"   2. Look for these collections:")
    for collection_name in collections.keys():
        print(f"      - {collection_name}")
    print(f"   3. Query with: {{ \"user_id\": \"{user_id}\" }}")
    print(f"\n💡 Use these in your aggregation endpoints:")
    print(f"   POST /api/aggregation/google")
    print(f"   with ad_account_id: {customer_id}")
    print()


if __name__ == "__main__":
    main()