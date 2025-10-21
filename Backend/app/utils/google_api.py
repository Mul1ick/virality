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

# In app/utils/google_api.py
def list_accessible_customers(access_token: str):
    """
    Fetch all Google Ads accounts accessible by the authenticated user.
    """
    url = f"{BASE_URL}/customers:listAccessibleCustomers"
    resp = requests.get(url, headers=_headers(access_token))
    if resp.status_code != 200:
        print(f"[Google Ads] Failed to list customers: {resp.text}")
    return resp

# In app/utils/google_api.py
# REPLACE your function with this corrected version

def list_campaigns_for_child(access_token: str, child_customer_id: str, login_customer_id: str | None = None):
    """
    Retrieve a comprehensive set of campaign metrics for a specific child account.
    This query is the closest practical equivalent to a 'SELECT *'.
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
      campaign_budget.amount_micros,  # <--- THIS IS THE CORRECTED LINE
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
    resp = requests.post(url, headers=_headers(access_token, login_customer_id), json=payload)
    if resp.status_code != 200:
        print(f"[Google Ads] Campaign fetch failed: {resp.text}")
    return resp

def list_adgroups_for_campaign(access_token: str, child_customer_id: str, login_customer_id: str, campaign_id: str):
    """
    Retrieve Ad Groups and their metrics for a specific campaign.
    """
    url = f"{BASE_URL}/customers/{_clean_customer_id(child_customer_id)}/googleAds:search"
    query = f"""
    SELECT
      ad_group.id, ad_group.name, ad_group.status, ad_group.type,
      metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions
    FROM ad_group
    WHERE campaign.id = {campaign_id} AND segments.date DURING LAST_30_DAYS
    """
    payload = {"query": query}
    resp = requests.post(url, headers=_headers(access_token, login_customer_id), json=payload)
    if resp.status_code != 200:
        print(f"[Google Ads] Ad Group fetch failed: {resp.text}")
    return resp


def list_ads_for_adgroup(access_token: str, child_customer_id: str, login_customer_id: str, ad_group_id: str):
    """
    Retrieve Ads and their metrics for a specific Ad Group.
    """
    url = f"{BASE_URL}/customers/{_clean_customer_id(child_customer_id)}/googleAds:search"
    query = f"""
    SELECT
      ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.ad.type, ad_group_ad.ad.final_urls,
      ad_group_ad.status, metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.ctr
    FROM ad_group_ad
    WHERE ad_group.id = {ad_group_id} AND segments.date DURING LAST_30_DAYS
    """
    payload = {"query": query}
    resp = requests.post(url, headers=_headers(access_token, login_customer_id), json=payload)
    if resp.status_code != 200:
        print(f"[Google Ads] Ad fetch failed: {resp.text}")
    return resp