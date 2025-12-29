"""
Compare the actual data structures between Meta, Google, and Shopify
Shows exactly what fields exist in daily insights for each platform
"""
from app.database.mongo_client import db
import json
from datetime import datetime

USER_ID = "6908ec0d09d20b1eb4a83d55"

def show_sample_doc(collection_name, query):
    """Pretty print a sample document"""
    doc = db[collection_name].find_one(query)
    if doc:
        doc.pop("_id", None)  # Remove MongoDB ID
        print(json.dumps(doc, indent=2, default=str))
        return doc
    else:
        print("   ❌ NO DATA FOUND")
        return None

print("\n" + "="*100)
print("META DAILY CAMPAIGN INSIGHTS - Sample Document")
print("="*100)
meta_conn = db.platform_connections.find_one({"user_id": USER_ID, "platform": "meta"})
if meta_conn and meta_conn.get("ad_account_id"):
    meta_sample = show_sample_doc("meta_daily_campaign_insights", {
        "user_id": USER_ID,
        "platform": "meta",
        "ad_account_id": meta_conn["ad_account_id"]
    })
    
    if meta_sample:
        print("\n✅ META Structure:")
        print(f"   • Has user_id: {bool(meta_sample.get('user_id'))}")
        print(f"   • Has platform: {bool(meta_sample.get('platform'))}")
        print(f"   • Has ad_account_id: {bool(meta_sample.get('ad_account_id'))}")
        print(f"   • Has campaign_id: {bool(meta_sample.get('campaign_id'))}")
        print(f"   • Has date_start: {bool(meta_sample.get('date_start'))}")
        print(f"   • Has spend: {bool(meta_sample.get('spend'))}")
        print(f"   • Has clicks: {bool(meta_sample.get('clicks'))}")
        print(f"   • Has impressions: {bool(meta_sample.get('impressions'))}")
else:
    print("❌ Meta not connected")

print("\n" + "="*100)
print("GOOGLE DAILY CAMPAIGN INSIGHTS - Sample Document")
print("="*100)
google_conn = db.platform_connections.find_one({"user_id": USER_ID, "platform": "google"})
if google_conn and google_conn.get("customer_id"):
    google_sample = show_sample_doc("google_daily_campaign_insights", {
        "user_id": USER_ID,
        "platform": "google",
        "ad_account_id": google_conn["customer_id"]
    })
    
    if google_sample:
        print("\n✅ GOOGLE Structure:")
        print(f"   • Has user_id: {bool(google_sample.get('user_id'))}")
        print(f"   • Has platform: {bool(google_sample.get('platform'))}")
        print(f"   • Has ad_account_id: {bool(google_sample.get('ad_account_id'))}")
        print(f"   • Has campaign_id: {bool(google_sample.get('campaign_id'))}")
        print(f"   • Has date_start: {bool(google_sample.get('date_start'))}")
        print(f"   • Has cost_micros: {bool(google_sample.get('cost_micros'))}")
        print(f"   • Has clicks: {bool(google_sample.get('clicks'))}")
        print(f"   • Has impressions: {bool(google_sample.get('impressions'))}")
        print(f"   • Has conversions: {bool(google_sample.get('conversions'))}")
else:
    print("❌ Google not connected")

print("\n" + "="*100)
print("SHOPIFY DAILY INSIGHTS - Sample Document (EXPECTED)")
print("="*100)
shopify_sample = show_sample_doc("shopify_daily_insights", {
    "user_id": USER_ID,
    "platform": "shopify"
})

if shopify_sample:
    print("\n✅ SHOPIFY Structure:")
    print(f"   • Has user_id: {bool(shopify_sample.get('user_id'))}")
    print(f"   • Has platform: {bool(shopify_sample.get('platform'))}")
    print(f"   • Has date_start: {bool(shopify_sample.get('date_start'))}")
    print(f"   • Has total_revenue: {bool(shopify_sample.get('total_revenue'))}")
    print(f"   • Has order_count: {bool(shopify_sample.get('order_count'))}")
    print(f"   • Has avg_order_value: {bool(shopify_sample.get('avg_order_value'))}")
    print(f"   • Has total_items: {bool(shopify_sample.get('total_items'))}")
else:
    print("\n❌ NO SHOPIFY DAILY INSIGHTS FOUND!")
    print("\nLet's check raw orders instead:")
    print("\n" + "-"*100)
    print("SHOPIFY RAW ORDERS - Sample Document")
    print("-"*100)
    order_sample = show_sample_doc("shopify_orders", {
        "user_id": USER_ID,
        "platform": "shopify"
    })
    
    if order_sample:
        print("\n📦 RAW ORDER Structure:")
        print(f"   • Has user_id: {bool(order_sample.get('user_id'))}")
        print(f"   • Has platform: {bool(order_sample.get('platform'))}")
        print(f"   • Has created_at: {bool(order_sample.get('created_at'))}")
        print(f"   • Has total_price: {bool(order_sample.get('total_price'))}")
        print(f"   • Has line_items: {bool(order_sample.get('line_items'))}")
        
        print("\n🔧 TRANSFORMATION NEEDED:")
        print("   Raw orders need to be transformed into daily insights!")
        print("   The sync endpoint should call transform_orders_to_daily_insights()")
    else:
        print("\n❌ NO ORDERS EITHER!")
        print("   You need to run the sync endpoint first:")
        print(f"   POST /shopify/sync/{USER_ID}")

print("\n" + "="*100)
print("COMPARISON SUMMARY")
print("="*100)

print("\n📊 Daily Insights Pattern:")
print("   META:    user_id + platform + ad_account_id + campaign_id + date_start + metrics")
print("   GOOGLE:  user_id + platform + ad_account_id + campaign_id + date_start + metrics")
print("   SHOPIFY: user_id + platform + date_start + metrics (NO ad_account_id needed!)")

print("\n💡 Key Differences:")
print("   • Meta/Google have ad_account_id because one user can have multiple ad accounts")
print("   • Shopify doesn't need ad_account_id - shop_url is in the connection, not daily data")
print("   • Shopify metrics are revenue-focused (orders, revenue, AOV)")
print("   • Meta/Google metrics are ad-focused (spend, clicks, impressions)")

print("\n🎯 What Shopify Daily Insights SHOULD look like:")
print("""
{
  "user_id": "6908ec0d09d20b1eb4a83d55",
  "platform": "shopify",
  "shop_url": "31fb27-3.myshopify.com",
  "date_start": "2024-11-04",
  "date_end": "2024-11-04",
  "total_revenue": 1250.50,
  "order_count": 15,
  "total_items": 45,
  "avg_order_value": 83.37,
  "order_ids": ["id1", "id2", ...],
  "created_at": "2024-11-04T...",
  "updated_at": "2024-11-04T..."
}
""")

print("\n" + "="*100)