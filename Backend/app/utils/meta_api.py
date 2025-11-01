"""
Meta API Utilities
------------------
Provides asynchronous utilities for fetching paginated ad insights
and generating clean monthly ranges for historical analysis.
"""

import asyncio
import ast
from datetime import date
from typing import List, Tuple, Dict, Any
from dateutil.relativedelta import relativedelta
import httpx
from fastapi import HTTPException

from app.utils.logger import get_logger

logger = get_logger()


# ---------------------------------------------------------------------------
# 📅 Date Utilities
# ---------------------------------------------------------------------------
def generate_monthly_ranges(start_date: date, end_date: date) -> List[Tuple[str, str]]:
    """
    Generate monthly date ranges between start_date and end_date, aligned to calendar months.

    Args:
        start_date (date): The starting date.
        end_date (date): The ending date.

    Returns:
        list[tuple[str, str]]: List of (start_date, end_date) strings for each month.
    """
    ranges: List[Tuple[str, str]] = []
    current_date = start_date

    while current_date <= end_date:
        range_start = current_date
        range_end = current_date.replace(day=1) + relativedelta(months=1, days=-1)

        if range_end > end_date:
            range_end = end_date

        ranges.append((range_start.strftime("%Y-%m-%d"), range_end.strftime("%Y-%m-%d")))
        current_date = current_date.replace(day=1) + relativedelta(months=1)

    return ranges


# ---------------------------------------------------------------------------
# 🔁 Async Pagination Helper
# ---------------------------------------------------------------------------
async def fetch_paginated_insights(start_url: str, params: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Asynchronously fetch all pages of insights data from the Meta Graph API.

    Handles:
        - Rate limiting (x-business-use-case-usage header)
        - Temporary unavailability (status 400)
        - Auth errors (401/403)
        - Pagination via 'paging.next'

    Args:
        start_url (str): Base endpoint to start fetching from.
        params (dict): Query parameters for the first request.

    Returns:
        list[dict]: Combined list of all data objects fetched across pages.
    """
    all_data: List[Dict[str, Any]] = []
    next_url: str = start_url

    async with httpx.AsyncClient(timeout=60.0) as client:
        while next_url:
            try:
                resp = await client.get(next_url, params=params)
                usage_header = resp.headers.get("x-business-use-case-usage")

                # 🧭 Handle rate-limit header
                if usage_header:
                    try:
                        usage_data = ast.literal_eval(usage_header)
                        logger.info(f"[Meta API] Usage header: {usage_data}")
                        # Throttle if call count exceeds 80%
                        account_key = params.get("ad_account_id", "").replace("act_", "")
                        if usage_data.get(account_key, [{}])[0].get("call_count", 0) > 80:
                            logger.warning("Approaching rate limit. Sleeping 10s.")
                            await asyncio.sleep(10)
                    except Exception:
                        pass

                # Retry if endpoint temporarily unavailable
                if resp.status_code == 400 and "temporarily unavailable" in resp.text:
                    logger.warning(f"[Meta API] Temporarily unavailable, retrying in 30s: {next_url}")
                    await asyncio.sleep(30)
                    continue

                resp.raise_for_status()
                data = resp.json()

                # Accumulate data
                if "data" in data:
                    all_data.extend(data["data"])

                # Follow pagination link if available
                next_url = data.get("paging", {}).get("next", None)
                params = {}  # clear params after first request

                await asyncio.sleep(1)

            except httpx.ReadTimeout:
                logger.warning(f"[Meta API] Read timeout. Retrying in 15s.")
                await asyncio.sleep(15)
            except httpx.HTTPStatusError as e:
                logger.error(f"[Meta API] HTTP error {e.response.status_code}: {e.response.text}")

                is_rate_limit = False
                if e.response.status_code == 403:
                    try:
                        error_data = e.response.json()
                        error_type = error_data.get("error", {}).get("type")
                        is_transient = error_data.get("error", {}).get("is_transient")
                        if error_type == "OAuthException" and is_transient:
                            is_rate_limit = True
                    except Exception:
                        pass # Not a JSON response, not a rate limit we can parse

                if is_rate_limit:
                    logger.warning("[Meta API] Rate limit hit. Sleeping for 60 seconds...")
                    await asyncio.sleep(60) # Sleep for 1 minute
                    continue # Retry the same request (next_url hasn't changed)

                if e.response.status_code in [401, 403]:
                    raise HTTPException(status_code=e.response.status_code, detail="Meta auth failure.")
                break
            except Exception as e:
                logger.exception(f"[Meta API] Unexpected error: {e}")
                break

    logger.info(f"[Meta API] Completed pagination. Total records: {len(all_data)}")
    return all_data
