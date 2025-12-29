"""
Debug test to check what Google API is actually returning.

Location: Backend/tests/test_google_debug.py

Usage:
    python -m tests.test_google_debug
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from datetime import datetime, timedelta, timezone
from app.database.mongo_client import get_platform_connection_details
from app.utils.google_api import get_campaign_daily_insights
from app.services.google_service import GoogleService

# ============================================================================
# CONFIGURATION
# ============================================================================
USER_ID = "69442e82d6dcd71c44e07fc9"
CUSTOMER_ID = "5754295060"
MANAGER_ID = "9571948031"
# ============================================================================

def debug_google_api_response():
    """Check what the Google API is actually returning."""
    
    print("=" * 70)
    print("🔍 Google Ads API Debug Test")
    print("=" * 70)
    
    # Get token
    print("\n1️⃣ Getting access token...")
    try:
        token = GoogleService._maybe_refresh_token(USER_ID)
        print(f"   ✅ Token obtained: {token[:20]}...")
    except Exception as e:
        print(f"   ❌ Failed to get token: {e}")
        return
    
    # Get connection details
    print("\n2️⃣ Checking connection details...")
    details = get_platform_connection_details(USER_ID, "google")
    if details:
        print(f"   ✅ Connection found")
        print(f"   - Mode: {details.get('mode', 'unknown')}")
        print(f"   - Selected Manager: {details.get('selected_manager_id', 'none')}")
        print(f"   - Client Customer: {details.get('client_customer_id', 'none')}")
    else:
        print(f"   ❌ No connection details found")
        return
    
    # Calculate date range
    end_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    start_date = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    
    print(f"\n3️⃣ Fetching data for date range: {start_date} to {end_date}")
    
    # Call Google API directly
    print(f"\n4️⃣ Calling Google Ads API...")
    print(f"   - Customer ID: {CUSTOMER_ID}")
    print(f"   - Manager ID: {MANAGER_ID}")
    
    try:
        resp = get_campaign_daily_insights(
            token, 
            CUSTOMER_ID, 
            MANAGER_ID, 
            start_date, 
            end_date
        )
        
        if not resp:
            print("   ❌ No response from API")
            return
        
        print(f"   ✅ Response status: {resp.status_code}")
        
        if resp.status_code != 200:
            print(f"\n❌ API Error Response:")
            print(resp.text[:500])
            return
        
        # Parse response
        try:
            data = resp.json()
        except Exception as e:
            print(f"   ❌ Failed to parse JSON: {e}")
            return
        
        print(f"\n5️⃣ Response structure:")
        print(f"   - Type: {type(data)}")
        print(f"   - Keys: {list(data.keys()) if isinstance(data, dict) else 'N/A'}")
        
        # Check results
        results = data.get("results", []) if isinstance(data, dict) else []
        print(f"\n6️⃣ Results analysis:")
        print(f"   - Total results: {len(results)}")
        
        if len(results) == 0:
            print("\n⚠️  PROBLEM: Google API returned 0 results!")
            print("\nPossible reasons:")
            print("   1. No campaigns ran during this date range")
            print("   2. Customer ID is incorrect")
            print("   3. Manager ID doesn't have access to this customer")
            print("   4. Campaigns exist but have no metrics (paused/inactive)")
            
            print("\n🔍 Let's check if campaigns exist at all...")
            from app.utils.google_api import list_campaigns_for_child
            
            camp_resp = list_campaigns_for_child(token, CUSTOMER_ID, MANAGER_ID, "LAST_30_DAYS")
            if camp_resp and camp_resp.status_code == 200:
                campaigns = camp_resp.json().get("results", [])
                print(f"   ✅ Found {len(campaigns)} campaigns (without date segmentation)")
                if campaigns:
                    sample = campaigns[0]
                    print(f"\n   Sample campaign:")
                    print(f"   - ID: {sample.get('campaign', {}).get('id')}")
                    print(f"   - Name: {sample.get('campaign', {}).get('name')}")
                    print(f"   - Status: {sample.get('campaign', {}).get('status')}")
            else:
                print(f"   ❌ No campaigns found at all")
            
            return
        
        # Show sample record
        print(f"\n7️⃣ Sample record (first result):")
        sample = results[0]
        
        campaign = sample.get("campaign", {})
        segments = sample.get("segments", {})
        metrics = sample.get("metrics", {})
        
        print(f"\n   📅 Date: {segments.get('date', 'MISSING!')}")
        print(f"   📊 Campaign: {campaign.get('name', 'unknown')}")
        print(f"   💰 Cost: {metrics.get('costMicros', 0)} micros")
        print(f"   👆 Clicks: {metrics.get('clicks', 0)}")
        print(f"   👁️  Impressions: {metrics.get('impressions', 0)}")
        
        if not segments.get("date"):
            print("\n   ❌ CRITICAL: Records don't have 'segments.date' field!")
            print("   This is why they're being skipped during save.")
        
        # Check how many have dates
        records_with_dates = sum(1 for r in results if r.get("segments", {}).get("date"))
        print(f"\n8️⃣ Records with valid dates: {records_with_dates}/{len(results)}")
        
        if records_with_dates == 0:
            print("\n❌ PROBLEM: None of the records have date segments!")
            print("   The GAQL query needs to include segments.date")
        elif records_with_dates < len(results):
            print(f"\n⚠️  {len(results) - records_with_dates} records missing dates will be skipped")
        else:
            print(f"\n✅ All records have valid dates - should save successfully!")
        
        # Show full structure
        print(f"\n9️⃣ Full sample record structure:")
        import json
        print(json.dumps(sample, indent=2)[:1000])
        
    except Exception as e:
        print(f"\n❌ Exception occurred: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    debug_google_api_response()