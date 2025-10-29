from fastapi import APIRouter, Query, HTTPException, Request, Depends
from fastapi.responses import RedirectResponse
import requests, hmac, hashlib, time, urllib.parse
from app.config import settings
from app.database import save_or_update_platform_connection, get_platform_connection_details, save_items
from app.utils.security import create_state_token, decode_token, get_current_user_id
from app.utils.logger import get_logger
from app.utils.shopify_api import (
    get_all_orders, get_all_products, get_all_customers, 
    get_all_collections, get_inventory_levels
)

router = APIRouter(prefix="/shopify", tags=["Shopify"])
logger = get_logger()

SCOPES = "read_orders,read_all_orders,read_products,read_customers,read_inventory,read_analytics"

# ---------------------------------------------------------------------------
# 🔐 OAuth Phase 1 — Login / Install
# ---------------------------------------------------------------------------
@router.get("/login")
def shopify_login(
    shop: str = Query(..., description="The merchant's shop domain"),
    current_user_id: str = Depends(get_current_user_id)
):
    if not shop:
        raise HTTPException(status_code=400, detail="Missing 'shop' parameter")
    
    # Clean up input
    shop = shop.strip().lower()
    shop = shop.replace("https://", "").replace("http://", "")
    shop = shop.split("/")[0]  # Remove any path
    
    # Basic validation - just check it's a valid domain format
    if not shop or len(shop) < 3:
        raise HTTPException(status_code=400, detail="Invalid shop domain")
    
    # Must have at least one dot (domain.tld)
    if "." not in shop:
        raise HTTPException(
            status_code=400, 
            detail="Invalid domain format. Must be like 'storename.myshopify.com' or 'yourdomain.com'"
        )
    
    # Check for obviously invalid characters
    if not all(c.isalnum() or c in ".-" for c in shop):
        raise HTTPException(status_code=400, detail="Domain contains invalid characters")

    state_jwt = create_state_token({"sub": current_user_id})
    auth_url = (
        f"https://{shop}/admin/oauth/authorize?"
        f"client_id={settings.SHOPIFY_CLIENT_ID}"
        f"&scope={SCOPES}"
        f"&redirect_uri={settings.SHOPIFY_REDIRECT_URI}"
        f"&state={state_jwt}"
    )
    logger.info(f"[Shopify OAuth] User={current_user_id} initiating install for {shop}")
    return {"redirect_url": auth_url}


# ---------------------------------------------------------------------------
# 🔁 OAuth Phase 2 — Callback
# ---------------------------------------------------------------------------
def verify_shopify_hmac(query_dict: dict, secret: str) -> bool:
    q = [(k, v) for k, v in query_dict.items() if k not in ("hmac", "signature")]
    q.sort(key=lambda kv: kv[0])
    msg = urllib.parse.urlencode(q, doseq=True)
    digest = hmac.new(secret.encode(), msg.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(digest, query_dict.get("hmac", ""))


@router.get("/callback")
def shopify_callback(request: Request, code: str, shop: str, state: str, timestamp: str):
    logger.info(f"[Shopify Callback] Received callback for {shop}")

    # 1️⃣ Decode state JWT
    try:
        payload = decode_token(state)
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("Missing user_id in state token")
        logger.info(f"[Shopify Callback] State verified for user={user_id}")
    except Exception as e:
        logger.error(f"[Shopify Callback] Invalid state: {e}")
        return RedirectResponse(url="http://localhost:8080/profile?connect_status=shopify_error&error=state_invalid")

    # 2️⃣ Verify HMAC
    qp = dict(request.query_params)
    if not verify_shopify_hmac(qp, settings.SHOPIFY_CLIENT_SECRET):
        logger.error(f"[Shopify Callback] Invalid HMAC for shop={shop}")
        return RedirectResponse(url="http://localhost:8080/profile?connect_status=shopify_error&error=hmac_invalid")

    # 3️⃣ Timestamp freshness
    try:
        ts = int(timestamp)
        if abs(time.time() - ts) > 3600:
            logger.warning(f"[Shopify Callback] Stale timestamp for {shop}")
            return RedirectResponse(url="http://localhost:8080/profile?connect_status=shopify_error&error=stale_timestamp")
    except Exception:
        pass

    # 4️⃣ Exchange code for token
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
        logger.info(f"[Shopify Callback] Token retrieved for shop={shop}")
    except Exception as e:
        logger.exception(f"[Shopify Callback] Token exchange failed: {e}")
        return RedirectResponse(url="http://localhost:8080/profile?connect_status=shopify_error&error=token_exchange_failed")

    # 5️⃣ Save connection
    save_or_update_platform_connection(
        user_id=user_id,
        platform="shopify",
        platform_data={"access_token": access_token, "shop_url": shop}
    )
    logger.info(f"[Shopify Callback] ✅ Saved connection for user={user_id}, shop={shop}")

    # 🔄 Redirect to selection page like Meta/Google
    return RedirectResponse(url=f"http://localhost:8080/select-shopify?user_id={user_id}")


# ---------------------------------------------------------------------------
# 📦 Data Endpoints
# ---------------------------------------------------------------------------
def _get_connection_or_403(user_id: str, current_user_id: str):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    details = get_platform_connection_details(user_id, "shopify")
    if not details or not details.get("access_token") or not details.get("shop_url"):
        raise HTTPException(status_code=404, detail="Shopify connection missing or incomplete.")
    return details


@router.get("/orders/{user_id}")
def fetch_orders(user_id: str, current_user_id: str = Depends(get_current_user_id)):
    details = _get_connection_or_403(user_id, current_user_id)
    shop_url, token = details["shop_url"], details["access_token"]
    logger.info(f"[Shopify Orders] Fetching all orders for {shop_url}")
    try:
        orders = get_all_orders(shop_url, token)
        if orders:
            save_items("shopify_orders", user_id, orders, "shopify")
            logger.info(f"[Shopify Orders] Saved {len(orders)} orders for {user_id}")
        return {"count": len(orders or []), "user_id": user_id}
    except Exception as e:
        logger.exception(f"[Shopify Orders] Failed: {e}")
        raise HTTPException(status_code=500, detail="Error fetching orders.")


@router.get("/products/{user_id}")
def fetch_products(user_id: str, current_user_id: str = Depends(get_current_user_id)):
    details = _get_connection_or_403(user_id, current_user_id)
    shop_url, token = details["shop_url"], details["access_token"]
    logger.info(f"[Shopify Products] Fetching all products for {shop_url}")
    try:
        products = get_all_products(shop_url, token)
        if products:
            save_items("shopify_products", user_id, products, "shopify")
            logger.info(f"[Shopify Products] Saved {len(products)} products for {user_id}")
        return {"count": len(products or []), "user_id": user_id}
    except Exception as e:
        logger.exception(f"[Shopify Products] Failed: {e}")
        raise HTTPException(status_code=500, detail="Error fetching products.")


@router.get("/customers/{user_id}")
def fetch_customers(user_id: str, current_user_id: str = Depends(get_current_user_id)):
    details = _get_connection_or_403(user_id, current_user_id)
    shop_url, token = details["shop_url"], details["access_token"]
    try:
        customers = get_all_customers(shop_url, token)
        if customers:
            save_items("shopify_customers", user_id, customers, "shopify")
            logger.info(f"[Shopify Customers] Saved {len(customers)} for {user_id}")
        return {"count": len(customers or []), "user_id": user_id}
    except Exception as e:
        logger.exception(f"[Shopify Customers] Failed: {e}")
        raise HTTPException(status_code=500, detail="Error fetching customers.")


@router.get("/collections/{user_id}")
def fetch_collections(user_id: str, current_user_id: str = Depends(get_current_user_id)):
    details = _get_connection_or_403(user_id, current_user_id)
    shop_url, token = details["shop_url"], details["access_token"]
    try:
        cols = get_all_collections(shop_url, token)
        if cols:
            save_items("shopify_collections", user_id, cols, "shopify")
        return {"count": len(cols or []), "user_id": user_id}
    except Exception as e:
        logger.exception(f"[Shopify Collections] Failed: {e}")
        raise HTTPException(status_code=500, detail="Error fetching collections.")


@router.get("/inventory/{user_id}")
def fetch_inventory(user_id: str, current_user_id: str = Depends(get_current_user_id)):
    details = _get_connection_or_403(user_id, current_user_id)
    shop_url, token = details["shop_url"], details["access_token"]
    try:
        inv = get_inventory_levels(shop_url, token)
        if inv:
            save_items("shopify_inventory", user_id, inv, "shopify")
        return {"count": len(inv or []), "user_id": user_id}
    except Exception as e:
        logger.exception(f"[Shopify Inventory] Failed: {e}")
        raise HTTPException(status_code=500, detail="Error fetching inventory.")