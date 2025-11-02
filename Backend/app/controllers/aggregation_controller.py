# FILE: app/controllers/aggregation_controller.py

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from datetime import date, timedelta
from typing import Optional
from app.database.mongo_client import db

from app.services.aggeregation_service import AggregationService
from app.utils.security import get_current_user_id
from app.utils.logger import get_logger

DATE_RANGE_PRESETS = {
    "today": 0,
    "7days": 6,
    "30days": 29,
    "90days": 89,
}

router = APIRouter(tags=["Data Aggregation"])
logger = get_logger()


class MetaAggregationRequest(BaseModel):
    start_date: date
    end_date: date
    ad_account_id: str
    group_by: Optional[str] = None


class GoogleAggregationRequest(BaseModel):
    start_date: date
    end_date: date
    customer_id: str
    group_by: Optional[str] = None


@router.post("/meta", summary="Aggregate Meta Ads Data")
async def aggregate_meta_data(request: MetaAggregationRequest, user_id: str = Depends(get_current_user_id)):
    """
    Aggregates Meta Ads daily insights by campaign, adset, ad, or time period.
    """
    logger.info(f"[Aggregation] Meta request: user={user_id}, account={request.ad_account_id}, group_by={request.group_by}")

    try:
        raw_result = AggregationService.run_meta_aggregation(
            user_id=user_id,
            ad_account_id=request.ad_account_id,
            start_date=request.start_date,
            end_date=request.end_date,
            group_by=request.group_by,
        )
        results_list = raw_result.get("results", [])
        group_by = request.group_by

        if group_by == "campaign":
            id_field = "campaign_id"
        elif group_by == "adset":
            id_field = "adset_id"
        elif group_by == "ad":
            id_field = "ad_id"
        elif group_by == "date":
            return results_list
        else:
            return results_list
        
        results_dict = {}
        for item in results_list:
            if id_field in item:
                item_id = item.pop(id_field)
                results_dict[item_id] = item

        logger.info(f"[Aggregation] Returned {len(results_dict)} {group_by} insights for account {request.ad_account_id}")
        return results_dict
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Aggregation] Meta aggregation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal aggregation error")


@router.post("/google", summary="Aggregate Google Ads Data")
async def aggregate_google_data(request: GoogleAggregationRequest, user_id: str = Depends(get_current_user_id)):
    """
    Aggregates Google Ads campaign data.
    
    Note: Currently returns totals since daily breakdown isn't stored yet.
    Returns single aggregated result for the date range.
    """
    logger.info(f"[Aggregation] Google request: user={user_id}, customer={request.customer_id}, group_by={request.group_by}")

    try:
        raw_result = AggregationService.run_google_aggregation(
            user_id=user_id,
            customer_id=request.customer_id,
            start_date=request.start_date,
            end_date=request.end_date,
            group_by=request.group_by,
        )
        results_list = raw_result.get("results", [])
        
        # For now, just return the totals (single result)
        if results_list:
            logger.info(f"[Aggregation] Returned Google totals for customer {request.customer_id}")
            return results_list[0]  # Return single aggregated result
        else:
            return {
                "totalSpend": 0,
                "totalClicks": 0,
                "totalImpressions": 0,
                "totalConversions": 0,
                "avgCTR": 0,
                "avgCPC": 0,
                "avgCPM": 0
            }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Aggregation] Google aggregation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal aggregation error")


@router.get("/meta/insights/{level}", summary="Get Aggregated Meta Insights by Level")
async def get_aggregated_meta_insights(
    level: str,
    ad_account_id: str,
    date_preset: str = Query("30days", description="Date range preset"),
    user_id: str = Depends(get_current_user_id)
):
    """
    Aggregates Meta Ads daily insights for a specific level over a preset date range.
    """
    if level not in ["campaign", "adset", "ad"]:
        raise HTTPException(status_code=400, detail="Invalid level. Must be 'campaign', 'adset', or 'ad'.")

    today = date.today()
    days_back = DATE_RANGE_PRESETS.get(date_preset)
    
    if days_back is None:
        if date_preset == "lifetime":
            start_date = today - timedelta(days=int(365*2.5))
        else:
            raise HTTPException(status_code=400, detail=f"Invalid date_preset: {date_preset}")
    else:
        start_date = today - timedelta(days=days_back)
    
    end_date = today

    logger.info(f"[Aggregation] Meta {level} insights: user={user_id}, account={ad_account_id}, range={start_date} to {end_date}")

    try:
        collection_map = {
            "campaign": "meta_daily_campaign_insights",
            "adset": "meta_daily_insights",
            "ad": "meta_daily_ad_insights"
        }
        
        collection = db[collection_map[level]]
        id_field = f"{level}_id"
        group_id_field = f"${id_field}"

        pipeline = [
            {
                "$match": {
                    "user_id": user_id,
                    "ad_account_id": ad_account_id,
                    "platform": "meta",
                    "date_start": {
                        "$gte": start_date.strftime("%Y-%m-%d"),
                        "$lte": end_date.strftime("%Y-%m-%d")
                    }
                }
            },
            {
                "$addFields": {
                    "numericSpend": {"$toDouble": {"$ifNull": ["$spend", "0"]}},
                    "numericClicks": {"$toInt": {"$ifNull": ["$clicks", "0"]}},
                    "numericImpressions": {"$toInt": {"$ifNull": ["$impressions", "0"]}},
                    "numericReach": {"$toInt": {"$ifNull": ["$reach", "0"]}},
                }
            },
            {
                "$group": {
                    "_id": group_id_field,
                    "totalSpend": {"$sum": "$numericSpend"},
                    "totalImpressions": {"$sum": "$numericImpressions"},
                    "totalClicks": {"$sum": "$numericClicks"},
                    "totalReach": {"$sum": "$numericReach"},
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "id": "$_id",
                    "spend": "$totalSpend",
                    "impressions": "$totalImpressions",
                    "clicks": "$totalClicks",
                    "reach": "$totalReach",
                    "ctr": {
                        "$cond": [
                            {"$eq": ["$totalImpressions", 0]},
                            0,
                            {"$multiply": [{"$divide": ["$totalClicks", "$totalImpressions"]}, 100]}
                        ]
                    },
                    "cpm": {
                        "$cond": [
                            {"$eq": ["$totalImpressions", 0]},
                            0,
                            {"$multiply": [{"$divide": ["$totalSpend", "$totalImpressions"]}, 1000]}
                        ]
                    },
                    "cpc": {
                        "$cond": [
                            {"$eq": ["$totalClicks", 0]},
                            0,
                            {"$divide": ["$totalSpend", "$totalClicks"]}
                        ]
                    },
                }
            }
        ]

        results = list(collection.aggregate(pipeline))

        results_dict = {}
        for item in results:
            item_id = item.pop("id")
            results_dict[item_id] = item

        logger.info(f"[Aggregation] Returned {len(results_dict)} {level} insights for account {ad_account_id}")
        return results_dict

    except Exception as e:
        logger.error(f"[Aggregation] Meta {level} insights failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal aggregation error for {level} insights")