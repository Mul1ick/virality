# FILE: app/services/aggregation_service.py

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
                return "meta_daily_insights"
        # Extendable for Google/Shopify later
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

        # --- Convert user_id safely ---
        try:
            user_object_id = ObjectId(user_id)
        except Exception as e:
            logger.error(f"Invalid user_id for ObjectId: {user_id} ({e})")
            raise HTTPException(status_code=400, detail="Invalid user identifier format.")

        # --- 1. Match Stage ---
        match_stage = {
            "$match": {
                "user_id": user_id,
                "ad_account_id": ad_account_id,
                "platform": platform,
                "date_start": {"$gte": start_date, "$lte": end_date},
            }
        }
        pipeline.append(match_stage)

        # --- 2. Add Fields Stage ---
        pipeline.append({
            "$addFields": {
                "numericSpend": {"$toDouble": {"$ifNull": ["$spend", "0"]}},
                "numericClicks": {"$toInt": {"$ifNull": ["$clicks", "0"]}},
                "numericImpressions": {"$toInt": {"$ifNull": ["$impressions", "0"]}},
            }
        })

        # --- 3. Group Stage ---
        group_id = None
        if group_by == "campaign":
            group_id = "$campaign_id"
        elif group_by == "adset":
            group_id = "$adset_id"
        elif group_by == "ad":
            group_id = "$ad_id"
        elif group_by == "month":
            group_id = {
                "year": {"$year": {"$toDate": "$date_start"}},
                "month": {"$month": {"$toDate": "$date_start"}},
            }
        elif group_by == "date":
            group_id = "$date_start"

        group_stage = {
            "$group": {
                "_id": group_id,
                "totalSpend": {"$sum": "$numericSpend"},
                "totalClicks": {"$sum": "$numericClicks"},
                "totalImpressions": {"$sum": "$numericImpressions"},
                "count": {"$sum": 1},
            }
        }

        # Add metadata fields
        if group_by in ["campaign", "adset", "ad"]:
            name_field = f"{group_by}_name"
            group_stage["$group"][f"{group_by}Name"] = {"$first": f"${name_field}"}

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

        if group_by in ["campaign", "adset", "ad"]:
            project_stage["$project"][f"{group_by}Id"] = "$_id"
            project_stage["$project"][f"{group_by}Name"] = 1
            project_stage["$project"]["startDate"] = 1
            project_stage["$project"]["endDate"] = 1
        elif group_by == "month":
            project_stage["$project"]["yearMonth"] = "$_id"
            project_stage["$project"]["startDate"] = 1
            project_stage["$project"]["endDate"] = 1
        elif group_by == "date":
            project_stage["$project"]["date"] = "$_id"

        pipeline.append(project_stage)

        # --- 5. Sort Stage ---
        sort_field = "totalSpend"
        if group_by in ["month", "date"]:
            sort_field = "_id"
        pipeline.append({"$sort": {sort_field: 1 if group_by in ["month", "date"] else -1}})

        logger.info(f"[AggregationService] Built pipeline for {platform}: {pipeline}")
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

        try:
            results = list(collection.aggregate(pipeline))
            logger.info(f"[Meta Aggregation] Fetched {len(results)} results from {collection_name}")
            return {"collection": collection_name, "count": len(results), "results": results}
        except Exception as e:
            logger.error(f"Meta aggregation error: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Aggregation failed: {str(e)}")
