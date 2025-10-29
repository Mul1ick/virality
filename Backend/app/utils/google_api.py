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

# NOTE: v19 endpoints for REST Search
BASE_URL = "https://googleads.googleapis.com/v19"


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

    - Reads user's refresh_token from Mongo
    - Calls Google's OAuth token endpoint
    - Updates Mongo with the new access_token and expiry
    - Returns the new token string for immediate use
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

        # Save back to Mongo; your DB helper computes token_expiry from expires_in
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

    Endpoint:
        GET /v19/customers:listAccessibleCustomers

    Args:
        access_token: OAuth2 access token.

    Returns:
        requests.Response (or None on network error). Caller should check status_code.
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

    Strategy:
    - Choose a query context (login-customer-id / path) that has permission to see the batch.
    - Query `customer_client` for requested IDs.
    - Return a list of objects: {"id": str, "name": str, "isManager": bool}
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
            logger.warning(
                f"Using first accessible ID '{query_login_customer_id}' as fallback for batch query context. "
                f"Results may be incomplete if it lacks permissions."
            )
    except Exception:
        logger.exception("Cannot determine login_customer_id for batch query.")
        return [{"id": _clean_customer_id(str(cid)), "name": f"Account {cid} (Details N/A)", "isManager": False}
                for cid in customer_ids]

    # Build numeric IN list (no quotes for IDs)
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
        logger.info(f"Account details API call status: {resp.status_code}")
        logger.debug(f"Account details API response: {resp.text}")

        if resp.status_code == 200:
            results = resp.json().get("results", [])
            logger.info(f"Received {len(results)} results from account details query.")
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

            # Fill placeholders for any missing IDs
            missing_ids = { _clean_customer_id(str(cid)) for cid in customer_ids } - found_ids
            if missing_ids:
                logger.warning(
                    f"Could not retrieve details for some customer IDs: {missing_ids}. "
                    f"Check permissions of login ID {query_login_customer_id}."
                )
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

            logger.info(f"Processed details list (count={len(account_details)}).")
            return account_details

        logger.error(f"Failed to fetch account details batch. Status: {resp.status_code}, Response: {resp.text}")
        return [{"id": _clean_customer_id(str(cid)), "name": f"Account {cid} (Details N/A)", "isManager": False}
                for cid in customer_ids]

    except requests.exceptions.RequestException as e:
        error_detail = e.response.text if getattr(e, "response", None) else str(e)
        logger.error(f"Network error fetching account details batch: {error_detail}")
        return [{"id": _clean_customer_id(str(cid)), "name": f"Account {cid} (Details N/A)", "isManager": False}
                for cid in customer_ids]
    except Exception as e:
        logger.exception(f"Unexpected error fetching account details batch: {e}")
        return [{"id": _clean_customer_id(str(cid)), "name": f"Account {cid} (Details N/A)", "isManager": False}
                for cid in customer_ids]


def list_campaigns_for_child(
    access_token: str,
    child_customer_id: str,
    login_customer_id: Optional[str] = None
) -> Optional[requests.Response]:
    """
    Retrieve campaign + metrics for a specific client account for the last 30 days.
    """
    url = f"{BASE_URL}/customers/{_clean_customer_id(child_customer_id)}/googleAds:search"
    query = """
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      campaign.start_date,
      campaign.end_date,
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
    WHERE segments.date DURING LAST_30_DAYS
    ORDER BY metrics.impressions DESC
    """
    payload = {"query": query}
    try:
        resp = requests.post(url, headers=_headers(access_token, login_customer_id), json=payload, timeout=60)
        return resp
    except requests.exceptions.RequestException as e:
        error_detail = e.response.text if getattr(e, "response", None) else str(e)
        logger.error(f"[Google Ads] Network error fetching campaigns: {error_detail}")
        return e.response if getattr(e, "response", None) else None
    except Exception as e:
        logger.exception(f"[Google Ads] Unexpected error fetching campaigns: {e}")
        return None


def list_adgroups_for_campaign(
    access_token: str,
    child_customer_id: str,
    login_customer_id: str,
    campaign_id: str,
) -> Optional[requests.Response]:
    """
    Retrieve Ad Groups and metrics for a specific campaign (last 30 days).
    """
    url = f"{BASE_URL}/customers/{_clean_customer_id(child_customer_id)}/googleAds:search"
    cleaned_campaign_id = _clean_customer_id(str(campaign_id))  # just digits
    query = f"""
    SELECT
      ad_group.id,
      ad_group.name,
      ad_group.status,
      ad_group.type,
      metrics.clicks,
      metrics.impressions,
      metrics.cost_micros,
      metrics.conversions
    FROM ad_group
    WHERE campaign.id = {cleaned_campaign_id}
      AND segments.date DURING LAST_30_DAYS
    ORDER BY metrics.impressions DESC
    """
    payload = {"query": query}
    try:
        resp = requests.post(url, headers=_headers(access_token, login_customer_id), json=payload, timeout=60)
        return resp
    except requests.exceptions.RequestException as e:
        error_detail = e.response.text if getattr(e, "response", None) else str(e)
        logger.error(f"[Google Ads] Network error fetching ad groups: {error_detail}")
        return e.response if getattr(e, "response", None) else None
    except Exception as e:
        logger.exception(f"[Google Ads] Unexpected error fetching ad groups: {e}")
        return None


def list_ads_for_adgroup(
    access_token: str,
    child_customer_id: str,
    login_customer_id: str,
    ad_group_id: str,
) -> Optional[requests.Response]:
    """
    Retrieve Ads and metrics for a specific ad group (last 30 days).
    """
    url = f"{BASE_URL}/customers/{_clean_customer_id(child_customer_id)}/googleAds:search"
    cleaned_ad_group_id = _clean_customer_id(str(ad_group_id))
    query = f"""
    SELECT
      ad_group_ad.ad.id,
      ad_group_ad.ad.name,
      ad_group_ad.ad.type,
      ad_group_ad.ad.final_urls,
      ad_group_ad.status,
      metrics.clicks,
      metrics.impressions,
      metrics.cost_micros,
      metrics.ctr
    FROM ad_group_ad
    WHERE ad_group.id = {cleaned_ad_group_id}
      AND segments.date DURING LAST_30_DAYS
    ORDER BY metrics.impressions DESC
    """
    payload = {"query": query}
    try:
        resp = requests.post(url, headers=_headers(access_token, login_customer_id), json=payload, timeout=60)
        return resp
    except requests.exceptions.RequestException as e:
        error_detail = e.response.text if getattr(e, "response", None) else str(e)
        logger.error(f"[Google Ads] Network error fetching ads: {error_detail}")
        return e.response if getattr(e, "response", None) else None
    except Exception as e:
        logger.exception(f"[Google Ads] Unexpected error fetching ads: {e}")
        return None


def get_direct_client_accounts(access_token: str, manager_customer_id: str) -> List[Dict]:
    """
    List directly-linked, non-manager client accounts under a specific MCC.

    GAQL notes:
    - `customer_client.level=1` = direct children of the context MCC.
    - Enums/booleans are unquoted (ENABLED, false).
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
        logger.info(f"Direct clients API call status: {resp.status_code}")

        if resp.status_code == 200:
            results = resp.json().get("results", [])
            logger.info(f"Received {len(results)} results for direct clients query.")
            for item in results:
                client = item.get("customerClient", {}) or {}
                acc_id = client.get("id")
                if acc_id is not None:
                    acc_id_str = str(acc_id)
                    client_accounts.append({
                        "id": acc_id_str,
                        "name": client.get("descriptiveName", f"Client {acc_id_str}"),
                        "isManager": False,  # We filtered manager=false
                    })
            logger.info(f"Found {len(client_accounts)} direct client accounts under {manager_customer_id}.")
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


def get_basic_account_info(access_token: str, resource_names: List[str]) -> List[Dict]:
    """
    Fetch basic details (ID, name, manager) for a list of customer resource names.

    - Tries with the first resource name as the query context.
    - If Google complains about INVALID_CUSTOMER_ID, the offending IDs are skipped.
    - Returns minimal placeholders for skipped ones.
    """
    if not resource_names:
        return []

    from copy import deepcopy
    remaining = deepcopy(resource_names)
    account_details: List[Dict] = []
    errors_seen = set()

    while remaining:
        entry_customer_id = remaining[0].split("/")[-1]
        url = f"{BASE_URL}/customers/{_clean_customer_id(entry_customer_id)}/googleAds:search"
        formatted = ", ".join([f"'{name}'" for name in remaining])
        query = f"""
        SELECT customer.id, customer.descriptive_name, customer.manager
        FROM customer
        WHERE customer.resource_name IN ({formatted})
        """
        try:
            resp = requests.post(url, headers=_headers(access_token), json={"query": query}, timeout=30)
            if resp.status_code == 200:
                results = resp.json().get("results", [])
                for item in results:
                    c = item.get("customer", {}) or {}
                    cid = c.get("id")
                    account_details.append({
                        "id": cid,
                        "name": c.get("descriptiveName", f"Account {cid}"),
                        "isManager": c.get("manager", False),
                    })
                break  # success → exit loop
            elif resp.status_code == 400 and "INVALID_CUSTOMER_ID" in resp.text:
                # Identify which ID(s) caused the issue and drop them
                bad_ids = [r.split("/")[-1] for r in remaining if r.split("/")[-1] in resp.text]
                for bid in bad_ids:
                    errors_seen.add(bid)
                remaining = [r for r in remaining if r.split("/")[-1] not in bad_ids]
                logger.warning(f"Skipping invalid customer IDs: {bad_ids}")
                continue  # retry with the rest
            else:
                logger.error(f"Google Ads returned {resp.status_code}: {resp.text}")
                break
        except Exception as e:
            logger.exception(f"Error fetching basic info batch: {e}")
            break

    # Add placeholders for skipped ones
    for bid in errors_seen:
        account_details.append({
            "id": bid,
            "name": f"Account {bid} (Details N/A)",
            "isManager": False
        })

    return account_details
def get_campaign_insights(access_token: str, customer_id: str, manager_id: Optional[str] = None, date_range: str = "LAST_30_DAYS"):
    """
    Fetches historical performance insights (impressions, clicks, cost, CTR, conversions)
    for all campaigns in a Google Ads account over a given date range.

    Args:
        access_token: OAuth2 token.
        customer_id: The client account ID (no dashes).
        manager_id: Optional MCC login-customer-id for access context.
        date_range: Google Ads date range (e.g., 'LAST_7_DAYS', 'LAST_30_DAYS', 'THIS_MONTH', or custom).

    Returns:
        List[dict] containing campaign_id, date, impressions, clicks, costMicros, conversions, ctr.
    """
    url = f"{BASE_URL}/customers/{_clean_customer_id(customer_id)}/googleAds:search"

    query = f"""
    SELECT
      campaign.id,
      campaign.name,
      segments.date,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.cost_micros,
      metrics.conversions
    FROM campaign
    WHERE segments.date DURING {date_range}
    ORDER BY segments.date DESC
    """

    payload = {"query": query}
    try:
        resp = requests.post(url, headers=_headers(access_token, manager_id), json=payload, timeout=60)
        if resp.status_code == 200:
            data = []
            for row in resp.json().get("results", []):
                campaign = row.get("campaign", {})
                metrics = row.get("metrics", {})
                date = row.get("segments", {}).get("date")

                data.append({
                    "campaign_id": campaign.get("id"),
                    "campaign_name": campaign.get("name"),
                    "date": date,
                    "impressions": int(metrics.get("impressions", 0)),
                    "clicks": int(metrics.get("clicks", 0)),
                    "ctr": float(metrics.get("ctr", 0)),
                    "cost_micros": int(metrics.get("costMicros", 0)),
                    "conversions": float(metrics.get("conversions", 0))
                })
            return data
        else:
            logger.error(f"[Google Insights] Failed ({resp.status_code}): {resp.text}")
            return []
    except Exception as e:
        logger.exception(f"[Google Insights] Exception fetching insights: {e}")
        return []