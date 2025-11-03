from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional
from app.services.google_service import GoogleService
from app.utils.security import get_current_user_id
from app.utils.logger import get_logger

router = APIRouter(tags=["Google Ads"])
logger = get_logger()


class ManagerPayload(BaseModel):
    manager_id: str


class ClientPayload(BaseModel):
    client_customer_id: str


class DailyInsightsRequest(BaseModel):
    customer_id: str
    manager_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    days_back: int = 30


# -------------------- OAuth --------------------
@router.get("/login")
def google_login(current_user_id: str = Depends(get_current_user_id)):
    url = GoogleService.build_login_url(current_user_id)
    return {"redirect_url": url}


@router.get("/callback")
def google_callback(code: str, state: str):
    user_id = GoogleService.handle_callback(code, state)
    return RedirectResponse(
        url=f"http://localhost:8080/select-google-account?user_id={user_id}"
    )


# -------------------- Account --------------------
@router.get("/accounts/{user_id}")
def get_accounts(user_id: str, current_user_id: str = Depends(get_current_user_id)):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    accounts = GoogleService.get_stored_accounts(user_id)
    return {"user_id": user_id, "accounts": accounts}


@router.post("/select-manager/{user_id}")
def select_manager(user_id: str, payload: ManagerPayload, current_user_id: str = Depends(get_current_user_id)):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    clients = GoogleService.select_manager_and_fetch_clients(user_id, payload.manager_id)
    return {"user_id": user_id, "selected_manager_id": payload.manager_id, "client_accounts": clients}


@router.post("/save-client/{user_id}")
def save_client(user_id: str, payload: ClientPayload, current_user_id: str = Depends(get_current_user_id)):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    GoogleService.save_client_selection(user_id, payload.client_customer_id)
    return {"user_id": user_id, "client_customer_id": payload.client_customer_id}


# -------------------- Data Fetch --------------------
@router.get("/campaigns/{user_id}")
def get_campaigns(
    user_id: str,
    customer_id: str = Query(...),
    manager_id: Optional[str] = Query(None),
    current_user_id: str = Depends(get_current_user_id),
):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    data = GoogleService.fetch_campaigns(user_id, customer_id, manager_id)
    return {"customer_id": customer_id, "count": len(data), "campaigns": data}


@router.get("/adgroups/{user_id}")
def get_adgroups(
    user_id: str,
    customer_id: str = Query(...),
    manager_id: Optional[str] = Query(None),
    campaign_id: str = Query(...),
    current_user_id: str = Depends(get_current_user_id),
):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    data = GoogleService.fetch_adgroups(user_id, customer_id, manager_id, campaign_id)
    return {"campaign_id": campaign_id, "count": len(data), "adgroups": data}


@router.get("/ads/{user_id}")
def get_ads(
    user_id: str,
    customer_id: str = Query(...),
    manager_id: Optional[str] = Query(None),
    ad_group_id: str = Query(...),
    current_user_id: str = Depends(get_current_user_id),
):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    data = GoogleService.fetch_ads(user_id, customer_id, manager_id, ad_group_id)
    return {"ad_group_id": ad_group_id, "count": len(data), "ads": data}


@router.get("/insights/campaigns")
def get_campaign_insights_endpoint(
    customer_id: str = Query(...),
    manager_id: Optional[str] = Query(None),
    date_range: str = Query("LAST_30_DAYS"),
    campaign_id: Optional[str] = Query(None),
    current_user_id: str = Depends(get_current_user_id),
):
    """JWT-protected endpoint to fetch campaign insights."""
    data = GoogleService.fetch_campaign_insights(current_user_id, customer_id, manager_id, date_range, campaign_id)
    return {
        "user_id": current_user_id,
        "customer_id": customer_id,
        "insight_count": len(data),
        "insights": data,
    }


@router.get("/insights/adgroups")
def get_adgroup_insights_endpoint(
    customer_id: str = Query(...),
    manager_id: Optional[str] = Query(None),
    date_range: str = Query("LAST_30_DAYS"),
    campaign_id: Optional[str] = Query(None),
    current_user_id: str = Depends(get_current_user_id),
):
    """JWT-protected endpoint to fetch ad group insights."""
    data = GoogleService.fetch_adgroup_insights(current_user_id, customer_id, manager_id, date_range, campaign_id)
    return {
        "user_id": current_user_id,
        "customer_id": customer_id,
        "insight_count": len(data),
        "insights": data,
    }


@router.get("/insights/ads")
def get_ad_insights_endpoint(
    customer_id: str = Query(...),
    manager_id: Optional[str] = Query(None),
    date_range: str = Query("LAST_30_DAYS"),
    ad_group_id: Optional[str] = Query(None),
    current_user_id: str = Depends(get_current_user_id),
):
    """JWT-protected endpoint to fetch ad-level insights."""
    data = GoogleService.fetch_ad_insights(current_user_id, customer_id, manager_id, date_range, ad_group_id)
    return {
        "user_id": current_user_id,
        "customer_id": customer_id,
        "insight_count": len(data),
        "insights": data,
    }


@router.get("/adgroups/all/{user_id}")
def get_all_adgroups(
    user_id: str,
    customer_id: str = Query(...),
    manager_id: Optional[str] = Query(None),
    date_range: str = Query("LAST_30_DAYS"),
    current_user_id: str = Depends(get_current_user_id),
):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    data = GoogleService.fetch_all_adgroups(user_id, customer_id, manager_id, date_range)
    return {"customer_id": customer_id, "count": len(data), "adgroups": data}


@router.get("/ads/all/{user_id}")
def get_all_ads(
    user_id: str,
    customer_id: str = Query(...),
    manager_id: Optional[str] = Query(None),
    date_range: str = Query("LAST_30_DAYS"),
    current_user_id: str = Depends(get_current_user_id),
):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    data = GoogleService.fetch_all_ads(user_id, customer_id, manager_id, date_range)
    return {"customer_id": customer_id, "count": len(data), "ads": data}


# -------------------- Daily Insights Endpoints --------------------

@router.post("/daily-insights/campaigns/{user_id}")
def fetch_daily_campaign_insights(
    user_id: str,
    payload: DailyInsightsRequest,
    current_user_id: str = Depends(get_current_user_id)
):
    """Fetch and store daily campaign insights for the last N days."""
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    logger.info(f"[Google Daily] Fetching campaign insights for {payload.customer_id}")
    
    records = GoogleService.fetch_and_store_daily_campaign_insights(
        user_id=user_id,
        customer_id=payload.customer_id,
        manager_id=payload.manager_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        days_back=payload.days_back
    )
    
    return {
        "message": "Daily campaign insights fetched successfully",
        "customer_id": payload.customer_id,
        "records_saved": len(records),
        "date_range": {
            "start": payload.start_date or f"{payload.days_back} days ago",
            "end": payload.end_date or "today"
        }
    }


@router.post("/daily-insights/adgroups/{user_id}")
def fetch_daily_adgroup_insights(
    user_id: str,
    payload: DailyInsightsRequest,
    current_user_id: str = Depends(get_current_user_id)
):
    """Fetch and store daily ad group insights."""
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    logger.info(f"[Google Daily] Fetching ad group insights for {payload.customer_id}")
    
    records = GoogleService.fetch_and_store_daily_adgroup_insights(
        user_id=user_id,
        customer_id=payload.customer_id,
        manager_id=payload.manager_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        days_back=payload.days_back
    )
    
    return {
        "message": "Daily ad group insights fetched successfully",
        "customer_id": payload.customer_id,
        "records_saved": len(records)
    }


@router.post("/daily-insights/ads/{user_id}")
def fetch_daily_ad_insights(
    user_id: str,
    payload: DailyInsightsRequest,
    current_user_id: str = Depends(get_current_user_id)
):
    """Fetch and store daily ad insights."""
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    logger.info(f"[Google Daily] Fetching ad insights for {payload.customer_id}")
    
    records = GoogleService.fetch_and_store_daily_ad_insights(
        user_id=user_id,
        customer_id=payload.customer_id,
        manager_id=payload.manager_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        days_back=payload.days_back
    )
    
    return {
        "message": "Daily ad insights fetched successfully",
        "customer_id": payload.customer_id,
        "records_saved": len(records)
    }


@router.post("/daily-insights/backfill/{user_id}")
def backfill_daily_insights(
    user_id: str,
    payload: DailyInsightsRequest,
    current_user_id: str = Depends(get_current_user_id)
):
    """Backfill historical daily data for all levels (campaigns, ad groups, ads)."""
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    logger.info(f"[Google Backfill] Starting backfill for {payload.customer_id}, {payload.days_back} days")
    
    try:
        campaign_records = GoogleService.fetch_and_store_daily_campaign_insights(
            user_id, payload.customer_id, payload.manager_id,
            payload.start_date, payload.end_date, payload.days_back
        )
        
        adgroup_records = GoogleService.fetch_and_store_daily_adgroup_insights(
            user_id, payload.customer_id, payload.manager_id,
            payload.start_date, payload.end_date, payload.days_back
        )
        
        ad_records = GoogleService.fetch_and_store_daily_ad_insights(
            user_id, payload.customer_id, payload.manager_id,
            payload.start_date, payload.end_date, payload.days_back
        )
        
        return {
            "message": "Backfill completed successfully",
            "customer_id": payload.customer_id,
            "campaigns_saved": len(campaign_records),
            "adgroups_saved": len(adgroup_records),
            "ads_saved": len(ad_records),
            "total_records": len(campaign_records) + len(adgroup_records) + len(ad_records)
        }
    except Exception as e:
        logger.error(f"[Google Backfill] Failed: {e}")
        raise HTTPException(status_code=500, detail=f"Backfill failed: {str(e)}")