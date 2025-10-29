# FILE: app/controllers/google_controller.py
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional

from app.services.google_service import GoogleService
from app.utils.security import get_current_user_id
from app.utils.logger import get_logger

router = APIRouter( tags=["Google Ads"])
logger = get_logger()


class ManagerPayload(BaseModel):
    manager_id: str


class ClientPayload(BaseModel):
    client_customer_id: str


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
def get_campaigns(user_id: str, customer_id: str = Query(...), manager_id: str = Query(...), current_user_id: str = Depends(get_current_user_id)):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    data = GoogleService.fetch_campaigns(user_id, customer_id, manager_id)
    return {"customer_id": customer_id, "count": len(data), "campaigns": data}


@router.get("/adgroups/{user_id}")
def get_adgroups(user_id: str, customer_id: str = Query(...), manager_id: str = Query(...), campaign_id: str = Query(...), current_user_id: str = Depends(get_current_user_id)):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    data = GoogleService.fetch_adgroups(user_id, customer_id, manager_id, campaign_id)
    return {"campaign_id": campaign_id, "count": len(data), "adgroups": data}


@router.get("/ads/{user_id}")
def get_ads(user_id: str, customer_id: str = Query(...), manager_id: str = Query(...), ad_group_id: str = Query(...), current_user_id: str = Depends(get_current_user_id)):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    data = GoogleService.fetch_ads(user_id, customer_id, manager_id, ad_group_id)
    return {"ad_group_id": ad_group_id, "count": len(data), "ads": data}


@router.get("/insights/{user_id}")
def get_insights(user_id: str, customer_id: str, manager_id: Optional[str] = None):
    result = GoogleService.fetch_insights(user_id, customer_id, manager_id)
    return {"user_id": user_id, "customer_id": customer_id, "insight_count": result["count"], "insights": result["data"][:10]}
