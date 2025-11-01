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
        "collection": "meta_daily_campaign_insights",
        "fields": [
            "campaign_id", "campaign_name", "date_start", "date_stop",
            "spend", "impressions", "reach", "clicks", "ctr", "cpm", "cpc",
            "ad_account_id", 
        ],
        "description": "Meta campaigns with daily performance insights. Use this for questions about daily campaign spend, clicks, etc.",
        "field_examples": {
            "campaign_name": ["Holiday Sale Campaign", "Spring Promo"],
            "status": ["ACTIVE", "PAUSED"],
            "spend": [50.0, 200.0, 1200.5],
            "impressions": [5000, 20000],
            "date_start": ["2025-10-20", "2025-10-21"]
        },
    },

    "meta_adsets": {
        "collection": "meta_daily_insights",
        "fields": [
            "adset_id", "adset_name", "campaign_id","campaign_name", "date_start", "date_stop",
            "spend", "impressions", "reach", "clicks", "ctr", "cpm", "cpc",
            "ad_account_id", 
        ],
        "description": "Meta Ad Sets (groups of ads) with daily performance insights.",
        "field_examples": {
            "campaign_name": ["Holiday Sale Campaign", "Spring Promo"],
            "adset_name": ["Lookalike Audience 1", "Retargeting US"],
            "spend": [50.0, 200.0],
            "clicks": [10, 150],
            "date_start": ["2025-10-20", "2025-10-21"]
        }
    },

    "meta_ads": {
        "collection": "meta_daily_ad_insights",
        "fields": [
            "ad_id", "ad_name", "adset_id", "campaign_id","campaign_name", "date_start", "date_stop",
            "spend", "impressions", "reach", "clicks", "ctr", "cpm", "cpc",
            "ad_account_id", 
        ],
        "description": "Individual Meta Ads with daily performance insights.",
        "field_examples": {
            "campaign_name": ["Holiday Sale Campaign", "Spring Promo"],
            "ad_name": ["Video Ad 1 - Blue", "Carousel Ad - Main"],
            "spend": [10.0, 50.0],
            "ctr": [1.5, 3.2],
            "date_start": ["2025-10-20", "2025-10-21"]
        }
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
