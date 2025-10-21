# app/utils/data_schema_registry.py

DATA_SCHEMAS = {
    "google_campaigns": {
        "collection": "campaigns",
        "fields": [
            "id", "name", "status", "advertisingChannelType", "biddingStrategyType",
            "startDate", "endDate", "clicks", "impressions", "costMicros", "conversions",
            "amountMicros", "platform"
        ],
        "description": "Top-level Google Ads campaigns. Use this for questions about overall campaign performance, budgets, and strategy."
    },
    "google_adsets": {
        "collection": "adsets",
        "fields": [
            "id", "name", "status", "type", "clicks", "impressions", "costMicros",
            "conversions", "platform"
        ],
        "description": "Ad Groups (called Ad Sets for consistency with Meta) from Google Ads. Use this for questions about groups of ads."
    },
    "google_ads": {
        "collection": "ads",
        "fields": [
            "id", "name", "status", "type", "finalUrls", "clicks", "impressions",
            "costMicros", "ctr", "platform"
        ],
        "description": "Individual ads from Google Ads. Use this for questions about specific ad performance, types (e.g., responsive search), or final URLs."
    },
    "meta": {
        "collection": "campaigns",
        "fields": [
            "id", "name", "status", "objective",
            "insights.spend", "insights.impressions", "insights.reach",
            "insights.frequency", "insights.cpm", "insights.inline_link_clicks",
            "insights.ctr", "ad_account_id", "platform"
        ],
        "description": "Meta campaigns with performance insights for the last 30 days."
    },
    "shopify": {
        "collection": "shopify_sales",
        "fields": [
            "product_name", "units_sold", "revenue", "discount", "order_date"
        ],
        "description": "Shopify store order and revenue data."
    }
}
