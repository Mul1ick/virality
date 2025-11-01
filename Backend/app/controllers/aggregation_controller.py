# FILE: app/controllers/aggregation_controller.py

from fastapi import APIRouter, Depends, HTTPException,Query
from pydantic import BaseModel
from datetime import date,timedelta
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
    # "lifetime" might need special handling or a very large range
}

router = APIRouter( tags=["Data Aggregation"])
logger = get_logger()


class MetaAggregationRequest(BaseModel):
    start_date: date
    end_date: date
    ad_account_id: str
    group_by: Optional[str] = None


@router.post("/meta", summary="Aggregate Meta Ads Data")
async def aggregate_meta_data(request: MetaAggregationRequest, user_id: str = Depends(get_current_user_id)):
    """
    Aggregates Meta Ads daily insights by campaign, adset, ad, or time period.
    """
    logger.info(f"Meta aggregation request: user={user_id}, account={request.ad_account_id}, group_by={request.group_by}")

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
            id_field = "campaignId"
        elif group_by == "adset":
            id_field = "adsetId"
        elif group_by == "ad":
            id_field = "adId"
        else:
            # If no group_by (e.g., 'date'), just return the list
            return results_list
        
        results_dict = {item[id_field]: item for item in results_list if id_field in item}

        logger.info(f"Aggregated {len(results_dict)} {group_by} insights for account {request.ad_account_id}")
        return results_dict
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Meta aggregation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal aggregation error")
    


@router.get("/meta/insights/{level}", summary="Get Aggregated Meta Insights by Level")
async def get_aggregated_meta_insights(
    level: str, # 'campaign', 'adset', or 'ad'
    ad_account_id: str,
    date_preset: str = Query("30days", description="Date range preset (e.g., '7days', '30days')"),
    user_id: str = Depends(get_current_user_id)
):
    """
    Aggregates Meta Ads daily insights for a specific level (campaign, adset, ad)
    over a predefined date range (e.g., last 30 days) and returns results
    grouped by their respective IDs.
    """
    if level not in ["campaign", "adset", "ad"]:
        raise HTTPException(status_code=400, detail="Invalid level. Must be 'campaign', 'adset', or 'ad'.")

    # Calculate start and end dates from preset
    today = date.today()
    days_back = DATE_RANGE_PRESETS.get(date_preset)
    if days_back is None and date_preset != "lifetime": # Handle 'lifetime' if needed later
         raise HTTPException(status_code=400, detail=f"Invalid date_preset: {date_preset}")

    # For now, let's treat lifetime as a large fixed range or handle differently if needed
    if date_preset == "lifetime":
        # Example: Go back 2.5 years as per historical fetch
        start_date = today - timedelta(days=int(365*2.5))
    else:
        start_date = today - timedelta(days=days_back)
    end_date = today

    logger.info(f"Meta insight aggregation request: user={user_id}, account={ad_account_id}, level={level}, range={start_date} to {end_date}")

    try:
        # Use a simplified aggregation pipeline directly here or adapt AggregationService
        collection_name = f"meta_daily_{level}_insights" if level != 'adset' else "meta_daily_insights" # Adjust collection name logic
        collection = db[collection_name]

        group_id_field = f"${level}_id"
        id_field = f"{level}_id"

        pipeline = [
            {
                "$match": {
                    # Assuming user_id is stored as ObjectId in daily collections
                    # If not, adjust the query
                    # "user_id": ObjectId(user_id), # Need ObjectId from bson if stored like this
                    "user_id": user_id, # If stored as string
                    "ad_account_id": ad_account_id,
                    "platform": "meta",
                    "date_start": {
                        "$gte": start_date.strftime("%Y-%m-%d"),
                        "$lte": end_date.strftime("%Y-%m-%d")
                    }
                }
            },
            {
                # Convert potential string numbers to actual numbers
                "$addFields": {
                    "numericSpend": {"$toDouble": {"$ifNull": ["$spend", "0"]}},
                    "numericClicks": {"$toInt": {"$ifNull": ["$clicks", "0"]}}, # Assuming clicks are whole numbers
                    "numericImpressions": {"$toInt": {"$ifNull": ["$impressions", "0"]}},
                    "numericReach": {"$toInt": {"$ifNull": ["$reach", "0"]}},
                    # Add other metrics needing conversion
                }
            },
            {
                "$group": {
                    "_id": group_id_field,
                    "totalSpend": {"$sum": "$numericSpend"},
                    "totalImpressions": {"$sum": "$numericImpressions"},
                    "totalClicks": {"$sum": "$numericClicks"},
                    "totalReach": {"$sum": "$numericReach"},
                    # Sum other numeric metrics needed by the frontend
                    # Note: Avg metrics like CTR, CPM, CPC, Frequency need calculation in $project stage
                }
            },
            {
                "$project": {
                    "_id": 0, # Exclude the default _id
                    id_field: "$_id", # Rename _id to the specific level id (e.g., campaign_id)
                    "spend": "$totalSpend",
                    "impressions": "$totalImpressions",
                    "clicks": "$totalClicks",
                    "reach": "$totalReach",
                    # Calculate averages
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
                    # Frequency is tricky - avg of daily might not be accurate. Often taken from Meta directly.
                    # For simplicity here, we might omit it or calculate differently if needed.
                }
            }
        ]

        results = list(collection.aggregate(pipeline))

        # Return results as a dictionary keyed by ID for easier frontend merging
        results_dict = {item[id_field]: item for item in results}

        logger.info(f"Aggregated {len(results)} {level} insights for account {ad_account_id}")
        return results_dict

    except Exception as e:
        logger.error(f"Meta insight aggregation failed for {level}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal aggregation error for {level} insights")