# FILE: Backend/app/controllers/aggregation_controller.py

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, field_validator
from datetime import datetime, date, timedelta
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
    start_date: str  # ✅ Changed from date to str
    end_date: str    # ✅ Changed from date to str
    ad_account_id: str
    group_by: Optional[str] = None

    @field_validator('start_date', 'end_date')
    @classmethod
    def validate_date_format(cls, v):
        """Validate that date strings are in YYYY-MM-DD format"""
        try:
            datetime.strptime(v, '%Y-%m-%d')
            return v
        except ValueError:
            raise ValueError('Date must be in YYYY-MM-DD format')


class GoogleAggregationRequest(BaseModel):
    start_date: str  # ✅ Changed from date to str
    end_date: str    # ✅ Changed from date to str
    ad_account_id: str
    group_by: Optional[str] = None

    @field_validator('start_date', 'end_date')
    @classmethod
    def validate_date_format(cls, v):
        try:
            datetime.strptime(v, '%Y-%m-%d')
            return v
        except ValueError:
            raise ValueError('Date must be in YYYY-MM-DD format')


class ShopifyAggregationRequest(BaseModel):
    start_date: str  # ✅ Changed from date to str
    end_date: str    # ✅ Changed from date to str
    group_by: Optional[str] = "date"

    @field_validator('start_date', 'end_date')
    @classmethod
    def validate_date_format(cls, v):
        try:
            datetime.strptime(v, '%Y-%m-% d')
            return v
        except ValueError:
            raise ValueError('Date must be in YYYY-MM-DD format')


@router.post("/meta", summary="Aggregate Meta Ads Data")
async def aggregate_meta_data(request: MetaAggregationRequest, user_id: str = Depends(get_current_user_id)):
    """
    Aggregates Meta Ads daily insights by campaign, adset, ad, or time period.
    """
    logger.info(f"[META ENDPOINT] Request received - user: {user_id}, account: {request.ad_account_id}, group_by: {request.group_by}")
    logger.info(f"[META ENDPOINT] Date range: {request.start_date} to {request.end_date}")

    try:
        # ✅ Convert string dates to date objects for the service
        from datetime import datetime
        start_date_obj = datetime.strptime(request.start_date, '%Y-%m-%d').date()
        end_date_obj = datetime.strptime(request.end_date, '%Y-%m-%d').date()
        
        raw_result = AggregationService.run_meta_aggregation(
            user_id=user_id,
            ad_account_id=request.ad_account_id,
            start_date=start_date_obj,
            end_date=end_date_obj,
            group_by=request.group_by,
        )
        
        results_list = raw_result.get("results", [])
        logger.info(f"[META ENDPOINT] Got {len(results_list)} results from service")
        
        group_by = request.group_by

        if group_by == "campaign":
            id_field = "campaignId"
        elif group_by == "adset":
            id_field = "adsetId"
        elif group_by == "ad":
            id_field = "adId"
        elif group_by == "date":
            logger.info(f"[META ENDPOINT] Returning date-grouped results: {results_list}")
            return results_list
        else:
            logger.info(f"[META ENDPOINT] No grouping, returning raw list: {results_list}")
            return results_list
        
        results_dict = {}
        for item in results_list:
            if id_field in item:
                item_id = item.pop(id_field)
                results_dict[item_id] = item
                logger.info(f"[META ENDPOINT] Mapped {id_field}={item_id} -> {item}")
            else:
                logger.warning(f"[META ENDPOINT] Item missing {id_field}: {item}")

        logger.info(f"[META ENDPOINT] Final response: {len(results_dict)} items")
        return results_dict
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[META ENDPOINT] Failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal aggregation error")


@router.post("/google", summary="Aggregate Google Ads Data")
async def aggregate_google_data(request: GoogleAggregationRequest, user_id: str = Depends(get_current_user_id)):
    """
    Aggregates Google Ads campaign data.
    """
    logger.info(f"[GOOGLE ENDPOINT] Request received - user: {user_id}, ad_account: {request.ad_account_id}, group_by: {request.group_by}")
    logger.info(f"[GOOGLE ENDPOINT] Date range: {request.start_date} to {request.end_date}")

    try:
        # ✅ Convert string dates to date objects
        from datetime import datetime
        start_date_obj = datetime.strptime(request.start_date, '%Y-%m-%d').date()
        end_date_obj = datetime.strptime(request.end_date, '%Y-%m-%d').date()
        
        raw_result = AggregationService.run_google_aggregation(
            user_id=user_id,
            customer_id=request.ad_account_id,
            start_date=start_date_obj,
            end_date=end_date_obj,
            group_by=request.group_by,
        )
        
        results_list = raw_result.get("results", [])
        logger.info(f"[GOOGLE ENDPOINT] Got {len(results_list)} results from service")
        
        group_by = request.group_by
        
        if group_by == "date":
            logger.info(f"[GOOGLE ENDPOINT] Returning date-grouped array: {len(results_list)} days")
            return results_list
        
        if group_by in ["campaign", "adgroup", "ad"]:
            id_field = f"{group_by}Id"
            results_dict = {}
            for item in results_list:
                if id_field in item:
                    item_id = item.pop(id_field)
                    results_dict[item_id] = item
                    logger.info(f"[GOOGLE ENDPOINT] Mapped {id_field}={item_id} -> {item}")
                else:
                    logger.warning(f"[GOOGLE ENDPOINT] Item missing {id_field}: {item}")
            
            logger.info(f"[GOOGLE ENDPOINT] Returning {len(results_dict)} grouped items")
            return results_dict
        
        if results_list:
            logger.info(f"[GOOGLE ENDPOINT] First result: {results_list[0]}")
            return results_list[0]
        else:
            logger.warning(f"[GOOGLE ENDPOINT] No results, returning zeros")
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
        logger.error(f"[GOOGLE ENDPOINT] Failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal aggregation error")


@router.post("/shopify", summary="Aggregate Shopify Data")
async def aggregate_shopify_data(request: ShopifyAggregationRequest, user_id: str = Depends(get_current_user_id)):
    """
    Aggregates Shopify orders data for revenue, order count, and AOV.
    """
    logger.info(f"[SHOPIFY ENDPOINT] Request received - user: {user_id}, group_by: {request.group_by}")
    logger.info(f"[SHOPIFY ENDPOINT] Date range: {request.start_date} to {request.end_date}")

    try:
        # ✅ Convert string dates to date objects
        from datetime import datetime
        start_date_obj = datetime.strptime(request.start_date, '%Y-%m-%d').date()
        end_date_obj = datetime.strptime(request.end_date, '%Y-%m-%d').date()
        
        raw_result = AggregationService.run_shopify_aggregation(
            user_id=user_id,
            start_date=start_date_obj,
            end_date=end_date_obj,
            group_by=request.group_by,
        )
        
        results_list = raw_result.get("results", [])
        logger.info(f"[SHOPIFY ENDPOINT] Got {len(results_list)} results from service")
        
        if request.group_by == "date":
            logger.info(f"[SHOPIFY ENDPOINT] Returning date-grouped array: {len(results_list)} days")
            return results_list
        
        if results_list:
            logger.info(f"[SHOPIFY ENDPOINT] First result: {results_list[0]}")
            return results_list[0]
        else:
            logger.warning(f"[SHOPIFY ENDPOINT] No results, returning zeros")
            return {
                "totalRevenue": 0,
                "orderCount": 0,
                "avgOrderValue": 0
            }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[SHOPIFY ENDPOINT] Failed: {e}", exc_info=True)
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
    logger.info(f"[META INSIGHTS] Request - level: {level}, account: {ad_account_id}, preset: {date_preset}")
    
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
    logger.info(f"[META INSIGHTS] Date range: {start_date} to {end_date}")

    try:
        collection_map = {
            "campaign": "meta_daily_campaign_insights",
            "adset": "meta_daily_insights",
            "ad": "meta_daily_ad_insights"
        }
        
        collection = db[collection_map[level]]
        id_field = f"{level}_id"
        group_id_field = f"${id_field}"

        logger.info(f"[META INSIGHTS] Using collection: {collection_map[level]}, grouping by: {id_field}")

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
        logger.info(f"[META INSIGHTS] Got {len(results)} results from aggregation")
        
        if results:
            logger.info(f"[META INSIGHTS] Sample result: {results[0]}")

        results_dict = {}
        for item in results:
            item_id = item.pop("id")
            results_dict[item_id] = item

        logger.info(f"[META INSIGHTS] Returning {len(results_dict)} {level} insights")
        return results_dict

    except Exception as e:
        logger.error(f"[META INSIGHTS] Failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal aggregation error for {level} insights")