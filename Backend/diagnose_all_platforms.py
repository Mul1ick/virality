"""
COMPLETE PLATFORM DIAGNOSTIC (improved)
- Checks both platform_connections collection and users.connected_platforms
- Handles user_id as string or ObjectId
- Extracts sensible fallback fields for each platform (meta/google/shopify)
"""
from app.database.mongo_client import db
from bson import ObjectId
from pprint import pprint
import json

USER_ID = "690f4264056b264890d65b1b"

def print_section(title):
    print("\n" + "="*100)
    print(f"  {title}")
    print("="*100)

# ---------------- user_id helpers (try string and ObjectId) -----------------------
def build_user_filters(user_id, platform=None):
    filters = []
    base = {"user_id": user_id}
    if platform:
        base["platform"] = platform
    filters.append(base)

    # ObjectId form
    try:
        oid = ObjectId(user_id)
        base_oid = {"user_id": oid}
        if platform:
            base_oid["platform"] = platform
        if base_oid not in filters:
            filters.append(base_oid)
    except Exception:
        pass

    return filters

def find_one_any(collection, user_id, platform=None):
    filters = build_user_filters(user_id, platform)
    for f in filters:
        doc = collection.find_one(f)
        if doc:
            return doc, f
    return None, None

def count_documents_any(collection, user_id, platform=None):
    filters = build_user_filters(user_id, platform)
    counts = {}
    total = 0
    for f in filters:
        c = collection.count_documents(f)
        counts[str(f)] = c
        total += c
    return total, counts

def find_many_any(collection, user_id, platform=None, limit=2):
    filters = build_user_filters(user_id, platform)
    for f in filters:
        cursor = collection.find(f).limit(limit)
        docs = list(cursor)
        if docs:
            return docs, f
    return [], None
# -------------------------------------------------------------------------------

# ---------------- get connection from either place -----------------------------
def get_connection_info(user_id, platform):
    """
    Try to fetch a single unified connection dict for a platform.
    Search order:
     1. platform_connections collection (by user_id)
     2. users collection -> connected_platforms.<platform>
    Returns: (conn_dict_or_None, source_string)
    """
    # 1) platform_connections collection
    pcoll = db.platform_connections
    conn, used_filter = find_one_any(pcoll, user_id, platform)
    if conn:
        return conn, f"platform_connections (matched {used_filter})"

    # 2) users collection
    users = db.users
    # try find user document by _id (ObjectId) or by string _id
    user_doc = None
    try:
        user_doc = users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        user_doc = users.find_one({"_id": user_id})

    # fallback: maybe users stored user_id as field 'user_id' rather than _id
    if not user_doc:
        user_doc, _ = find_one_any(users, user_id, None)

    if user_doc:
        cp = user_doc.get("connected_platforms") or user_doc.get("connectedPlatforms") or {}
        if isinstance(cp, dict):
            platform_obj = cp.get(platform)
            if platform_obj:
                return platform_obj, "users.connected_platforms"
    return None, None
# -------------------------------------------------------------------------------

def check_platform_connection(platform):
    """Check if platform is connected (works with platform_connections or users.connected_platforms)"""
    conn, src = get_connection_info(USER_ID, platform)
    if conn:
        print(f"✅ {platform.upper()} CONNECTED (source: {src})")
        # Best-effort access token check
        if isinstance(conn, dict):
            has_token = False
            for tok_key in ("access_token", "token", "oauth_token"):
                if conn.get(tok_key):
                    has_token = True
                    break
            print(f"   Access token: {'✅' if has_token else '❌'}")

            # Platform specific prints
            if platform == "meta":
                # Meta may store ad_account_id directly
                ad_account = conn.get("ad_account_id") or conn.get("adAccountId") or conn.get("ad_account")
                print(f"   Ad account: {ad_account or 'N/A'}")
            elif platform == "google":
                # Google may store customer_id, client_customer_id, or accounts[] with client_customer_id
                cid = conn.get("customer_id") or conn.get("client_customer_id") or conn.get("clientCustomerId") or conn.get("ad_account_id")
                if not cid and isinstance(conn.get("accounts"), list):
                    for a in conn.get("accounts"):
                        if a.get("client_customer_id") or a.get("clientCustomerId"):
                            cid = a.get("client_customer_id") or a.get("clientCustomerId")
                            break
                print(f"   Customer ID: {cid or 'N/A'}")
            elif platform == "shopify":
                shop_url = conn.get("shop_url") or conn.get("shopUrl") or conn.get("shop")
                print(f"   Shop URL: {shop_url or 'N/A'}")
        return True
    else:
        print(f"❌ {platform.upper()} NOT CONNECTED (checked platform_connections and users.connected_platforms)")
        return False


def analyze_collection(collection_name, user_id, platform=None, limit=2):
    """Deep dive into a collection"""
    collection = db[collection_name]
    count_with, counts_with_detail = count_documents_any(collection, user_id, platform)
    count_without, counts_without_detail = count_documents_any(collection, user_id, None)

    print(f"\n📊 {collection_name}")
    print("-" * 100)
    print(f"   Total documents (with platform='{platform}'): {count_with}")
    for k, v in counts_with_detail.items():
        print(f"      · count for {k}: {v}")

    if count_without != count_with:
        print(f"   ⚠️  Total documents (without platform filter): {count_without}")
        for k, v in counts_without_detail.items():
            print(f"      · count (no platform) for {k}: {v}")

    if count_with == 0:
        print(f"   ❌ NO DATA FOUND!")
        return None

    samples, used_filter = find_many_any(collection, user_id, platform, limit)
    if samples:
        print(f"\n   📄 Sample document structure (sampled using filter: {used_filter}):")
        first = samples[0]
        for key in sorted(first.keys()):
            if key == "_id":
                continue
            value = first[key]
            if isinstance(value, (dict, list)):
                try:
                    value_len = len(value)
                except Exception:
                    value_len = "?"
                value_str = f"{type(value).__name__} ({value_len} items)"
            else:
                vs = str(value)
                value_str = vs[:60] + ("..." if len(vs) > 60 else "")
            print(f"      • {key}: {value_str}")

        # Field validation (same maps you had)
        print(f"\n   🔍 Field validation:")
        required_fields = {
            "meta_daily_campaign_insights": ["user_id", "platform", "ad_account_id", "campaign_id", "date_start", "spend", "clicks", "impressions"],
            "meta_daily_insights": ["user_id", "platform", "ad_account_id", "adset_id", "date_start", "spend", "clicks", "impressions"],
            "meta_daily_ad_insights": ["user_id", "platform", "ad_account_id", "ad_id", "date_start", "spend", "clicks", "impressions"],
            "google_daily_campaign_insights": ["user_id", "platform", "ad_account_id", "campaign_id", "date_start", "cost_micros", "clicks", "impressions"],
            "google_daily_adgroup_insights": ["user_id", "platform", "ad_account_id", "adgroup_id", "date_start", "cost_micros", "clicks", "impressions"],
            "google_daily_ad_insights": ["user_id", "platform", "ad_account_id", "ad_id", "date_start", "cost_micros", "clicks", "impressions"],
            "shopify_daily_insights": ["user_id", "platform", "date_start", "total_revenue", "order_count", "avg_order_value"],
            "shopify_orders": ["user_id", "platform", "created_at", "total_price"],
        }

        if collection_name in required_fields:
            missing = [f for f in required_fields[collection_name] if f not in first]
            if missing:
                print(f"      ⚠️  Missing required fields: {missing}")
            else:
                print(f"      ✅ All required fields present")

        # Date range
        if "daily" in collection_name or collection_name == "shopify_orders":
            date_field = "date_start" if "date_start" in first else ("created_at" if "created_at" in first else None)
            if date_field:
                q = used_filter or {"user_id": user_id}
                try:
                    cursor = collection.find(q, {date_field: 1}).sort(date_field, 1)
                    dates_list = [d.get(date_field) for d in cursor if d.get(date_field)]
                    if dates_list:
                        print(f"\n   📅 Date range ({date_field}):")
                        print(f"      Earliest: {dates_list[0]}")
                        print(f"      Latest: {dates_list[-1]}")
                        print(f"      Total days: {len(set(dates_list))}")
                except Exception as exc:
                    print(f"      ⚠️  Could not compute date range: {exc}")
            else:
                print("      ⚠️  No known date field present in sample to compute range.")
        return samples[0]
    return None


def diagnose_meta():
    print_section("META ADS PLATFORM")
    if not check_platform_connection("meta"):
        return

    conn, src = get_connection_info(USER_ID, "meta")
    ad_account_id = None
    if conn:
        ad_account_id = conn.get("ad_account_id") or conn.get("adAccountId") or conn.get("ad_account")
    if not ad_account_id:
        print("⚠️  No ad_account_id found in connection! (checked connected_platforms and platform_connections)")
        # even if missing, continue to inspect collections
    else:
        print(f"\n🎯 Using ad_account_id: {ad_account_id}")

    collections = [
        "campaigns",
        "adsets",
        "ads",
        "meta_daily_campaign_insights",
        "meta_daily_insights",
        "meta_daily_ad_insights"
    ]
    for coll in collections:
        analyze_collection(coll, USER_ID, "meta")


def diagnose_google():
    print_section("GOOGLE ADS PLATFORM")
    if not check_platform_connection("google"):
        return

    conn, src = get_connection_info(USER_ID, "google")
    customer_id = None
    if conn:
        # many possible keys
        customer_id = (
            conn.get("customer_id")
            or conn.get("client_customer_id")
            or conn.get("clientCustomerId")
            or conn.get("ad_account_id")
            or conn.get("client_customer_id")  # fallback
        )
        # accounts array fallback
        if not customer_id and isinstance(conn.get("accounts"), list):
            for a in conn.get("accounts"):
                customer_id = a.get("client_customer_id") or a.get("clientCustomerId") or customer_id
                if customer_id:
                    break
    if not customer_id:
        print("⚠️  No customer_id (or equivalent) found in connection!")
        print("   Connection sample keys:", list(conn.keys()) if conn else "no conn")
        # continue inspecting collections anyway
    else:
        print(f"\n🎯 Using customer_id: {customer_id}")

    collections = [
        "google_campaigns",
        "google_adgroups",
        "google_ads",
        "google_daily_campaign_insights",
        "google_daily_adgroup_insights",
        "google_daily_ad_insights"
    ]
    for coll in collections:
        analyze_collection(coll, USER_ID, "google")


def diagnose_shopify():
    print_section("SHOPIFY PLATFORM")
    if not check_platform_connection("shopify"):
        return

    conn, src = get_connection_info(USER_ID, "shopify")
    shop_url = None
    if conn:
        shop_url = conn.get("shop_url") or conn.get("shopUrl") or conn.get("shop")
    if not shop_url:
        print("⚠️  No shop_url found in connection!")
    else:
        print(f"\n🎯 Using shop_url: {shop_url}")

    collections = [
        "shopify_orders",
        "shopify_products",
        "shopify_customers",
        "shopify_daily_insights"
    ]
    for coll in collections:
        analyze_collection(coll, USER_ID, "shopify")

    orders_count, _ = count_documents_any(db.shopify_orders, USER_ID, "shopify")
    insights_count, _ = count_documents_any(db.shopify_daily_insights, USER_ID, "shopify")

    print(f"\n⚖️  Data consistency check:")
    print(f"   Raw orders: {orders_count}")
    print(f"   Daily insights: {insights_count}")

    if orders_count > 0 and insights_count == 0:
        print(f"   ❌ PROBLEM: Orders exist but daily insights were NOT created!")
        print(f"   🔧 FIX: The sync endpoint should call transform_orders_to_daily_insights()")
    elif orders_count > 0 and insights_count > 0:
        print(f"   ✅ Good: Both raw orders and daily insights exist")
    elif orders_count == 0:
        print(f"   ⚠️  No orders found - need to run sync endpoint first")


def test_aggregation_queries():
    print_section("AGGREGATION QUERY SIMULATION")

    # META
    print("\n🔍 META aggregation query:")
    meta_conn, _ = get_connection_info(USER_ID, "meta")
    if meta_conn:
        ad_account_id = meta_conn.get("ad_account_id") or meta_conn.get("adAccountId")
        if ad_account_id:
            query = {
                "user_id": USER_ID,
                "ad_account_id": ad_account_id,
                "platform": "meta",
                "date_start": {"$gte": "2024-11-01", "$lte": "2024-11-09"}
            }
            print(f"   Query: {query}")
            print(f"   Results: {db.meta_daily_campaign_insights.count_documents(query)} documents")
        else:
            print("   ⚠️  No ad_account_id to build query")
    else:
        print("   ❌ Cannot test - no meta connection")

    # GOOGLE
    print("\n🔍 GOOGLE aggregation query:")
    google_conn, _ = get_connection_info(USER_ID, "google")
    if google_conn:
        customer_id = (
            google_conn.get("customer_id")
            or google_conn.get("client_customer_id")
            or google_conn.get("clientCustomerId")
            or google_conn.get("ad_account_id")
        )
        # try accounts array
        if not customer_id and isinstance(google_conn.get("accounts"), list):
            for a in google_conn.get("accounts"):
                customer_id = a.get("client_customer_id") or a.get("clientCustomerId") or customer_id
                if customer_id:
                    break

        if customer_id:
            query = {
                "user_id": USER_ID,
                "ad_account_id": customer_id,
                "platform": "google",
                "date_start": {"$gte": "2024-11-01", "$lte": "2024-11-09"}
            }
            print(f"   Query: {query}")
            print(f"   Results: {db.google_daily_campaign_insights.count_documents(query)} documents")
        else:
            print("   ⚠️  No customer_id to build query (checked accounts array and top-level keys)")
    else:
        print("   ❌ Cannot test - no google connection")

    # SHOPIFY
    print("\n🔍 SHOPIFY aggregation query:")
    shop_conn, _ = get_connection_info(USER_ID, "shopify")
    if shop_conn:
        query = {
            "user_id": USER_ID,
            "platform": "shopify",
            "date_start": {"$gte": "2024-11-01", "$lte": "2024-11-09"}
        }
        print(f"   Query: {query}")
        print(f"   Results: {db.shopify_daily_insights.count_documents(query)} documents")
    else:
        print("   ❌ Cannot test - no shopify connection")


def main():
    print("\n")
    print("╔" + "="*98 + "╗")
    print("║" + " "*30 + "PLATFORM DIAGNOSTIC TOOL" + " "*44 + "║")
    print("╚" + "="*98 + "╝")
    print(f"\nUser ID: {USER_ID}\n")

    diagnose_meta()
    diagnose_google()
    diagnose_shopify()
    test_aggregation_queries()

    print("\n")
    print("╔" + "="*98 + "╗")
    print("║" + " "*38 + "DIAGNOSIS COMPLETE" + " "*42 + "║")
    print("╚" + "="*98 + "╝")
    print()


if __name__ == "__main__":
    main()
