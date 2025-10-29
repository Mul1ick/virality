# FILE: app/controllers/aggregation_controller.py

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import date
from typing import Optional

from app.services.aggregation_service import AggregationService
from app.utils.security import get_current_user_id
from app.utils.logger import get_logger

router = APIRouter(prefix="/aggregate", tags=["Data Aggregation"])
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
        result = AggregationService.run_meta_aggregation(
            user_id=user_id,
            ad_account_id=request.ad_account_id,
            start_date=request.start_date,
            end_date=request.end_date,
            group_by=request.group_by,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Meta aggregation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal aggregation error")
