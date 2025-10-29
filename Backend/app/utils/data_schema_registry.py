DATA_SCHEMAS = {
    "google_campaigns": {
        "collection": "campaigns",
        "fields": [
            "id", "name", "status", "advertisingChannelType", "biddingStrategyType",
            "startDate", "endDate", "clicks", "impressions", "costMicros", "conversions",
            "amountMicros", "platform"
        ],
        "description": "Top-level Google Ads campaigns. Use this for questions about overall campaign performance, budgets, and strategy.",
        "field_examples": {
            "status": ["ENABLED", "PAUSED"],
            "advertisingChannelType": ["SEARCH", "DISPLAY"],
            "clicks": [100, 2500, 12340],
            "impressions": [2000, 45000, 120000],
            "costMicros": [5000000, 20000000],
        },
    },

    "google_adsets": {
        "collection": "adsets",
        "fields": [
            "id", "name", "status", "type", "clicks", "impressions", "costMicros",
            "conversions", "platform"
        ],
        "description": "Ad Groups (called Ad Sets for consistency with Meta) from Google Ads. Use this for questions about groups of ads.",
        "field_examples": {
            "status": ["ENABLED", "PAUSED"],
            "type": ["SEARCH_STANDARD"],
            "clicks": [10, 250],
            "impressions": [1000, 12000],
        },
    },

    "google_ads": {
        "collection": "ads",
        "fields": [
            "id", "name", "status", "type", "finalUrls", "clicks", "impressions",
            "costMicros", "ctr", "platform"
        ],
        "description": "Individual ads from Google Ads. Use this for questions about specific ad performance, ad type, or destination URLs.",
        "field_examples": {
            "type": ["RESPONSIVE_SEARCH_AD", "IMAGE_AD"],
            "finalUrls": ["https://example.com/product"],
            "ctr": [1.2, 2.4, 5.8],
        },
    },

    "meta": {
        "collection": "campaigns",
        "fields": [
            "id", "name", "status", "objective",
            "insights.spend", "insights.impressions", "insights.reach",
            "insights.frequency", "insights.cpm", "insights.inline_link_clicks",
            "insights.ctr", "ad_account_id", "platform"
        ],
        "description": "Meta campaigns with performance insights for the last 30 days.",
        "field_examples": {
            "objective": ["CONVERSIONS", "TRAFFIC", "AWARENESS"],
            "status": ["ACTIVE", "PAUSED"],
            "insights.spend": [50.0, 200.0, 1200.5],
            "insights.impressions": [5000, 20000],
        },
    },

    "shopify": {
        "collection": "shopify_sales",
        "fields": [
            "product_name", "units_sold", "revenue", "discount", "order_date"
        ],
        "description": "Shopify store order and revenue data.",
        "field_examples": {
            "product_name": ["T-shirt", "Shoes", "Laptop Bag"],
            "units_sold": [5, 25, 100],
            "revenue": [5000.0, 12000.0, 25000.0],
            "order_date": ["2025-10-25"],
        },
    },
}
