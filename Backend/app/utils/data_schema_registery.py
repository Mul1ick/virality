# app/config/data_schema_registry.py

DATA_SCHEMAS = {
    "google_ads": {
        "collection": "google_campaigns",
        "fields": [
            "campaign_name", "ad_name", "impressions", "clicks",
            "ctr", "spend", "cost_micros", "date"
        ],
        "description": "Google Ads performance data per campaign per day."
    },
    "meta_ads": {
        "collection": "meta_campaigns",
        "fields": [
            "campaign_name", "ad_set_name", "impressions", "clicks",
            "spend", "cpc", "ctr", "date"
        ],
        "description": "Meta (Facebook/Instagram) ad performance metrics."
    },
    "shopify": {
        "collection": "shopify_sales",
        "fields": [
            "product_name", "units_sold", "revenue", "discount", "order_date"
        ],
        "description": "Shopify store order and revenue data."
    }
}
