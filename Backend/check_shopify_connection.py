"""
Check Shopify connection in BOTH possible locations
"""
from app.database.mongo_client import db
from pprint import pprint
from bson import ObjectId

USER_ID = "6908ec0d09d20b1eb4a83d55"

print("\n" + "="*80)
print("CHECKING SHOPIFY CONNECTION (ALL LOCATIONS)")
print("="*80)

# Check 1: Separate platform_connections collection
print("\n🔍 Location 1: platform_connections collection")
print("-" * 80)
connection = db.platform_connections.find_one({
    "user_id": USER_ID,
    "platform": "shopify"
})

if connection:
    print("✅ Found in platform_connections!")
    print(f"  Shop URL: {connection.get('shop_url')}")
    print(f"  Has access token: {'✅' if connection.get('access_token') else '❌'}")
else:
    print("❌ NOT found in platform_connections")

# Check 2: Embedded in users collection
print("\n🔍 Location 2: users.connected_platforms.shopify")
print("-" * 80)
user = db.users.find_one({"_id": ObjectId(USER_ID)})

if user and user.get("connected_platforms", {}).get("shopify"):
    shopify_data = user["connected_platforms"]["shopify"]
    print("✅ Found in users collection!")
    print(f"  Shop URL: {shopify_data.get('shop_url')}")
    print(f"  Has access token: {'✅' if shopify_data.get('access_token') else '❌'}")
    print(f"  Connected: {shopify_data.get('connected', False)}")
    print(f"  Connected at: {shopify_data.get('connected_at', 'N/A')}")
    
    # THIS IS THE PROBLEM: Data is here but service looks in platform_connections!
    print("\n⚠️  DATA STRUCTURE MISMATCH DETECTED!")
    print("   Your Shopify connection exists in users.connected_platforms")
    print("   But the service is looking in platform_connections collection!")
    print("\n🔧 FIX: We need to migrate the data OR update the service")
    
else:
    print("❌ NOT found in users collection")

print("\n" + "="*80)
print("DIAGNOSIS")
print("="*80)

if user and user.get("connected_platforms", {}).get("shopify"):
    print("✅ You HAVE a Shopify connection, it's just in the wrong place!")
    print("\n📋 Two options to fix this:")
    print("\n   Option 1: Migrate data to platform_connections (recommended)")
    print("   Option 2: Update service to read from users.connected_platforms")
    print("\nLet me create a migration script for you...")
else:
    print("❌ No Shopify connection found anywhere")
    print("   You need to complete OAuth first")

print("="*80 + "\n")