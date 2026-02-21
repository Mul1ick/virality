# FILE: Backend/app/services/aggeregation_service.py

from datetime import date
from typing import Optional, List, Dict, Any
from bson import ObjectId
from fastapi import HTTPException
from app.utils.logger import get_logger
from app.database.mongo_client import db

logger = get_logger()


class AggregationService:
    """Handles MongoDB aggregation logic for all ad platforms."""

    @staticmethod
    def _get_collection_name(platform: str, group_by: Optional[str]) -> str:
        """
        Returns the correct collection name based on platform and grouping.
        """
        if platform == "meta":
            if group_by == "campaign":
                return "meta_daily_campaign_insights"
            elif group_by == "ad":
                return "meta_daily_ad_insights"
            else:
                # ✅ FIXED: Use campaign insights for date grouping (Overview chart)
                return "meta_daily_campaign_insights"
        elif platform == "google":
            if group_by == "campaign":
                return "google_daily_campaign_insights"
            elif group_by == "adgroup":
                return "google_daily_adgroup_insights"
            elif group_by == "ad":
                return "google_daily_ad_insights"
            else:
                return "google_daily_campaign_insights"
        elif platform == "shopify":
            return "shopify_daily_insights"
        raise HTTPException(status_code=400, detail=f"Unsupported platform: {platform}")

    @staticmethod
    def build_pipeline(
        user_id: str,
        ad_account_id: str,
        start_date: str,
        end_date: str,
        group_by: Optional[str],
        platform: str = "meta",
    ) -> List[Dict[str, Any]]:
        """
        Construct a MongoDB aggregation pipeline for insights data.
        """
        pipeline: List[Dict[str, Any]] = []

        # --- 1. Match Stage ---
        if platform == "meta":
            match_stage = {
                "$match": {
                    "user_id": user_id,
                    "ad_account_id": ad_account_id,
                    "platform": platform,
                    "date_start": {"$gte": start_date, "$lte": end_date},
                }
            }
        elif platform == "google":
            match_stage = {
                "$match": {
                    "user_id": user_id,
                    "ad_account_id": ad_account_id,
                    "platform": platform,
                    "date_start": {"$gte": start_date, "$lte": end_date},
                }
            }
        
        logger.info(f"[Pipeline] Match stage: {match_stage}")
        pipeline.append(match_stage)

        # --- 2. Add Fields Stage ---
        if platform == "meta":
            pipeline.append({
                "$addFields": {
                    "numericSpend": {"$toDouble": {"$ifNull": ["$spend", "0"]}},
                    "numericClicks": {"$toInt": {"$ifNull": ["$clicks", "0"]}},
                    "numericImpressions": {"$toInt": {"$ifNull": ["$impressions", "0"]}},
                }
            })
        elif platform == "google":
            # All numeric fields stored as strings — use $toDouble (handles "150", "0", "150.5", etc.)
            pipeline.append({
                "$addFields": {
                    "numericSpend": {
                        "$divide": [
                            {"$toDouble": {"$ifNull": ["$cost_micros", "0"]}},
                            1000000
                        ]
                    },
                    "numericClicks": {
                        "$toDouble": {"$ifNull": ["$clicks", "0"]}
                    },
                    "numericImpressions": {
                        "$toDouble": {"$ifNull": ["$impressions", "0"]}
                    },
                    "numericConversions": {
                        "$toDouble": {"$ifNull": ["$conversions", "0"]}
                    },
                }
            })

        # --- 3. Group Stage ---
        group_id = None
        if group_by == "campaign":
            group_id = "$campaign_id"
        elif group_by == "adset" or group_by == "adgroup":
            group_id = "$adgroup_id" if platform == "google" else "$adset_id"
        elif group_by == "ad":
            group_id = "$ad_id"
        elif group_by == "month":
            group_id = {
                "year": {"$year": {"$toDate": "$date_start"}},
                "month": {"$month": {"$toDate": "$date_start"}},
            }
        elif group_by == "date":
            group_id = "$date_start"

        logger.info(f"[Pipeline] Group by: {group_by}, Group ID: {group_id}")

        group_stage = {
            "$group": {
                "_id": group_id,
                "totalSpend": {"$sum": "$numericSpend"},
                "totalClicks": {"$sum": "$numericClicks"},
                "totalImpressions": {"$sum": "$numericImpressions"},
                "count": {"$sum": 1},
            }
        }

        if platform == "google":
            group_stage["$group"]["totalConversions"] = {"$sum": "$numericConversions"}

        if group_by in ["campaign", "adset", "adgroup", "ad"]:
            if platform == "google":
                if group_by == "campaign":
                    name_field = "campaign_name"
                elif group_by == "adgroup":
                    name_field = "adgroup_name"
                elif group_by == "ad":
                    name_field = "ad_name"
                else:
                    name_field = "name"
            else:
                name_field = f"{group_by}_name"
            
            group_stage["$group"][f"{group_by}Name"] = {"$first": f"${name_field}"}
            logger.info(f"[Pipeline] Adding name field: {name_field}")

        if group_by not in ["date", None]:
            group_stage["$group"]["startDate"] = {"$min": "$date_start"}
            group_stage["$group"]["endDate"] = {"$max": "$date_start"}

        pipeline.append(group_stage)

        # --- 4. Project Stage ---
        project_stage = {
            "$project": {
                "_id": 0,
                "totalSpend": 1,
                "totalClicks": 1,
                "totalImpressions": 1,
                "documentCount": "$count",
                "avgCPC": {
                    "$cond": [
                        {"$eq": ["$totalClicks", 0]},
                        0,
                        {"$divide": ["$totalSpend", "$totalClicks"]},
                    ]
                },
                "avgCPM": {
                    "$cond": [
                        {"$eq": ["$totalImpressions", 0]},
                        0,
                        {"$multiply": [{"$divide": ["$totalSpend", "$totalImpressions"]}, 1000]},
                    ]
                },
                "avgCTR": {
                    "$cond": [
                        {"$eq": ["$totalImpressions", 0]},
                        0,
                        {"$multiply": [{"$divide": ["$totalClicks", "$totalImpressions"]}, 100]},
                    ]
                },
            }
        }

        if platform == "google":
            project_stage["$project"]["totalConversions"] = 1

        if group_by in ["campaign", "adset", "ad"]:
            project_stage["$project"][f"{group_by}Id"] = "$_id"
            project_stage["$project"][f"{group_by}Name"] = 1
        elif group_by == "date":
            project_stage["$project"]["date"] = "$_id"

        pipeline.append(project_stage)

        # --- 5. Sort Stage ---
        sort_field = "totalSpend"
        if group_by == "date":
            sort_field = "date"
        pipeline.append({"$sort": {sort_field: 1 if group_by == "date" else -1}})

        logger.info(f"[Pipeline] Final pipeline stages count: {len(pipeline)}")
        return pipeline

    @staticmethod
    def run_meta_aggregation(
        user_id: str,
        ad_account_id: str,
        start_date: date,
        end_date: date,
        group_by: Optional[str],
    ) -> Dict[str, Any]:
        """
        Executes the Meta Ads aggregation and returns formatted results.
        """
        logger.info(f"[META AGG] Starting - user: {user_id}, account: {ad_account_id}, dates: {start_date} to {end_date}, group: {group_by}")
        
        pipeline = AggregationService.build_pipeline(
            user_id=user_id,
            ad_account_id=ad_account_id,
            start_date=start_date.strftime("%Y-%m-%d"),
            end_date=end_date.strftime("%Y-%m-%d"),
            group_by=group_by,
            platform="meta",
        )

        collection_name = AggregationService._get_collection_name("meta", group_by)
        collection = db[collection_name]
        logger.info(f"[META AGG] Using collection: {collection_name}")

        try:
            results = list(collection.aggregate(pipeline))
            logger.info(f"[META AGG] Raw results count: {len(results)}")
            
            if results:
                logger.info(f"[META AGG] Sample result (first): {results[0]}")
            else:
                logger.warning(f"[META AGG] No results returned!")
            
            return {"collection": collection_name, "count": len(results), "results": results}
        except Exception as e:
            logger.error(f"[META AGG] Error: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Aggregation failed: {str(e)}")

    @staticmethod
    def run_google_aggregation(
        user_id: str,
        customer_id: str,
        start_date: date,
        end_date: date,
        group_by: Optional[str],
    ) -> Dict[str, Any]:
        """
        Executes the Google Ads aggregation and returns formatted results.
        """
        logger.info(f"[GOOGLE AGG] Starting - user: {user_id}, customer: {customer_id}, dates: {start_date} to {end_date}, group: {group_by}")
        
        pipeline = AggregationService.build_pipeline(
            user_id=user_id,
            ad_account_id=customer_id,
            start_date=start_date.strftime("%Y-%m-%d"),
            end_date=end_date.strftime("%Y-%m-%d"),
            group_by=group_by,
            platform="google",
        )

        collection_name = AggregationService._get_collection_name("google", group_by)
        collection = db[collection_name]
        logger.info(f"[GOOGLE AGG] Using collection: {collection_name}")

        try:
            results = list(collection.aggregate(pipeline))
            logger.info(f"[GOOGLE AGG] Raw results count: {len(results)}")
            
            if results:
                logger.info(f"[GOOGLE AGG] Sample result (first): {results[0]}")
            else:
                logger.warning(f"[GOOGLE AGG] No results returned!")
            
            return {"collection": collection_name, "count": len(results), "results": results}
        except Exception as e:
            logger.error(f"[GOOGLE AGG] Error: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Aggregation failed: {str(e)}")

    @staticmethod
    def run_shopify_aggregation(
        user_id: str,
        start_date: date,
        end_date: date,
        group_by: Optional[str] = "date",
    ) -> Dict[str, Any]:
        """
        Executes Shopify aggregation and returns formatted results.
        """
        logger.info(f"[SHOPIFY AGG] Starting - user: {user_id}, dates: {start_date} to {end_date}, group: {group_by}")
        
        collection = db["shopify_daily_insights"]
        logger.info(f"[SHOPIFY AGG] Using collection: shopify_daily_insights")

        pipeline = [
            {
                "$match": {
                    "user_id": user_id,
                    "platform": "shopify",
                    "date_start": {
                        "$gte": start_date.strftime("%Y-%m-%d"),
                        "$lte": end_date.strftime("%Y-%m-%d")
                    }
                }
            }
        ]

        if group_by == "date":
            pipeline.append({
                "$project": {
                    "_id": 0,
                    "date": "$date_start",
                    "totalRevenue": "$total_revenue",
                    "orderCount": "$order_count",
                    "avgOrderValue": "$avg_order_value",
                    "totalItems": "$total_items"
                }
            })
            pipeline.append({"$sort": {"date": 1}})
        else:
            pipeline.extend([
                {
                    "$group": {
                        "_id": None,
                        "totalRevenue": {"$sum": "$total_revenue"},
                        "orderCount": {"$sum": "$order_count"},
                        "totalItems": {"$sum": "$total_items"}
                    }
                },
                {
                    "$project": {
                        "_id": 0,
                        "totalRevenue": 1,
                        "orderCount": 1,
                        "totalItems": 1,
                        "avgOrderValue": {
                            "$cond": [
                                {"$eq": ["$orderCount", 0]},
                                0,
                                {"$divide": ["$totalRevenue", "$orderCount"]}
                            ]
                        }
                    }
                }
            ])

        logger.info(f"[SHOPIFY AGG] Pipeline built with {len(pipeline)} stages")

        try:
            results = list(collection.aggregate(pipeline))
            logger.info(f"[SHOPIFY AGG] Raw results count: {len(results)}")
            
            if results:
                logger.info(f"[SHOPIFY AGG] Sample result (first): {results[0]}")
            else:
                logger.warning(f"[SHOPIFY AGG] No results returned!")
            
            return {"collection": "shopify_daily_insights", "count": len(results), "results": results}
        except Exception as e:
            logger.error(f"[SHOPIFY AGG] Error: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Aggregation failed: {str(e)}")