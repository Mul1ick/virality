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
        elif platform == "google":
            # Google stores in generic "campaigns" collection with platform filter
            return "campaigns"
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
            # Google campaigns collection structure
            # NOTE: Google stores as "ad_account_id" not "customer_id"
            match_stage = {
                "$match": {
                    "platform": platform,
                    "ad_account_id": ad_account_id,  # Use ad_account_id for Google
                }
            }
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
            # Google stores cost in cost_micros (can be string OR number)
            # clicks and impressions are strings
            pipeline.append({
                "$addFields": {
                    # Handle cost_micros as either string or number, then convert to dollars
                    "numericSpend": {
                        "$divide": [
                            {
                                "$cond": [
                                    {"$eq": [{"$type": "$cost_micros"}, "string"]},
                                    {"$toDouble": {"$ifNull": ["$cost_micros", "0"]}},
                                    {"$ifNull": ["$cost_micros", 0]}
                                ]
                            },
                            1000000
                        ]
                    },
                    # Clicks and impressions are strings - convert to int
                    "numericClicks": {
                        "$toInt": {"$ifNull": ["$clicks", "0"]}
                    },
                    "numericImpressions": {
                        "$toInt": {"$ifNull": ["$impressions", "0"]}
                    },
                    "numericConversions": {
                        "$cond": [
                            {"$eq": [{"$type": "$conversions"}, "string"]},
                            {"$toDouble": {"$ifNull": ["$conversions", "0"]}},
                            {"$ifNull": ["$conversions", 0]}
                        ]
                    },
                }
            })

        # --- 3. Group Stage ---
        group_id = None
        if group_by == "campaign":
            group_id = "$campaign_id" if platform == "meta" else "$id"
        elif group_by == "adset":
            group_id = "$adset_id"
        elif group_by == "ad":
            group_id = "$ad_id"
        elif group_by == "date":
            if platform == "meta":
                group_id = "$date_start"
            else:
                # Google doesn't have daily breakdown yet - group all
                group_id = None

        group_stage = {
            "$group": {
                "_id": group_id,
                "totalSpend": {"$sum": "$numericSpend"},
                "totalClicks": {"$sum": "$numericClicks"},
                "totalImpressions": {"$sum": "$numericImpressions"},
                "count": {"$sum": 1},
            }
        }

        # Add conversions for Google
        if platform == "google":
            group_stage["$group"]["totalConversions"] = {"$sum": "$numericConversions"}

        # Add metadata fields
        if group_by in ["campaign", "adset", "ad"]:
            name_field = f"{group_by}_name" if platform == "meta" else "name"
            group_stage["$group"][f"{group_by}Name"] = {"$first": f"${name_field}"}

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
        
        Note: Currently aggregates total metrics since Google campaigns 
        don't have daily breakdown stored yet.
        """
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

        try:
            results = list(collection.aggregate(pipeline))
            logger.info(f"[Google Aggregation] Fetched {len(results)} results from {collection_name}")
            return {"collection": collection_name, "count": len(results), "results": results}
        except Exception as e:
            logger.error(f"Google aggregation error: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Aggregation failed: {str(e)}")