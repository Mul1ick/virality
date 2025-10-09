"""
Google Ads API Helper Module
============================

Purpose:
--------
This module acts as a thin abstraction layer over the official Google Ads REST API (v14).  
It isolates all direct API calls from the main controller logic, following the **Single Responsibility Principle (SRP)**.

Why this exists:
----------------
Instead of calling Google Ads API endpoints directly inside FastAPI controllers,  
we maintain a separate helper module (`google_api.py`) to:
    - Keep API logic clean and reusable.
    - Make testing easier (you can mock these functions).
    - Simplify future migration (e.g., if API version changes to v15).

Main responsibilities:
----------------------
1. Build required HTTP headers with OAuth2 and developer credentials.
2. Query the MCC (Manager Account) to list all accessible customer accounts.
3. Query a specific child customer account to fetch campaign data using GAQL.
"""

import requests
from app.config import settings

BASE_URL = "https://googleads.googleapis.com/v14"


# ---------------------------------------------------------------------
# 🧩 Utility Function: Header Builder
# ---------------------------------------------------------------------
def _headers(access_token: str, login_customer_id: str | None = None):
    """
    Build the HTTP headers required for Google Ads API requests.

    Args:
        access_token (str): OAuth2 access token obtained from Google login.
        login_customer_id (str | None): Optional manager account (MCC) ID if calling on behalf of a child.

    Returns:
        dict: Properly formatted request headers for Google Ads API.

    Why it exists:
        Google Ads API requires:
        - Bearer access token (Authorization)
        - Developer token (unique to each MCC)
        - Optionally, 'login-customer-id' if querying child accounts.
    """
    headers = {
        "Authorization": f"Bearer {access_token}",
        "developer-token": getattr(settings, "DEVELOPER_TOKEN", None) or "REPLACE_ME",
    }
    if login_customer_id:
        headers["login-customer-id"] = login_customer_id
    return headers


# ---------------------------------------------------------------------
# 🧭 1. MCC (Manager Account) Function
# ---------------------------------------------------------------------
def list_accessible_customers(access_token: str):
    """
    Fetch all Google Ads accounts accessible by the authenticated MCC user.

    Endpoint:
        GET https://googleads.googleapis.com/v14/customers:listAccessibleCustomers

    Args:
        access_token (str): Valid OAuth access token.

    Returns:
        requests.Response: API response object with list of accessible customer accounts.

    Output Example:
        {
          "resourceNames": [
            "customers/9554344066",
            "customers/1234567890"
          ]
        }

    Why it exists:
        This function is used to identify which Google Ads accounts
        (child accounts) your manager account can access.
    """
    url = f"{BASE_URL}/customers:listAccessibleCustomers"
    return requests.get(url, headers=_headers(access_token))


# ---------------------------------------------------------------------
# 📊 2. Child Account Function
# ---------------------------------------------------------------------
def list_campaigns_for_child(
    access_token: str, child_customer_id: str, login_customer_id: str | None = None
):
    """
    Retrieve basic campaign metrics for a specific child account under an MCC.

    Endpoint:
        POST https://googleads.googleapis.com/v14/customers/{child_customer_id}/googleAds:search

    Args:
        access_token (str): OAuth access token of the logged-in user.
        child_customer_id (str): The target customer (child account) ID to query.
        login_customer_id (str | None): The MCC ID that owns/oversees this child.

    Returns:
        requests.Response: Raw API response containing campaign metrics.

    Output Example:
        {
          "results": [
            {
              "campaign": {
                "id": "123456789",
                "name": "Summer Sales",
                "status": "ENABLED"
              },
              "metrics": {
                "impressions": "10000",
                "clicks": "350",
                "costMicros": "123000000"
              }
            }
          ]
        }

    Why it exists:
        Once you know which child account you want to inspect (from MCC listing),
        this function allows fetching key performance indicators (KPIs)
        like clicks, impressions, and cost — all via Google Ads Query Language (GAQL).
    """
    url = f"{BASE_URL}/customers/{child_customer_id}/googleAds:search"

    # GAQL (Google Ads Query Language) query
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
    return requests.post(url, headers=_headers(access_token, login_customer_id), json=payload)


from app.config import settings

def list_test_account_campaigns(access_token: str):
    """Fetch campaigns from your Google Ads Test Account."""
    customer_id = getattr(settings, "GOOGLE_TEST_ACCOUNT_ID", None)
    if not customer_id:
        return {"error": "Missing test account ID in environment"}

    url = f"{BASE_URL}/customers/{customer_id}/googleAds:search"
    query = """
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros
    FROM campaign
    LIMIT 10
    """

    resp = requests.post(url, headers=_headers(access_token), json={"query": query})
    print(f"[Google Ads] Response: {resp.status_code}")
    return resp.json()