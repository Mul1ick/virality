"""
Utility script to verify Shopify data structure in MongoDB
Run this after syncing to ensure data is properly stored
"""

from app.database.mongo_client import db
from app.utils.logger import get_logger
from datetime import datetime

logger = get_logger()


def verify_shopify_collections(user_id: str):
    """
    Verify all Shopify collections have proper structure
    """
    print("\n" + "="*80)
    print("SHOPIFY DATA VERIFICATION")
    print("="*80)
    print(f"User ID: {user_id}\n")
    
    collections = [
        "shopify_orders",
        "shopify_products", 
        "shopify_customers",
        "shopify_daily_insights"
    ]
    
    for coll_name in collections:
        print(f"\n📊 Collection: {coll_name}")
        print("-" * 80)
        
        collection = db[coll_name]
        
        # Count total documents
        total = collection.count_documents({"user_id": user_id})
        print(f"   Total documents: {total}")
        
        if total == 0:
            print("   ⚠️  NO DATA FOUND!")
            continue
        
        # Count with platform field
        with_platform = collection.count_documents({
            "user_id": user_id,
            "platform": "shopify"
        })
        print(f"   With platform='shopify': {with_platform}")
        
        if with_platform != total:
            print(f"   ⚠️  WARNING: {total - with_platform} documents missing platform field!")
        
        # Show sample document
        sample = collection.find_one({"user_id": user_id})
        if sample:
            print(f"\n   📄 Sample document keys:")
            for key in sorted(sample.keys()):
                if key != "_id":
                    value = sample[key]
                    value_str = str(value)[:50] + "..." if len(str(value)) > 50 else str(value)
                    print(f"      - {key}: {value_str}")
        
        # For daily insights, show date range
        if coll_name == "shopify_daily_insights" and total > 0:
            dates = collection.find(
                {"user_id": user_id},
                {"date_start": 1}
            ).sort("date_start", 1)
            
            dates_list = [d["date_start"] for d in dates]
            if dates_list:
                print(f"\n   📅 Date range:")
                print(f"      Earliest: {dates_list[0]}")
                print(f"      Latest: {dates_list[-1]}")
                print(f"      Total days: {len(dates_list)}")
                
                # Show revenue summary
                pipeline = [
                    {"$match": {"user_id": user_id}},
                    {"$group": {
                        "_id": None,
                        "totalRevenue": {"$sum": "$total_revenue"},
                        "totalOrders": {"$sum": "$order_count"}
                    }}
                ]
                summary = list(collection.aggregate(pipeline))
                if summary:
                    s = summary[0]
                    print(f"\n   💰 Revenue summary:")
                    print(f"      Total revenue: ${s['totalRevenue']:,.2f}")
                    print(f"      Total orders: {s['totalOrders']:,}")
                    print(f"      Avg order value: ${s['totalRevenue']/s['totalOrders']:,.2f}")
    
    print("\n" + "="*80)
    print("VERIFICATION COMPLETE")
    print("="*80 + "\n")


def check_date_formats(user_id: str):
    """
    Check if all dates in orders are properly formatted
    """
    print("\n🔍 Checking date formats in shopify_orders...")
    
    collection = db["shopify_orders"]
    
    # Sample some orders to check date format
    samples = collection.find({"user_id": user_id}).limit(10)
    
    for order in samples:
        created_at = order.get("created_at")
        order_id = order.get("id", "unknown")
        
        print(f"   Order {order_id}:")
        print(f"      created_at: {created_at}")
        print(f"      type: {type(created_at)}")
        
        try:
            if isinstance(created_at, str):
                parsed = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                print(f"      ✅ Parsed: {parsed.strftime('%Y-%m-%d')}")
            elif isinstance(created_at, datetime):
                print(f"      ✅ Already datetime: {created_at.strftime('%Y-%m-%d')}")
            else:
                print(f"      ❌ Invalid format!")
        except Exception as e:
            print(f"      ❌ Error parsing: {e}")
        print()


def compare_with_raw_orders(user_id: str):
    """
    Compare daily insights totals with raw orders to verify accuracy
    """
    print("\n🔬 Comparing daily insights with raw orders...")
    
    orders_coll = db["shopify_orders"]
    insights_coll = db["shopify_daily_insights"]
    
    # Get totals from raw orders
    orders_total = orders_coll.count_documents({"user_id": user_id})
    
    # Get totals from daily insights
    insights = list(insights_coll.find({"user_id": user_id}))
    insights_order_count = sum(i.get("order_count", 0) for i in insights)
    insights_revenue = sum(i.get("total_revenue", 0) for i in insights)
    
    print(f"   Raw orders count: {orders_total}")
    print(f"   Daily insights order count: {insights_order_count}")
    print(f"   Daily insights total revenue: ${insights_revenue:,.2f}")
    
    if orders_total == insights_order_count:
        print("   ✅ Counts match perfectly!")
    else:
        print(f"   ⚠️  Mismatch: {abs(orders_total - insights_order_count)} orders difference")
    
    # Calculate revenue from raw orders to compare
    pipeline = [
        {"$match": {"user_id": user_id}},
        {
            "$group": {
                "_id": None,
                "totalRevenue": {
                    "$sum": {"$toDouble": {"$ifNull": ["$total_price", "0"]}}
                }
            }
        }
    ]
    
    raw_revenue = list(orders_coll.aggregate(pipeline))
    if raw_revenue:
        raw_rev_value = raw_revenue[0]["totalRevenue"]
        print(f"   Raw orders total revenue: ${raw_rev_value:,.2f}")
        
        if abs(raw_rev_value - insights_revenue) < 0.01:
            print("   ✅ Revenue matches perfectly!")
        else:
            diff = abs(raw_rev_value - insights_revenue)
            print(f"   ⚠️  Revenue mismatch: ${diff:,.2f} difference")


if __name__ == "__main__":
    # Replace with your test user ID
    TEST_USER_ID = "6908ec0d09d20b1eb4a83d55"
    
    verify_shopify_collections(TEST_USER_ID)
    check_date_formats(TEST_USER_ID)
    compare_with_raw_orders(TEST_USER_ID)