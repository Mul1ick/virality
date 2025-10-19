# app/utils/google_api.py
import requests
from app.config import settings

BASE_URL = "https://googleads.googleapis.com/v19"


def _headers(access_token: str, login_customer_id: str | None = None):
    dev_token = getattr(settings, "GOOGLE_DEVELOPER_TOKEN", None) or getattr(settings, "DEVELOPER_TOKEN", None)
    if not dev_token:
        raise RuntimeError("Missing GOOGLE_DEVELOPER_TOKEN in .env (settings.GOOGLE_DEVELOPER_TOKEN)")
    headers = {
        "Authorization": f"Bearer {access_token}",
        "developer-token": dev_token,
    }
    if login_customer_id:
        headers["login-customer-id"] = login_customer_id
    return headers


def _clean_customer_id(customer_id: str) -> str:
    # Google accepts digits only; strip any dashes the UI might show
    return customer_id.replace("-", "")


def list_accessible_customers(access_token: str):
    """
    Fetch all Google Ads accounts accessible by the authenticated user.
    Endpoint:
        GET https://googleads.googleapis.com/v19/customers:listAccessibleCustomers
    """
    url = f"{BASE_URL}/customers:listAccessibleCustomers"
    resp = requests.get(url, headers=_headers(access_token))
    if resp.status_code != 200:
        print(f"[Google Ads] Failed to list customers: {resp.text}")
    return resp


def list_campaigns_for_child(access_token: str, child_customer_id: str, login_customer_id: str | None = None):
    """
    Retrieve basic campaign metrics for a specific child account.
    Endpoint:
        POST https://googleads.googleapis.com/v19/customers/{child_customer_id}/googleAds:search
    """
    url = f"{BASE_URL}/customers/{_clean_customer_id(child_customer_id)}/googleAds:search"
    query = """
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros
    FROM campaign
    WHERE segments.date DURING LAST_7_DAYS
    LIMIT 10
    """
    payload = {"query": query}
    resp = requests.post(url, headers=_headers(access_token, login_customer_id), json=payload)
    if resp.status_code != 200:
        print(f"[Google Ads] Campaign fetch failed: {resp.text}")
    return resp
