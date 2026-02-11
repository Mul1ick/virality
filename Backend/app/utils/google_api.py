# FILE: app/utils/google_api.py
"""
Google Ads REST helper utilities.

This module wraps common Google Ads API calls using `requests`,
so your FastAPI controllers can stay thin.

Key points:
- Adds both Accept and Content-Type headers.
- Uses optional `login-customer-id` when querying across accounts (MCC context).
- Formats GAQL correctly: enums and booleans are NOT quoted; numeric IDs are not quoted.
- Cleans Google Ads customer IDs by removing dashes before using them in URLs/GAQL.
- Includes a token refresh helper that updates Mongo and returns a fresh token.
"""

from __future__ import annotations

from typing import List, Dict, Optional
import requests
from datetime import datetime, timedelta

from app.config.config import settings
from app.utils.logger import get_logger
from app.database.mongo_client import save_or_update_platform_connection, get_platform_connection_details

logger = get_logger()

# NOTE: Updated to v23 for latest features (Performance Max / Demand Gen segmentation)
BASE_URL = "https://googleads.googleapis.com/v23"


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _headers(access_token: str, login_customer_id: Optional[str] = None) -> Dict[str, str]:
    """
    Build Google Ads API headers.

    Args:
        access_token: OAuth2 access token received from Google.
        login_customer_id: Optional MCC (manager) customer ID for cross-account queries.

    Returns:
        Dict of headers.
    """
    dev_token = getattr(settings, "GOOGLE_DEVELOPER_TOKEN", None)
    if not dev_token:
        logger.error("Missing GOOGLE_DEVELOPER_TOKEN in settings.")
        raise RuntimeError("Missing GOOGLE_DEVELOPER_TOKEN in settings.")

    headers = {
        "Authorization": f"Bearer {access_token}",
        "developer-token": dev_token,
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    if login_customer_id:
        headers["login-customer-id"] = _clean_customer_id(login_customer_id)
    return headers


def _clean_customer_id(customer_id: str) -> str:
    """
    Remove dashes from customer ID. Google Ads accepts '##########' (no dashes).
    """
    return str(customer_id).replace("-", "")


# ---------------------------------------------------------------------------
# 🔁 Token refresh helper
# ---------------------------------------------------------------------------

def refresh_google_access_token(user_id: str) -> Optional[str]:
    """
    Refreshes an expired Google Ads access token using the saved refresh_token.
    """
    details = get_platform_connection_details(user_id, "google")
    if not details or "refresh_token" not in details:
        logger.error(f"[Google Refresh] No refresh_token found for user {user_id}")
        return None

    payload = {
       "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "grant_type": "refresh_token",
        "refresh_token": details["refresh_token"],
    }

    try:
        resp = requests.post("https://oauth2.googleapis.com/token", data=payload, timeout=20)
        if resp.status_code != 200:
            logger.error(f"[Google Refresh] Failed to refresh token for user {user_id}: {resp.text}")
            return None

        token_data = resp.json()
        new_access_token = token_data.get("access_token")
        expires_in = token_data.get("expires_in", 3600)

        # Save back to Mongo
        save_or_update_platform_connection(
            user_id,
            "google",
            {"access_token": new_access_token, "expires_in": expires_in},
        )

        logger.info(f"[Google Refresh] Token refreshed for user {user_id}")
        return new_access_token
    except Exception as e:
        logger.error(f"[Google Refresh] Exception while refreshing token for user {user_id}: {e}")
        return None


# ---------------------------------------------------------------------------
# Public API wrappers
# ---------------------------------------------------------------------------

def list_accessible_customers(access_token: str) -> Optional[requests.Response]:
    """
    List all accessible customers for the authenticated user.
    """
    url = f"{BASE_URL}/customers:listAccessibleCustomers"
    logger.info("Attempting to list accessible customers...")
    try:
        resp = requests.get(url, headers=_headers(access_token), timeout=20)
        resp.raise_for_status()
        logger.info("Successfully listed accessible customers.")
        return resp
    except requests.exceptions.RequestException as e:
        error_detail = e.response.text if getattr(e, "response", None) else str(e)
        logger.error(f"[Google Ads] Failed to list customers: {error_detail}")
        return e.response if getattr(e, "response", None) else None


def get_account_details_batch(access_token: str, customer_ids: List[str]) -> List[Dict]:
    """
    Fetch descriptive_name and manager status for a batch of customer IDs via GAQL.
    """
    if not customer_ids:
        logger.warning("get_account_details_batch called with empty customer_ids list.")
        return []

    # Select query context (MCC) heuristically
    query_login_customer_id: Optional[str] = None
    try:
        known = getattr(settings, "GOOGLE_LOGIN_CUSTOMER_ID", None)
        if known and _clean_customer_id(known) in { _clean_customer_id(str(x)) for x in customer_ids }:
            query_login_customer_id = _clean_customer_id(known)
            logger.info(f"Using known GOOGLE_LOGIN_CUSTOMER_ID '{query_login_customer_id}' for batch query.")
        else:
            query_login_customer_id = _clean_customer_id(str(customer_ids[0]))
            logger.info(f"[Dynamic MCC] Using '{query_login_customer_id}' as login-customer-id for batch query.")
    except Exception:
        logger.exception("Cannot determine login_customer_id for batch query.")
        return [{"id": _clean_customer_id(str(cid)), "name": f"Account {cid} (Details N/A)", "isManager": False}
                for cid in customer_ids]

    cleaned_ids_str = ", ".join([_clean_customer_id(str(cid)) for cid in customer_ids])

    url = f"{BASE_URL}/customers/{_clean_customer_id(query_login_customer_id)}/googleAds:search"
    query = f"""
    SELECT
      customer_client.id,
      customer_client.descriptive_name,
      customer_client.manager,
      customer_client.level
    FROM customer_client
    WHERE customer_client.id IN ({cleaned_ids_str})
      AND customer_client.status = ENABLED
    """
    payload = {"query": query}
    account_details: List[Dict] = []

    logger.info(f"Querying account details for IDs: {customer_ids} using login ID {query_login_customer_id}")
    try:
        resp = requests.post(url, headers=_headers(access_token, query_login_customer_id), json=payload, timeout=30)
        
        if resp.status_code == 200:
            results = resp.json().get("results", [])
            found_ids = set()
            for item in results:
                client = item.get("customerClient", {}) or {}
                acc_id = client.get("id")
                if acc_id is not None:
                    acc_id_str = str(acc_id)
                    account_details.append({
                        "id": acc_id_str,
                        "name": client.get("descriptiveName", f"Account {acc_id_str}"),
                        "isManager": bool(client.get("manager", False)),
                    })
                    found_ids.add(_clean_customer_id(acc_id_str))

            missing_ids = { _clean_customer_id(str(cid)) for cid in customer_ids } - found_ids
            for mid in missing_ids:
                is_likely_manager = (
                    _clean_customer_id(getattr(settings, "GOOGLE_LOGIN_CUSTOMER_ID", "") or "")
                    == _clean_customer_id(mid)
                )
                account_details.append({
                    "id": mid,
                    "name": f"Account {mid} (Details N/A)",
                    "isManager": is_likely_manager,
                })

            return account_details

        logger.error(f"Failed to fetch account details batch. Status: {resp.status_code}, Response: {resp.text}")
        return [{"id": _clean_customer_id(str(cid)), "name": f"Account {cid} (Details N/A)", "isManager": False}
                for cid in customer_ids]

    except Exception as e:
        logger.exception(f"Unexpected error fetching account details batch: {e}")
        return [{"id": _clean_customer_id(str(cid)), "name": f"Account {cid} (Details N/A)", "isManager": False}
                for cid in customer_ids]


def list_campaigns_for_child(
    access_token: str,
    child_customer_id: str,
    login_customer_id: Optional[str] = None,
    date_range: str = "LAST_30_DAYS"
) -> Optional[requests.Response]:
    """
    Retrieve campaign + metrics for a specific client account for the provided date_range.
    Updated for v23: fetches both start_date and start_date_time.
    """
    url = f"{BASE_URL}/customers/{_clean_customer_id(child_customer_id)}/googleAds:search"

    query = f"""
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      campaign.start_date,
      campaign.end_date,
      campaign.start_date_time,
      campaign.end_date_time,
      campaign.bidding_strategy_type,
      campaign.target_cpa.target_cpa_micros,
      campaign.target_roas.target_roas,
      campaign_budget.amount_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.average_cpc,
      metrics.cost_micros,
      metrics.conversions,
      metrics.cost_per_conversion,
      metrics.conversions_from_interactions_rate,
      metrics.value_per_conversion
    FROM campaign
    WHERE segments.date DURING {date_range}
    ORDER BY metrics.impressions DESC
    """

    payload = {"query": query}
    try:
        resp = requests.post(url, headers=_headers(access_token, login_customer_id), json=payload, timeout=60)
        if resp.status_code != 200:
            logger.error(f"[Google Ads] Campaign fetch failed {resp.status_code}: {resp.text}")
        return resp
    except requests.exceptions.RequestException as e:
        logger.error(f"[Google Ads] Network error fetching campaigns: {getattr(e, 'response', None) and e.response.text or str(e)}")
        return getattr(e, "response", None)
    except Exception as e:
        logger.exception(f"[Google Ads] Unexpected error fetching campaigns: {e}")
        return None


def list_adgroups_for_campaign(
    access_token: str,
    child_customer_id: str,
    login_customer_id: Optional[str],
    campaign_id: str,
    date_range: str = "LAST_30_DAYS"
) -> Optional[requests.Response]:
    """
    Retrieve Ad Groups and metrics for a specific campaign.
    """
    url = f"{BASE_URL}/customers/{_clean_customer_id(child_customer_id)}/googleAds:search"
    campaign_id_clean = _clean_customer_id(str(campaign_id))

    query = f"""
    SELECT
      ad_group.id,
      ad_group.name,
      ad_group.status,
      ad_group.type,
      campaign.id,
      metrics.clicks,
      metrics.impressions,
      metrics.cost_micros,
      metrics.conversions
    FROM ad_group
    WHERE campaign.id = {campaign_id_clean}
      AND segments.date DURING {date_range}
    ORDER BY metrics.impressions DESC
    """

    payload = {"query": query}
    try:
        resp = requests.post(url, headers=_headers(access_token, login_customer_id), json=payload, timeout=60)
        if resp.status_code != 200:
            logger.error(f"[Google Ads] AdGroup fetch failed {resp.status_code}: {resp.text}")
        return resp
    except requests.exceptions.RequestException as e:
        logger.error(f"[Google Ads] Network error fetching ad groups: {getattr(e, 'response', None) and e.response.text or str(e)}")
        return getattr(e, "response", None)
    except Exception as e:
        logger.exception(f"[Google Ads] Unexpected error fetching ad groups: {e}")
        return None


def list_ads_for_adgroup(
    access_token: str,
    child_customer_id: str,
    login_customer_id: Optional[str],
    ad_group_id: str,
    date_range: str = "LAST_30_DAYS"
) -> Optional[requests.Response]:
    """
    Retrieve Ads and metrics for a specific ad group.
    Updated for v23: fetches resource_name for uniqueness.
    """
    url = f"{BASE_URL}/customers/{_clean_customer_id(child_customer_id)}/googleAds:search"
    ad_group_id_clean = _clean_customer_id(str(ad_group_id))

    query = f"""
    SELECT
      ad_group_ad.ad.resource_name,
      ad_group_ad.ad.id,
      ad_group_ad.ad.name,
      ad_group_ad.ad.type,
      ad_group_ad.ad.final_urls,
      ad_group_ad.status,
      ad_group.id,
      campaign.id,
      metrics.clicks,
      metrics.impressions,
      metrics.cost_micros,
      metrics.ctr,
      metrics.conversions
    FROM ad_group_ad
    WHERE ad_group.id = {ad_group_id_clean}
      AND segments.date DURING {date_range}
    ORDER BY metrics.impressions DESC
    """

    payload = {"query": query}
    try:
        resp = requests.post(url, headers=_headers(access_token, login_customer_id), json=payload, timeout=60)
        if resp.status_code != 200:
            logger.error(f"[Google Ads] Ads fetch failed {resp.status_code}: {resp.text}")
        return resp
    except requests.exceptions.RequestException as e:
        logger.error(f"[Google Ads] Network error fetching ads: {getattr(e, 'response', None) and e.response.text or str(e)}")
        return getattr(e, "response", None)
    except Exception as e:
        logger.exception(f"[Google Ads] Unexpected error fetching ads: {e}")
        return None


def get_direct_client_accounts(access_token: str, manager_customer_id: str) -> List[Dict]:
    """
    List directly-linked, non-manager client accounts under a specific MCC.
    """
    logger.info(f"Fetching direct client accounts under manager: {manager_customer_id}")
    cleaned_manager_id = _clean_customer_id(manager_customer_id)
    url = f"{BASE_URL}/customers/{cleaned_manager_id}/googleAds:search"

    query = """
    SELECT
      customer_client.id,
      customer_client.descriptive_name,
      customer_client.manager,
      customer_client.status,
      customer_client.level
    FROM customer_client
    WHERE customer_client.level = 1
      AND customer_client.manager = false
      AND customer_client.status = ENABLED
    ORDER BY customer_client.descriptive_name
    """
    payload = {"query": query}
    client_accounts: List[Dict] = []

    try:
        resp = requests.post(url, headers=_headers(access_token, cleaned_manager_id), json=payload, timeout=60)
        
        if resp.status_code == 200:
            results = resp.json().get("results", [])
            for item in results:
                client = item.get("customerClient", {}) or {}
                acc_id = client.get("id")
                if acc_id is not None:
                    acc_id_str = str(acc_id)
                    client_accounts.append({
                        "id": acc_id_str,
                        "name": client.get("descriptiveName", f"Client {acc_id_str}"),
                        "isManager": False,
                    })
        else:
            logger.error(
                f"Failed to fetch direct client accounts under {manager_customer_id}. "
                f"Status: {resp.status_code}, Response: {resp.text}"
            )

    except requests.exceptions.RequestException as e:
        error_detail = e.response.text if getattr(e, "response", None) else str(e)
        logger.error(f"Network error fetching direct clients under {manager_customer_id}: {error_detail}")
    except Exception as e:
        logger.exception(f"Unexpected error fetching direct clients under {manager_customer_id}: {e}")

    return client_accounts


# ---------------------------------------------------------------------------
# 📊 NEW: DAILY INSIGHTS FUNCTIONS
# ---------------------------------------------------------------------------

def get_campaign_daily_insights(
    access_token: str,
    customer_id: str,
    login_customer_id: str,
    start_date: str,
    end_date: str
):
    """
    Fetch daily campaign metrics for a date range.
    Includes 'segments.ad_network_type' for Demand Gen/PMax breakdowns.
    """
    url = f"{BASE_URL}/customers/{_clean_customer_id(customer_id)}/googleAds:search"
    
    query = f"""
        SELECT 
            campaign.id,
            campaign.name,
            campaign.status,
            campaign.advertising_channel_type,
            segments.date,
            segments.ad_network_type,
            metrics.clicks,
            metrics.impressions,
            metrics.cost_micros,
            metrics.conversions,
            metrics.ctr,
            metrics.average_cpc,
            metrics.average_cpm
        FROM campaign
        WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
        ORDER BY segments.date DESC
    """
    
    payload = {"query": query}
    
    try:
        logger.info(f"[Google API] Fetching daily campaign insights for {customer_id} from {start_date} to {end_date}")
        response = requests.post(
            url, 
            headers=_headers(access_token, login_customer_id),
            json=payload, 
            timeout=30
        )
        logger.info(f"[Google API] Daily campaign insights response: {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"[Google API] Daily campaign insights error: {e}")
        return None


def get_adgroup_daily_insights(
    access_token: str,
    customer_id: str,
    login_customer_id: str,
    start_date: str,
    end_date: str
):
    """
    Fetch daily ad group metrics for a date range.
    """
    url = f"{BASE_URL}/customers/{_clean_customer_id(customer_id)}/googleAds:search"
    
    query = f"""
        SELECT 
            ad_group.id,
            ad_group.name,
            ad_group.status,
            campaign.id,
            campaign.name,
            segments.date,
            metrics.clicks,
            metrics.impressions,
            metrics.cost_micros,
            metrics.conversions
        FROM ad_group
        WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
        ORDER BY segments.date DESC
    """
    
    payload = {"query": query}
    
    try:
        logger.info(f"[Google API] Fetching daily ad group insights for {customer_id}")
        response = requests.post(
            url,
            headers=_headers(access_token, login_customer_id),
            json=payload,
            timeout=30
        )
        return response
    except Exception as e:
        logger.error(f"[Google API] Daily ad group insights error: {e}")
        return None


def get_ad_daily_insights(
    access_token: str,
    customer_id: str,
    login_customer_id: str,
    start_date: str,
    end_date: str
):
    """
    Fetch daily ad metrics for a date range.
    """
    url = f"{BASE_URL}/customers/{_clean_customer_id(customer_id)}/googleAds:search"
    
    query = f"""
        SELECT 
            ad_group_ad.ad.id,
            ad_group_ad.ad.name,
            ad_group_ad.status,
            ad_group.id,
            ad_group.name,
            campaign.id,
            campaign.name,
            segments.date,
            metrics.clicks,
            metrics.impressions,
            metrics.cost_micros,
            metrics.conversions
        FROM ad_group_ad
        WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
        ORDER BY segments.date DESC
    """
    
    payload = {"query": query}
    
    try:
        logger.info(f"[Google API] Fetching daily ad insights for {customer_id}")
        response = requests.post(
            url,
            headers=_headers(access_token, login_customer_id),
            json=payload,
            timeout=30
        )
        return response
    except Exception as e:
        logger.error(f"[Google API] Daily ad insights error: {e}")
        return None

# ---------------------------------------------------------------------------
# Account info helper (used during OAuth callback)
# ---------------------------------------------------------------------------

def get_basic_account_info(access_token: str, resource_names: List[str]) -> List[Dict]:
    """
    Given a list of resource names (e.g. 'customers/1234567890'),
    fetch basic account details (id, name, isManager) for each.
    """
    customer_ids = []
    for rn in resource_names:
        cid = rn.replace("customers/", "")
        customer_ids.append(cid)

    if not customer_ids:
        return []

    return get_account_details_batch(access_token, customer_ids)


# ---------------------------------------------------------------------------
# Insights helpers (aggregated metrics, no daily segmentation)
# ---------------------------------------------------------------------------

def get_campaign_insights(
    access_token: str,
    customer_id: str,
    login_customer_id: Optional[str],
    date_range: str = "LAST_30_DAYS",
    campaign_id: Optional[str] = None,
) -> List[Dict]:
    """
    Fetch aggregated campaign-level insights for a customer.
    Optionally filter by a single campaign_id.
    """
    url = f"{BASE_URL}/customers/{_clean_customer_id(customer_id)}/googleAds:search"

    campaign_filter = ""
    if campaign_id:
        campaign_filter = f"AND campaign.id = {_clean_customer_id(str(campaign_id))}"

    query = f"""
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.average_cpc,
      metrics.cost_micros,
      metrics.conversions,
      metrics.cost_per_conversion,
      metrics.conversions_from_interactions_rate,
      metrics.value_per_conversion
    FROM campaign
    WHERE segments.date DURING {date_range}
      {campaign_filter}
    ORDER BY metrics.impressions DESC
    """

    payload = {"query": query}
    try:
        resp = requests.post(
            url,
            headers=_headers(access_token, login_customer_id),
            json=payload,
            timeout=60,
        )
        if resp.status_code != 200:
            logger.error(f"[Google Ads] Campaign insights failed {resp.status_code}: {resp.text}")
            return []
        results = resp.json().get("results", [])
        insights = []
        for item in results:
            campaign = item.get("campaign", {})
            metrics = item.get("metrics", {})
            insights.append({
                "campaign_id": campaign.get("id"),
                "campaign_name": campaign.get("name"),
                "status": campaign.get("status"),
                "channel_type": campaign.get("advertisingChannelType"),
                "impressions": metrics.get("impressions", "0"),
                "clicks": metrics.get("clicks", "0"),
                "ctr": metrics.get("ctr", 0),
                "average_cpc": metrics.get("averageCpc", 0),
                "cost_micros": metrics.get("costMicros", "0"),
                "conversions": metrics.get("conversions", 0),
                "cost_per_conversion": metrics.get("costPerConversion", 0),
                "conversion_rate": metrics.get("conversionsFromInteractionsRate", 0),
                "value_per_conversion": metrics.get("valuePerConversion", 0),
            })
        return insights
    except Exception as e:
        logger.exception(f"[Google Ads] Unexpected error fetching campaign insights: {e}")
        return []


def get_adgroup_insights(
    access_token: str,
    customer_id: str,
    login_customer_id: Optional[str],
    date_range: str = "LAST_30_DAYS",
    campaign_id: Optional[str] = None,
) -> List[Dict]:
    """
    Fetch aggregated ad-group-level insights for a customer.
    Optionally filter by campaign_id.
    """
    url = f"{BASE_URL}/customers/{_clean_customer_id(customer_id)}/googleAds:search"

    campaign_filter = ""
    if campaign_id:
        campaign_filter = f"AND campaign.id = {_clean_customer_id(str(campaign_id))}"

    query = f"""
    SELECT
      ad_group.id,
      ad_group.name,
      ad_group.status,
      ad_group.type,
      campaign.id,
      campaign.name,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.average_cpc,
      metrics.cost_micros,
      metrics.conversions
    FROM ad_group
    WHERE segments.date DURING {date_range}
      {campaign_filter}
    ORDER BY metrics.impressions DESC
    """

    payload = {"query": query}
    try:
        resp = requests.post(
            url,
            headers=_headers(access_token, login_customer_id),
            json=payload,
            timeout=60,
        )
        if resp.status_code != 200:
            logger.error(f"[Google Ads] AdGroup insights failed {resp.status_code}: {resp.text}")
            return []
        results = resp.json().get("results", [])
        insights = []
        for item in results:
            ad_group = item.get("adGroup", {})
            campaign = item.get("campaign", {})
            metrics = item.get("metrics", {})
            insights.append({
                "adgroup_id": ad_group.get("id"),
                "adgroup_name": ad_group.get("name"),
                "status": ad_group.get("status"),
                "type": ad_group.get("type"),
                "campaign_id": campaign.get("id"),
                "campaign_name": campaign.get("name"),
                "impressions": metrics.get("impressions", "0"),
                "clicks": metrics.get("clicks", "0"),
                "ctr": metrics.get("ctr", 0),
                "average_cpc": metrics.get("averageCpc", 0),
                "cost_micros": metrics.get("costMicros", "0"),
                "conversions": metrics.get("conversions", 0),
            })
        return insights
    except Exception as e:
        logger.exception(f"[Google Ads] Unexpected error fetching adgroup insights: {e}")
        return []


def get_ad_insights(
    access_token: str,
    customer_id: str,
    login_customer_id: Optional[str],
    date_range: str = "LAST_30_DAYS",
    ad_group_id: Optional[str] = None,
) -> List[Dict]:
    """
    Fetch aggregated ad-level insights for a customer.
    Optionally filter by ad_group_id.
    """
    url = f"{BASE_URL}/customers/{_clean_customer_id(customer_id)}/googleAds:search"

    adgroup_filter = ""
    if ad_group_id:
        adgroup_filter = f"AND ad_group.id = {_clean_customer_id(str(ad_group_id))}"

    query = f"""
    SELECT
      ad_group_ad.ad.id,
      ad_group_ad.ad.name,
      ad_group_ad.ad.type,
      ad_group_ad.status,
      ad_group.id,
      ad_group.name,
      campaign.id,
      campaign.name,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.cost_micros,
      metrics.conversions
    FROM ad_group_ad
    WHERE segments.date DURING {date_range}
      {adgroup_filter}
    ORDER BY metrics.impressions DESC
    """

    payload = {"query": query}
    try:
        resp = requests.post(
            url,
            headers=_headers(access_token, login_customer_id),
            json=payload,
            timeout=60,
        )
        if resp.status_code != 200:
            logger.error(f"[Google Ads] Ad insights failed {resp.status_code}: {resp.text}")
            return []
        results = resp.json().get("results", [])
        insights = []
        for item in results:
            ad = item.get("adGroupAd", {}).get("ad", {})
            ad_group = item.get("adGroup", {})
            campaign = item.get("campaign", {})
            metrics = item.get("metrics", {})
            insights.append({
                "ad_id": ad.get("id"),
                "ad_name": ad.get("name") or f"Ad {ad.get('id', '')}",
                "ad_type": ad.get("type"),
                "status": item.get("adGroupAd", {}).get("status"),
                "adgroup_id": ad_group.get("id"),
                "adgroup_name": ad_group.get("name"),
                "campaign_id": campaign.get("id"),
                "campaign_name": campaign.get("name"),
                "impressions": metrics.get("impressions", "0"),
                "clicks": metrics.get("clicks", "0"),
                "ctr": metrics.get("ctr", 0),
                "cost_micros": metrics.get("costMicros", "0"),
                "conversions": metrics.get("conversions", 0),
            })
        return insights
    except Exception as e:
        logger.exception(f"[Google Ads] Unexpected error fetching ad insights: {e}")
        return []


# ---------------------------------------------------------------------------
# Fetch ALL ad groups / ads for a customer (no campaign/adgroup filter)
# ---------------------------------------------------------------------------

def list_all_adgroups_for_customer(
    access_token: str,
    customer_id: str,
    login_customer_id: Optional[str] = None,
    date_range: str = "LAST_30_DAYS",
) -> List[Dict]:
    """
    Retrieve all ad groups across all campaigns for a customer account.
    Returns raw result dicts from the API.
    """
    url = f"{BASE_URL}/customers/{_clean_customer_id(customer_id)}/googleAds:search"

    query = f"""
    SELECT
      ad_group.id,
      ad_group.name,
      ad_group.status,
      ad_group.type,
      campaign.id,
      campaign.name,
      metrics.clicks,
      metrics.impressions,
      metrics.cost_micros,
      metrics.conversions
    FROM ad_group
    WHERE segments.date DURING {date_range}
    ORDER BY metrics.impressions DESC
    """

    payload = {"query": query}
    try:
        resp = requests.post(
            url,
            headers=_headers(access_token, login_customer_id),
            json=payload,
            timeout=60,
        )
        if resp.status_code != 200:
            logger.error(f"[Google Ads] All adgroups fetch failed {resp.status_code}: {resp.text}")
            return []
        return resp.json().get("results", [])
    except Exception as e:
        logger.exception(f"[Google Ads] Unexpected error fetching all adgroups: {e}")
        return []


def list_all_ads_for_customer(
    access_token: str,
    customer_id: str,
    login_customer_id: Optional[str] = None,
    date_range: str = "LAST_30_DAYS",
) -> List[Dict]:
    """
    Retrieve all ads across all ad groups for a customer account.
    Returns raw result dicts from the API.
    """
    url = f"{BASE_URL}/customers/{_clean_customer_id(customer_id)}/googleAds:search"

    query = f"""
    SELECT
      ad_group_ad.ad.id,
      ad_group_ad.ad.name,
      ad_group_ad.ad.type,
      ad_group_ad.ad.final_urls,
      ad_group_ad.status,
      ad_group.id,
      ad_group.name,
      campaign.id,
      campaign.name,
      metrics.clicks,
      metrics.impressions,
      metrics.cost_micros,
      metrics.ctr,
      metrics.conversions
    FROM ad_group_ad
    WHERE segments.date DURING {date_range}
    ORDER BY metrics.impressions DESC
    """

    payload = {"query": query}
    try:
        resp = requests.post(
            url,
            headers=_headers(access_token, login_customer_id),
            json=payload,
            timeout=60,
        )
        if resp.status_code != 200:
            logger.error(f"[Google Ads] All ads fetch failed {resp.status_code}: {resp.text}")
            return []
        return resp.json().get("results", [])
    except Exception as e:
        logger.exception(f"[Google Ads] Unexpected error fetching all ads: {e}")
        return []