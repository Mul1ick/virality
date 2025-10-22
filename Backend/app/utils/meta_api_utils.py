# app/utils/meta_api_utils.py
import asyncio
from datetime import date
from dateutil.relativedelta import relativedelta
from dateutil.rrule import rrule, MONTHLY
import httpx
from fastapi import HTTPException

from app.utils.logger import get_logger

logger = get_logger()

def generate_monthly_ranges(start_date: date, end_date: date):
    """
    Generates clean, calendar-aligned monthly start and end date ranges.
    The first range starts from the provided start_date and ends on the last day of that month.
    Subsequent ranges are full calendar months.
    The final range ends on the provided end_date.
    """
    ranges = []
    current_date = start_date
    while current_date <= end_date:
        # The start of the range is the current date in the loop
        range_start = current_date
        
        # The end of the range is the last day of the current month
        range_end = current_date.replace(day=1) + relativedelta(months=1, days=-1)
        
        # If the calculated end of the month is past the overall end_date, clamp it to the end_date
        if range_end > end_date:
            range_end = end_date
        
        ranges.append((range_start.strftime("%Y-%m-%d"), range_end.strftime("%Y-%m-%d")))
        
        # Move to the first day of the *next* month for the start of the next iteration
        current_date = current_date.replace(day=1) + relativedelta(months=1)
        
    return ranges


async def fetch_paginated_insights(start_url: str, params: dict):
    """
    Asynchronously fetches and yields all pages of data from a Meta API endpoint.
    Handles rate limiting with asyncio.sleep.
    """
    all_data = []
    next_url = start_url

    async with httpx.AsyncClient(timeout=60.0) as client:
        while next_url:
            try:
                resp = await client.get(next_url, params=params)
                
                # Check for rate limiting header (x-business-use-case-usage)
                usage = resp.headers.get('x-business-use-case-usage')
                if usage:
                    logger.info(f"Meta API Usage: {usage}")
                    # A simple check: if call_count is high, pause briefly
                    try:
                        # The ad account id is prefixed with 'act_' in the API response but not in the header key
                        ad_account_id_key = params.get('ad_account_id', '').replace('act_', '')
                        usage_dict = eval(usage)
                        if usage_dict.get(ad_account_id_key, [{}])[0].get('call_count', 0) > 80:
                            logger.warning("Approaching rate limit, pausing for 10 seconds...")
                            await asyncio.sleep(10)
                    except Exception:
                        pass # Ignore parsing errors

                if resp.status_code == 400 and "temporarily unavailable" in resp.text:
                    logger.warning(f"API endpoint temporarily unavailable, retrying in 30s. URL: {next_url}")
                    await asyncio.sleep(30)
                    continue

                resp.raise_for_status()
                data = resp.json()

                if "data" in data:
                    all_data.extend(data["data"])

                # Check for the next page URL
                next_url = data.get("paging", {}).get("next")
                # Clear params after the first request as they are included in the 'next' URL
                params = {}

            except httpx.ReadTimeout:
                logger.warning(f"Read timeout. Retrying in 15 seconds. URL: {next_url}")
                await asyncio.sleep(15)
            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error fetching insights: {e.response.status_code} - {e.response.text}")
                # For critical errors like auth failure, stop trying.
                if e.response.status_code in [401, 403]:
                    raise HTTPException(status_code=e.response.status_code, detail=f"Meta authentication error: {e.response.text}")
                break # For other server errors, stop processing this page.
            except Exception as e:
                logger.error(f"An unexpected error occurred during API fetch: {e}")
                break

    return all_data

