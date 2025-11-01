
"""
Shopify Controller
------------------
Complete OAuth flow matching Meta/Google patterns
"""

from fastapi import APIRouter, Query, HTTPException, Request, Depends
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from app.config.config import settings
from typing import Optional
from app.utils.security import create_state_token, decode_token, get_current_user_id
from app.utils.logger import get_logger
from app.services import shopify_service
from app.database.mongo_client import save_or_update_platform_connection

router = APIRouter(tags=["Shopify"])
logger = get_logger()

SCOPES = "read_orders,read_all_orders,read_products,read_customers,read_inventory,read_analytics"


# ---------------------------------------------------------------------------
# 🔐 OAuth Flow
# ---------------------------------------------------------------------------
@router.get("/login")
def shopify_login(
    shop: str = Query(..., description="The merchant's shop domain"),
    current_user_id: str = Depends(get_current_user_id)
):
    """
    Begin Shopify OAuth installation flow WITH user authentication.
    """
    if not shop:
        raise HTTPException(status_code=400, detail="Missing 'shop' parameter")

    # Clean shop domain
    shop = shop.strip().lower().replace("https://", "").replace("http://", "")
    shop = shop.split("/")[0]
    if "." not in shop or not all(c.isalnum() or c in ".-" for c in shop):
        raise HTTPException(status_code=400, detail="Invalid shop domain")

    # Create state token with user_id
    state_jwt = create_state_token({"sub": current_user_id, "shop": shop})
    
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
def shopify_callback(
    request: Request,
    code: str,
    shop: str,
    hmac: str,
    timestamp: str,
    state: str
):
    """
    Handle Shopify OAuth callback and redirect to shop selection.
    """
    logger.info(f"[Shopify Callback] Received callback for {shop}")

    # Verify state and extract user_id
    try:
        payload = decode_token(state)
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("Missing user ID in state")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid state: {e}")

    # Verify HMAC
    if not shopify_service.verify_shopify_hmac(
        dict(request.query_params),
        settings.SHOPIFY_CLIENT_SECRET
    ):
        raise HTTPException(status_code=400, detail="Invalid HMAC signature")

    # Exchange code for access token
    access_token = shopify_service.exchange_code_for_token(shop, code)

    # 🔥 SAVE WITH SCOPES - This ensures permissions are tracked
    save_or_update_platform_connection(
        user_id=user_id,
        platform="shopify",
        platform_data={
            "access_token": access_token,
            "shop_url": shop,
            "connected": True,
            "scopes": SCOPES,  # 🔥 ADD THIS LINE
        }
    )

    logger.info(f"[Shopify Callback] ✅ Saved connection for user={user_id}, shop={shop}")
    
    return RedirectResponse(
        url=f"http://localhost:8080/select-shopify?user_id={user_id}"
    )

# ---------------------------------------------------------------------------
# 🏪 Shop Confirmation
# ---------------------------------------------------------------------------
class ShopConfirmation(BaseModel):
    shop_url: str


@router.post("/confirm-shop")
def confirm_shop(
    confirmation: ShopConfirmation,
    user_id: str = Depends(get_current_user_id)
):
    """
    User confirms the Shopify shop selection.
    """
    # Update connection as confirmed
    save_or_update_platform_connection(
        user_id=user_id,
        platform="shopify",
        platform_data={
            "shop_url": confirmation.shop_url,
            "connected": True
        }
    )
    
    logger.info(f"[Shopify] ✅ User {user_id} confirmed shop {confirmation.shop_url}")
    return {
        "message": "Shopify shop confirmed",
        "shop_url": confirmation.shop_url
    }


# --------------------------- Data Endpoints --------------------------- #

@router.get("/orders/{user_id}")
def fetch_orders(
    user_id: str,
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    current_user_id: str = Depends(get_current_user_id)
):
    """Fetch Shopify orders (supports historical pull)"""
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    details = shopify_service.get_connection_or_403(user_id, current_user_id)
    result = shopify_service.fetch_and_save(
        "orders",
        user_id,
        shopify_service.get_all_orders,
        details["shop_url"],
        details["access_token"],
        start_date=start_date,
        end_date=end_date,
    )

    return {
        "data": result.get("data", []),
        "count": result.get("count", 0),
        "user_id": user_id,
        "start_date": start_date,
        "end_date": end_date,
    }



@router.get("/products/{user_id}")
def fetch_products(
    user_id: str,
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    current_user_id: str = Depends(get_current_user_id)
):
    """Fetch Shopify products (supports historical pull)."""
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    details = shopify_service.get_connection_or_403(user_id, current_user_id)
    result = shopify_service.fetch_and_save(
        "products",
        user_id,
        shopify_service.get_all_products,
        details["shop_url"],
        details["access_token"],
        start_date=start_date,
        end_date=end_date,
    )

    return {
        "data": result.get("data", []),
        "count": result.get("count", 0),
        "user_id": user_id,
        "start_date": start_date,
        "end_date": end_date,
    }


@router.get("/customers/{user_id}")
def fetch_customers(
    user_id: str,
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    current_user_id: str = Depends(get_current_user_id)
):
    """Fetch Shopify customers (supports historical pull)."""
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    details = shopify_service.get_connection_or_403(user_id, current_user_id)
    result = shopify_service.fetch_and_save(
        "customers",
        user_id,
        shopify_service.get_all_customers,
        details["shop_url"],
        details["access_token"],
        start_date=start_date,
        end_date=end_date,
    )

    return {
        "data": result.get("data", []),
        "count": result.get("count", 0),
        "user_id": user_id,
        "start_date": start_date,
        "end_date": end_date,
    }
    
    
@router.get("/collections/{user_id}")
def fetch_collections(
    user_id: str,
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    current_user_id: str = Depends(get_current_user_id)
):
    """Fetch Shopify collections (supports historical pull)."""
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    details = shopify_service.get_connection_or_403(user_id, current_user_id)
    result = shopify_service.fetch_and_save(
        "collections",
        user_id,
        shopify_service.get_all_collections,
        details["shop_url"],
        details["access_token"],
        start_date=start_date,
        end_date=end_date,
    )

    return {
        "data": result.get("data", []),
        "count": result.get("count", 0),
        "user_id": user_id,
        "start_date": start_date,
        "end_date": end_date,
    }


@router.get("/inventory/{user_id}")
def fetch_inventory_levels(
    user_id: str,
    start_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    current_user_id: str = Depends(get_current_user_id)
):
    """Fetch Shopify inventory levels (supports historical pull)."""
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    details = shopify_service.get_connection_or_403(user_id, current_user_id)
    result = shopify_service.fetch_and_save(
        "inventory",
        user_id,
        shopify_service.get_inventory_levels,
        details["shop_url"],
        details["access_token"],
        start_date=start_date,
        end_date=end_date,
    )

    return {
        "data": result.get("data", []),
        "count": result.get("count", 0),
        "user_id": user_id,
        "start_date": start_date,
        "end_date": end_date,
    }

# """
# Shopify Controller
# ------------------
# Handles OAuth authentication, callback verification, and data fetch routes
# for Shopify platform integrations.
# """

# from fastapi import APIRouter, Query, HTTPException, Request, Depends
# from fastapi.responses import RedirectResponse
# from app.config.config import settings
# from app.utils.security import create_state_token, get_current_user_id
# from app.utils.logger import get_logger
# from app.services import shopify_service

# router = APIRouter(prefix="/shopify", tags=["Shopify"])
# logger = get_logger()

# SCOPES = "read_orders,read_all_orders,read_products,read_customers,read_inventory,read_analytics"


# @router.get("/login")
# def shopify_login(
#     shop: str = Query(..., description="The merchant's shop domain"),
#     current_user_id: str = Depends(get_current_user_id)
# ):
#     """
#     Begin Shopify OAuth installation flow.
#     """
#     if not shop:
#         raise HTTPException(status_code=400, detail="Missing 'shop' parameter")

#     shop = shop.strip().lower().replace("https://", "").replace("http://", "")
#     shop = shop.split("/")[0]
#     if "." not in shop or not all(c.isalnum() or c in ".-" for c in shop):
#         raise HTTPException(status_code=400, detail="Invalid shop domain")

#     state_jwt = create_state_token({"sub": current_user_id})
#     auth_url = (
#         f"https://{shop}/admin/oauth/authorize?"
#         f"client_id={settings.SHOPIFY_CLIENT_ID}"
#         f"&scope={SCOPES}"
#         f"&redirect_uri={settings.SHOPIFY_REDIRECT_URI}"
#         f"&state={state_jwt}"
#     )
#     logger.info(f"[Shopify OAuth] User={current_user_id} initiating install for {shop}")
#     return {"redirect_url": auth_url}


# @router.get("/callback")
# def shopify_callback(request: Request, code: str, shop: str, state: str, timestamp: str):
#     """
#     Handle Shopify OAuth callback and save platform connection.
#     """
#     logger.info(f"[Shopify Callback] Received callback for {shop}")

#     # Verify state
#     payload = shopify_service.decode_token(state)
#     user_id = payload.get("sub")
#     if not user_id:
#         raise HTTPException(status_code=400, detail="Invalid state token")

#     # Verify HMAC
#     if not shopify_service.verify_shopify_hmac(dict(request.query_params), settings.SHOPIFY_CLIENT_SECRET):
#         raise HTTPException(status_code=400, detail="Invalid HMAC signature")

#     # Verify timestamp
#     try:
#         ts = int(timestamp)
#         if abs(time.time() - ts) > 3600:
#             raise HTTPException(status_code=400, detail="Stale timestamp")
#     except Exception:
#         pass

#     # Exchange code for token
#     access_token = shopify_service.exchange_code_for_token(shop, code)

#     # Save connection
#     shopify_service.save_or_update_platform_connection(
#         user_id=user_id,
#         platform="shopify",
#         platform_data={"access_token": access_token, "shop_url": shop}
#     )
#     logger.info(f"[Shopify Callback] ✅ Saved connection for user={user_id}, shop={shop}")
#     return RedirectResponse(url=f"http://localhost:8080/select-shopify?user_id={user_id}")


# # --------------------------- Data Endpoints --------------------------- #

# @router.get("/orders/{user_id}")
# def fetch_orders(user_id: str, current_user_id: str = Depends(get_current_user_id)):
#     details = shopify_service.get_connection_or_403(user_id, current_user_id)
#     return shopify_service.fetch_and_save(
#         "orders", user_id, shopify_service.get_all_orders,
#         details["shop_url"], details["access_token"]
#     )


# @router.get("/products/{user_id}")
# def fetch_products(user_id: str, current_user_id: str = Depends(get_current_user_id)):
#     details = shopify_service.get_connection_or_403(user_id, current_user_id)
#     return shopify_service.fetch_and_save(
#         "products", user_id, shopify_service.get_all_products,
#         details["shop_url"], details["access_token"]
#     )


# @router.get("/customers/{user_id}")
# def fetch_customers(user_id: str, current_user_id: str = Depends(get_current_user_id)):
#     details = shopify_service.get_connection_or_403(user_id, current_user_id)
#     return shopify_service.fetch_and_save(
#         "customers", user_id, shopify_service.get_all_customers,
#         details["shop_url"], details["access_token"]
#     )


# @router.get("/collections/{user_id}")
# def fetch_collections(user_id: str, current_user_id: str = Depends(get_current_user_id)):
#     details = shopify_service.get_connection_or_403(user_id, current_user_id)
#     return shopify_service.fetch_and_save(
#         "collections", user_id, shopify_service.get_all_collections,
#         details["shop_url"], details["access_token"]
#     )


# @router.get("/inventory/{user_id}")
# def fetch_inventory(user_id: str, current_user_id: str = Depends(get_current_user_id)):
#     details = shopify_service.get_connection_or_403(user_id, current_user_id)
#     return shopify_service.fetch_and_save(
#         "inventory", user_id, shopify_service.get_inventory_levels,
#         details["shop_url"], details["access_token"]
#     )



# """
# Shopify Controller
# ------------------
# Handles OAuth authentication, callback verification, and data fetch routes
# for Shopify platform integrations.
# """

# from fastapi import APIRouter, Query, HTTPException, Request, Depends
# from fastapi.responses import RedirectResponse
# from app.config.config import settings
# from app.utils.security import create_state_token, get_current_user_id
# from app.utils.logger import get_logger
# from app.services import shopify_service

# router = APIRouter(tags=["Shopify"])
# logger = get_logger()

# SCOPES = "read_orders,read_all_orders,read_products,read_customers,read_inventory,read_analytics"


# @router.get("/login")
# def shopify_login(shop: str = Query(..., description="The merchant's shop domain")):
#     """
#     Public Shopify OAuth installation flow (no JWT required).
#     """
#     if not shop:
#         raise HTTPException(status_code=400, detail="Missing 'shop' parameter")

#     shop = shop.strip().lower().replace("https://", "").replace("http://", "")
#     shop = shop.split("/")[0]
#     if "." not in shop or not all(c.isalnum() or c in ".-" for c in shop):
#         raise HTTPException(status_code=400, detail="Invalid shop domain")

#     redirect_uri = f"{settings.SHOPIFY_REDIRECT_URI}"
#     auth_url = (
#         f"https://{shop}/admin/oauth/authorize?"
#         f"client_id={settings.SHOPIFY_CLIENT_ID}"
#         f"&scope={SCOPES}"
#         f"&redirect_uri={redirect_uri}"
#         f"&state=dummy_state"
#     )
#     # logger.info(f"[Shopify OAuth] Redirecting user {current_user_id} for shop: {shop}")
#     logger.info(f"[Shopify OAuth] Constructed auth URL: {auth_url}")
#     try:
#         return {"redirect_url": auth_url}
#     except Exception as e:
#         logger.exception(f"[Shopify OAuth] Failed to create RedirectResponse: {e}")
#         raise HTTPException(status_code=500, detail="Failed to initiate Shopify login redirect.")


# @router.get("/callback")
# def shopify_callback(request: Request, code: str, shop: str, hmac: str, timestamp: str, state: str = None):
#     """
#     Handle Shopify OAuth callback and save access token.
#     """
#     from app.services import shopify_service

#     if not shopify_service.verify_shopify_hmac(dict(request.query_params), settings.SHOPIFY_CLIENT_SECRET):
#         raise HTTPException(status_code=400, detail="Invalid HMAC signature")

#     access_token = shopify_service.exchange_code_for_token(shop, code)
#     shopify_service.save_or_update_platform_connection(
#         user_id="69024f373451fdc6356105af",  # temporary link to your test user
#         platform="shopify",
#         platform_data={"access_token": access_token, "shop_url": shop}
#     )
#     logger.info(f"[Shopify Callback] ✅ Connected virality-test-shop.myshopify.com")
#     return {"message": "Shopify connection successful", "shop": shop}


# # --------------------------- Data Endpoints --------------------------- #

# @router.get("/orders/{user_id}")
# def fetch_orders(user_id: str, current_user_id: str = Depends(get_current_user_id)):
#     details = shopify_service.get_connection_or_403(user_id, current_user_id)
#     return shopify_service.fetch_and_save(
#         "orders", user_id, shopify_service.get_all_orders,
#         details["shop_url"], details["access_token"]
#     )


# @router.get("/products/{user_id}")
# def fetch_products(user_id: str, current_user_id: str = Depends(get_current_user_id)):
#     details = shopify_service.get_connection_or_403(user_id, current_user_id)
#     return shopify_service.fetch_and_save(
#         "products", user_id, shopify_service.get_all_products,
#         details["shop_url"], details["access_token"]
#     )


# @router.get("/customers/{user_id}")
# def fetch_customers(user_id: str, current_user_id: str = Depends(get_current_user_id)):
#     details = shopify_service.get_connection_or_403(user_id, current_user_id)
#     return shopify_service.fetch_and_save(
#         "customers", user_id, shopify_service.get_all_customers,
#         details["shop_url"], details["access_token"]
#     )


# @router.get("/collections/{user_id}")
# def fetch_collections(user_id: str, current_user_id: str = Depends(get_current_user_id)):
#     details = shopify_service.get_connection_or_403(user_id, current_user_id)
#     return shopify_service.fetch_and_save(
#         "collections", user_id, shopify_service.get_all_collections,
#         details["shop_url"], details["access_token"]
#     )


# @router.get("/inventory/{user_id}")
# def fetch_inventory(user_id: str, current_user_id: str = Depends(get_current_user_id)):
#     details = shopify_service.get_connection_or_403(user_id, current_user_id)
#     return shopify_service.fetch_and_save(
#         "inventory", user_id, shopify_service.get_inventory_levels,
#         details["shop_url"], details["access_token"]
#     )

