"""
Shopify Controller
------------------
Handles OAuth authentication, callback verification, and data fetch routes
for Shopify platform integrations.
"""

from fastapi import APIRouter, Query, HTTPException, Request, Depends
from fastapi.responses import RedirectResponse
from app.config.config import settings
from app.utils.security import create_state_token, get_current_user_id
from app.utils.logger import get_logger
from app.services import shopify_service

router = APIRouter(prefix="/shopify", tags=["Shopify"])
logger = get_logger()

SCOPES = "read_orders,read_all_orders,read_products,read_customers,read_inventory,read_analytics"


@router.get("/login")
def shopify_login(
    shop: str = Query(..., description="The merchant's shop domain"),
    current_user_id: str = Depends(get_current_user_id)
):
    """
    Begin Shopify OAuth installation flow.
    """
    if not shop:
        raise HTTPException(status_code=400, detail="Missing 'shop' parameter")

    shop = shop.strip().lower().replace("https://", "").replace("http://", "")
    shop = shop.split("/")[0]
    if "." not in shop or not all(c.isalnum() or c in ".-" for c in shop):
        raise HTTPException(status_code=400, detail="Invalid shop domain")

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


@router.get("/callback")
def shopify_callback(request: Request, code: str, shop: str, state: str, timestamp: str):
    """
    Handle Shopify OAuth callback and save platform connection.
    """
    logger.info(f"[Shopify Callback] Received callback for {shop}")

    # Verify state
    payload = shopify_service.decode_token(state)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid state token")

    # Verify HMAC
    if not shopify_service.verify_shopify_hmac(dict(request.query_params), settings.SHOPIFY_CLIENT_SECRET):
        raise HTTPException(status_code=400, detail="Invalid HMAC signature")

    # Verify timestamp
    try:
        ts = int(timestamp)
        if abs(time.time() - ts) > 3600:
            raise HTTPException(status_code=400, detail="Stale timestamp")
    except Exception:
        pass

    # Exchange code for token
    access_token = shopify_service.exchange_code_for_token(shop, code)

    # Save connection
    shopify_service.save_or_update_platform_connection(
        user_id=user_id,
        platform="shopify",
        platform_data={"access_token": access_token, "shop_url": shop}
    )
    logger.info(f"[Shopify Callback] ✅ Saved connection for user={user_id}, shop={shop}")
    return RedirectResponse(url=f"http://localhost:8080/select-shopify?user_id={user_id}")


# --------------------------- Data Endpoints --------------------------- #

@router.get("/orders/{user_id}")
def fetch_orders(user_id: str, current_user_id: str = Depends(get_current_user_id)):
    details = shopify_service.get_connection_or_403(user_id, current_user_id)
    return shopify_service.fetch_and_save(
        "orders", user_id, shopify_service.get_all_orders,
        details["shop_url"], details["access_token"]
    )


@router.get("/products/{user_id}")
def fetch_products(user_id: str, current_user_id: str = Depends(get_current_user_id)):
    details = shopify_service.get_connection_or_403(user_id, current_user_id)
    return shopify_service.fetch_and_save(
        "products", user_id, shopify_service.get_all_products,
        details["shop_url"], details["access_token"]
    )


@router.get("/customers/{user_id}")
def fetch_customers(user_id: str, current_user_id: str = Depends(get_current_user_id)):
    details = shopify_service.get_connection_or_403(user_id, current_user_id)
    return shopify_service.fetch_and_save(
        "customers", user_id, shopify_service.get_all_customers,
        details["shop_url"], details["access_token"]
    )


@router.get("/collections/{user_id}")
def fetch_collections(user_id: str, current_user_id: str = Depends(get_current_user_id)):
    details = shopify_service.get_connection_or_403(user_id, current_user_id)
    return shopify_service.fetch_and_save(
        "collections", user_id, shopify_service.get_all_collections,
        details["shop_url"], details["access_token"]
    )


@router.get("/inventory/{user_id}")
def fetch_inventory(user_id: str, current_user_id: str = Depends(get_current_user_id)):
    details = shopify_service.get_connection_or_403(user_id, current_user_id)
    return shopify_service.fetch_and_save(
        "inventory", user_id, shopify_service.get_inventory_levels,
        details["shop_url"], details["access_token"]
    )
