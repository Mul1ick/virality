from fastapi import HTTPException
import requests, hmac, hashlib, time, urllib.parse
from app.utils.logger import get_logger
from app.database.mongo_client import (
    save_or_update_platform_connection,
    get_platform_connection_details,
    save_items
)
from app.utils.shopify_api import (
    get_all_orders, get_all_products, get_all_customers,
    get_all_collections, get_inventory_levels
)
from app.utils.security import decode_token
from app.config.settings import settings

logger = get_logger()


def verify_shopify_hmac(query_dict: dict, secret: str) -> bool:
    """
    Verify HMAC signature in Shopify callback query parameters.
    """
    q = [(k, v) for k, v in query_dict.items() if k not in ("hmac", "signature")]
    q.sort(key=lambda kv: kv[0])
    msg = urllib.parse.urlencode(q, doseq=True)
    digest = hmac.new(secret.encode(), msg.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(digest, query_dict.get("hmac", ""))


def exchange_code_for_token(shop: str, code: str) -> str:
    """
    Exchange authorization code for permanent access token.
    """
    try:
        resp = requests.post(
            f"https://{shop}/admin/oauth/access_token",
            json={
                "client_id": settings.SHOPIFY_CLIENT_ID,
                "client_secret": settings.SHOPIFY_CLIENT_SECRET,
                "code": code,
            },
            timeout=15
        )
        resp.raise_for_status()
        data = resp.json()
        access_token = data.get("access_token")
        if not access_token:
            raise ValueError("Missing access_token")
        logger.info(f"[Shopify Service] Token retrieved for {shop}")
        return access_token
    except Exception as e:
        logger.exception(f"[Shopify Service] Token exchange failed: {e}")
        raise HTTPException(status_code=500, detail="Token exchange failed")


def get_connection_or_403(user_id: str, current_user_id: str):
    """
    Retrieve and validate Shopify connection for the given user.
    """
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    details = get_platform_connection_details(user_id, "shopify")
    if not details or not details.get("access_token") or not details.get("shop_url"):
        raise HTTPException(status_code=404, detail="Shopify connection missing or incomplete.")
    return details


def fetch_and_save(resource_type: str, user_id: str, func, shop_url: str, token: str):
    """
    Fetch a resource type (orders, products, etc.) and save to DB.
    """
    try:
        data = func(shop_url, token)
        if data:
            save_items(f"shopify_{resource_type}", user_id, data, "shopify")
            logger.info(f"[Shopify {resource_type.title()}] Saved {len(data)} for {user_id}")
        return {"count": len(data or []), "user_id": user_id}
    except Exception as e:
        logger.exception(f"[Shopify {resource_type.title()}] Failed: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching {resource_type}.")
