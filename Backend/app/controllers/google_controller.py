# app/controllers/google_controller.py
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import RedirectResponse
import requests, urllib.parse
from app.utils.logger import get_logger
from app.config import settings
from app.database import get_user_token_by_source, save_or_update_user_token
# TO THIS
from app.utils.google_api import (
    list_campaigns_for_child,
    list_accessible_customers,
    list_adgroups_for_campaign,
    list_ads_for_adgroup
)
from app.database import get_user_token_by_source, save_or_update_user_token, save_items
router = APIRouter(prefix="/google", tags=["Google Ads"])
logger = get_logger()

# Include userinfo scopes so we can reliably fetch Google user id/email
SCOPES = "https://www.googleapis.com/auth/adwords https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email"


@router.get("/login")
def google_login():
    auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        + urllib.parse.urlencode({
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": SCOPES,
            "access_type": "offline",
            "prompt": "consent"
        })
    )
    logger.info("[Google OAuth] Redirecting user to consent screen...")
    return RedirectResponse(url=auth_url)


@router.get("/callback")
def google_callback(code: str = Query(..., description="Authorization code from Google")):
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }
    resp = requests.post(token_url, data=data)
    tokens = resp.json()

    if "error" in tokens:
        logger.error(f"[Google OAuth] Token exchange failed: {tokens}")
        raise HTTPException(status_code=400, detail=tokens.get("error_description", "Token exchange failed"))

    access_token = tokens.get("access_token")
    user_info_url = "https://www.googleapis.com/oauth2/v2/userinfo"
    user_resp = requests.get(user_info_url, headers={"Authorization": f"Bearer {access_token}"})
    user_data = user_resp.json()
    user_id = user_data.get("id") or user_data.get("email") or "unknown_user"

    save_or_update_user_token(user_id, tokens, source="google")
    logger.info(f"✅ [Google OAuth] Tokens saved for user {user_id}")

    return RedirectResponse(url=f"http://localhost:8080/?user_id={user_id}")


@router.get("/accounts/{user_id}")
def get_google_accounts(user_id: str):
    token_data = get_user_token_by_source(user_id, source="google")
    if not token_data:
        raise HTTPException(status_code=404, detail="Google Ads account not linked for this user")

    resp = list_accessible_customers(token_data.get("access_token"))
    if resp.status_code != 200:
        logger.error(f"[Google Ads] Failed to list customers: {resp.text}")
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    resource_names = resp.json().get("resourceNames", [])
    customer_ids = [r.split("/")[-1] for r in resource_names]
    return {"user_id": user_id, "customer_ids": customer_ids}


# REPLACE your old function with this entire block

# In app/controllers/google_controller.py
# REPLACE your old function with this complete block
# In app/controllers/google_controller.py
# REPLACE your old function with this complete block

@router.get("/campaigns/{user_id}")
def get_google_campaigns(
    user_id: str,
    customer_id: str = Query(..., description="The Google Ads Client Customer ID to fetch campaigns from"),
    manager_id: str = Query(..., description="The parent Google Ads Manager Account ID")
):
    """
    Fetches campaigns for a specific client customer account, authenticating
    through the parent manager account.
    """
    token_data = get_user_token_by_source(user_id, source="google")
    if not token_data:
        raise HTTPException(status_code=404, detail="User not linked to Google Ads")

    resp = list_campaigns_for_child(
        access_token=token_data.get("access_token"),
        child_customer_id=customer_id,
        login_customer_id=manager_id
    )

    if resp.status_code != 200:
        logger.error(f"[Google Ads] Campaign fetch failed: {resp.text}")
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    data = resp.json().get("results", [])

    if data:
        # 👇 THIS IS THE NEW MERGING LOGIC
        # Instead of just taking item['campaign'], we merge all three parts.
        campaigns_to_save = []
        for item in data:
            # Start with the main campaign details
            merged_campaign = item['campaign']
            # Add the metrics data to it
            merged_campaign.update(item['metrics'])
            # Add the budget data to it
            merged_campaign.update(item['campaignBudget'])
            campaigns_to_save.append(merged_campaign)

        save_items(
            collection_name="campaigns",
            ad_account_id=customer_id,
            items_data=campaigns_to_save,
            platform="google"
        )
        logger.info(f"✅ Saved {len(campaigns_to_save)} Google campaigns with full details to MongoDB.")

    return {"customer_id": customer_id, "campaign_count": len(data), "campaigns": data}


# In app/controllers/google_controller.py
# ADD these two new endpoints to the end of the file

@router.get("/adgroups/{user_id}")
def get_google_adgroups(
    user_id: str,
    customer_id: str = Query(..., description="The Google Ads Client Customer ID"),
    manager_id: str = Query(..., description="The parent Google Ads Manager Account ID"),
    campaign_id: str = Query(..., description="The Campaign ID to fetch ad groups from")
):
    token_data = get_user_token_by_source(user_id, source="google")
    if not token_data:
        raise HTTPException(status_code=404, detail="User not linked to Google Ads")

    resp = list_adgroups_for_campaign(
        access_token=token_data.get("access_token"),
        child_customer_id=customer_id,
        login_customer_id=manager_id,
        campaign_id=campaign_id
    )
    if resp.status_code != 200:
        logger.error(f"[Google Ads] Ad Group fetch failed: {resp.text}")
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
        
    data = resp.json().get("results", [])
    if data:
        adgroups_to_save = [{**item['adGroup'], **item['metrics']} for item in data]
        
        # Note: Google's "Ad Group" maps to your "adset" collection name
        save_items(
            collection_name="adsets",
            ad_account_id=customer_id,
            items_data=adgroups_to_save,
            platform="google"
        )
        logger.info(f"✅ Saved {len(adgroups_to_save)} Google Ad Groups to 'adsets' collection.")
        
    return {"campaign_id": campaign_id, "adgroup_count": len(data), "adgroups": data}


@router.get("/ads/{user_id}")
def get_google_ads(
    user_id: str,
    customer_id: str = Query(..., description="The Google Ads Client Customer ID"),
    manager_id: str = Query(..., description="The parent Google Ads Manager Account ID"),
    ad_group_id: str = Query(..., description="The Ad Group ID to fetch ads from")
):
    token_data = get_user_token_by_source(user_id, source="google")
    if not token_data:
        raise HTTPException(status_code=404, detail="User not linked to Google Ads")

    resp = list_ads_for_adgroup(
        access_token=token_data.get("access_token"),
        child_customer_id=customer_id,
        login_customer_id=manager_id,
        ad_group_id=ad_group_id
    )
    if resp.status_code != 200:
        logger.error(f"[Google Ads] Ad fetch failed: {resp.text}")
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
        
    data = resp.json().get("results", [])
    if data:
        ads_to_save = []
        for item in data:
            merged = {**item['adGroupAd']['ad'], **item['metrics']}
            merged['status'] = item['adGroupAd']['status']
            ads_to_save.append(merged)

        save_items(
            collection_name="ads",
            ad_account_id=customer_id,
            items_data=ads_to_save,
            platform="google"
        )
        logger.info(f"✅ Saved {len(ads_to_save)} Google Ads to 'ads' collection.")
        
    return {"ad_group_id": ad_group_id, "ad_count": len(data), "ads": data}


# In app/controllers/google_controller.py
# REPLACE your old function with this complete block

@router.get("/campaigns/{user_id}")
def get_google_campaigns(
    user_id: str,
    customer_id: str = Query(..., description="The Google Ads Client Customer ID to fetch campaigns from"),
    manager_id: str = Query(..., description="The parent Google Ads Manager Account ID")
):
    """
    Fetches campaigns for a specific client customer account, authenticating
    through the parent manager account.
    """
    token_data = get_user_token_by_source(user_id, source="google")
    if not token_data:
        raise HTTPException(status_code=404, detail="User not linked to Google Ads")

    resp = list_campaigns_for_child(
        access_token=token_data.get("access_token"),
        child_customer_id=customer_id,
        login_customer_id=manager_id
    )

    if resp.status_code != 200:
        logger.error(f"[Google Ads] Campaign fetch failed: {resp.text}")
        raise HTTPException(status_code=resp.status_code, detail=resp.text)

    data = resp.json().get("results", [])

    if data:
        # 👇 THIS IS THE NEW MERGING LOGIC
        # Instead of just taking item['campaign'], we merge all three parts.
        campaigns_to_save = []
        for item in data:
            # Start with the main campaign details
            merged_campaign = item['campaign']
            # Add the metrics data to it
            merged_campaign.update(item['metrics'])
            # Add the budget data to it
            merged_campaign.update(item['campaignBudget'])
            campaigns_to_save.append(merged_campaign)

        save_items(
            collection_name="campaigns",
            ad_account_id=customer_id,
            items_data=campaigns_to_save,
            platform="google"
        )
        logger.info(f"✅ Saved {len(campaigns_to_save)} Google campaigns with full details to MongoDB.")

    return {"customer_id": customer_id, "campaign_count": len(data), "campaigns": data}