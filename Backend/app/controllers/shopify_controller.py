# FILE: app/controllers/shopify_controller.py

from fastapi import APIRouter, Query, HTTPException, Request, Depends
from fastapi.responses import RedirectResponse
import requests
import hmac
import hashlib
import os
import urllib.parse
import secrets

from app.config import settings
# 👇 Use NEW database functions
from app.database import save_or_update_platform_connection, get_platform_connection_details, save_items
# 👇 Use NEW security functions
from app.utils.security import create_state_token, decode_token, get_current_user_id
from app.utils.logger import get_logger
# 👇 Keep existing API utils
from app.utils.shopify_api import get_shopify_orders, get_shopify_products

router = APIRouter(prefix="/shopify", tags=["Shopify"])
logger = get_logger() # Use __name__ for context

SCOPES = "read_orders,read_products,read_analytics"

# --- HMAC Verification (Unchanged but important for security) ---
def verify_shopify_hmac(query_params_dict: dict, shopify_secret: str) -> bool:
    """ Verifies the HMAC signature from Shopify using the raw query parameters. """
    received_hmac = query_params_dict.pop('hmac', '') # Use pop to exclude hmac itself from calculation
    if not received_hmac:
        logger.warning("[Shopify HMAC] HMAC missing from callback request.")
        return False

    # Create the message string according to Shopify's spec:
    # sorted key-value pairs separated by '&', keys/values escaped
    sorted_params_list = []
    for key in sorted(query_params_dict.keys()):
        # Escape &, =, %
        escaped_key = str(key).replace('%', '%25').replace('&', '%26').replace('=', '%3D')
        value = query_params_dict[key]
        # Handle list params if necessary (though less common in Shopify auth callback)
        if isinstance(value, list):
            escaped_value = str(value[0]).replace('%', '%25').replace('&', '%26') # Take first val example
        else:
            escaped_value = str(value).replace('%', '%25').replace('&', '%26')
        sorted_params_list.append(f"{escaped_key}={escaped_value}")

    message = "&".join(sorted_params_list)

    digest = hmac.new(
        shopify_secret.encode('utf-8'), message.encode('utf-8'), hashlib.sha256
    ).hexdigest()

    # Use secure comparison
    is_valid = hmac.compare_digest(digest, received_hmac)
    if not is_valid:
        logger.warning(f"[Shopify HMAC] Invalid HMAC. Calculated: {digest}, Received: {received_hmac}, Message: {message}")
    else:
        logger.info("[Shopify HMAC] Verification successful.")
    return is_valid


# --- Refactored OAuth Endpoints ---

@router.get("/login")
def shopify_login(
    shop: str = Query(..., description="The user's myshopify.com domain name"),
    current_user_id: str = Depends(get_current_user_id) # Require authentication
):
    """ Initiates Shopify OAuth flow, passing user_id securely via JWT state. """
    if not shop:
        raise HTTPException(status_code=400, detail="Missing 'shop' parameter")

    # Clean shop name
    shop = shop.strip().replace('https://', '').replace('/', '')
    if '.myshopify.com' not in shop:
        shop = f"{shop}.myshopify.com"

    # Generate state JWT containing the main app's user ID
    state_jwt = create_state_token(data={"sub": current_user_id})

    auth_url = (
        f"https://{shop}/admin/oauth/authorize?"
        f"client_id={settings.SHOPIFY_CLIENT_ID}"
        f"&scope={SCOPES}"
        f"&redirect_uri={settings.SHOPIFY_REDIRECT_URI}"
        f"&state={state_jwt}" # Pass JWT as state
        # Request offline (permanent) access token by default (omit grant_options)
    )
    logger.info(f"[Shopify OAuth] Redirecting user {current_user_id} for shop: {shop}")
    logger.info(f"[Shopify OAuth] Constructed auth URL: {auth_url}")
    try:
        return {"redirect_url": auth_url}
    except Exception as e:
        logger.exception(f"[Shopify OAuth] Failed to create RedirectResponse: {e}")
        raise HTTPException(status_code=500, detail="Failed to initiate Shopify login redirect.")


@router.get("/callback")
def shopify_callback(
    request: Request,
    code: str = Query(...),
    shop: str = Query(...),
    state: str = Query(...), # Receive state JWT
    hmac_val: str = Query(..., alias="hmac"), # Use alias to avoid conflict
    timestamp: str = Query(...) # Required for HMAC
):
    """ Handles Shopify callback, verifies HMAC & state, exchanges code, saves connection. """

    # 1. Verify State JWT
    try:
        token_payload = decode_token(state)
        main_app_user_id = token_payload.get("sub")
        if not main_app_user_id:
            raise HTTPException(status_code=400, detail="Invalid state token: Missing user identifier")
        logger.info(f"[Shopify Callback] State token decoded successfully for user: {main_app_user_id}")
    except HTTPException as e:
        logger.error(f"[Shopify Callback] Invalid state token: {e.detail}")
        return RedirectResponse(url=f"http://localhost:8080/profile?connect_status=shopify_error&error=invalid_state")
    except Exception as e:
        logger.exception(f"[Shopify Callback] Error decoding state token: {e}")
        return RedirectResponse(url=f"http://localhost:8080/profile?connect_status=shopify_error&error=state_decode_error")

    # 2. Verify HMAC
    query_params_dict = dict(request.query_params)
    # Re-add hmac under the expected key for the verification function
    query_params_dict_for_hmac = query_params_dict.copy()
    query_params_dict_for_hmac['hmac'] = hmac_val # Put it back with key 'hmac'

    if not verify_shopify_hmac(query_params_dict_for_hmac, settings.SHOPIFY_CLIENT_SECRET):
        # Don't raise HTTPException here, redirect to frontend error instead
        logger.error(f"[Shopify Callback] Invalid HMAC signature for user {main_app_user_id}, shop {shop}.")
        return RedirectResponse(url=f"http://localhost:8080/profile?connect_status=shopify_error&error=invalid_hmac")

    # 3. Exchange Code for Token
    token_url = f"https://{shop}/admin/oauth/access_token"
    payload = {
        "client_id": settings.SHOPIFY_CLIENT_ID,
        "client_secret": settings.SHOPIFY_CLIENT_SECRET,
        "code": code,
    }
    try:
        resp = requests.post(token_url, json=payload)
        resp.raise_for_status()
        token_data = resp.json()
        logger.info(f"[Shopify Callback] Token exchange successful for user {main_app_user_id}, shop: {shop}")
    except requests.exceptions.RequestException as e:
        error_detail = e.response.text if e.response else str(e)
        logger.error(f"[Shopify Callback] Token exchange failed for user {main_app_user_id}, shop {shop}: {error_detail}")
        return RedirectResponse(url=f"http://localhost:8080/profile?connect_status=shopify_error&error=token_exchange_failed")

    access_token = token_data.get("access_token")
    if not access_token:
        logger.error(f"[Shopify Callback] Access token missing for user {main_app_user_id}, shop {shop}")
        return RedirectResponse(url=f"http://localhost:8080/profile?connect_status=shopify_error&error=missing_access_token")

    # 4. Prepare Data and Save Connection using NEW function
    platform_data_to_save = {
        "access_token": access_token,
        "shop_url": shop # Store the full shop URL used for API calls
    }

    save_or_update_platform_connection(
        user_id=main_app_user_id, # Use verified ID from state JWT
        platform="shopify",
        platform_data=platform_data_to_save
    )
    logger.info(f"✅ [Shopify Callback] Connection details saved for user {main_app_user_id}")

    # 5. Redirect to Frontend Profile Page
    return RedirectResponse(url=f"http://localhost:8080/profile?user_id={main_app_user_id}&connect_status=shopify_success")


# --- Refactored Data Fetching Endpoints ---

@router.get("/orders/{user_id}")
def get_orders(
    user_id: str,
    current_user_id: str = Depends(get_current_user_id) # Add authentication
):
    """Fetches recent orders for the authenticated user's linked Shopify store."""
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Use NEW function to get connection details
    connection_details = get_platform_connection_details(user_id, "shopify")
    if not connection_details or not connection_details.get("access_token") or not connection_details.get("shop_url"):
        raise HTTPException(status_code=404, detail="Shopify connection details not found or incomplete.")

    shop_url = connection_details["shop_url"]
    access_token = connection_details["access_token"]

    try:
        order_data_response = get_shopify_orders(shop_url, access_token)
        if order_data_response is None:
            # Check shopify_api.py logs for specific errors
            raise HTTPException(status_code=502, detail="Failed to fetch orders from Shopify API.")
    except Exception as e:
         logger.exception(f"Unexpected error fetching Shopify orders for user {user_id}: {e}")
         raise HTTPException(status_code=500, detail="Internal server error fetching orders.")

    orders = order_data_response.get("data", {}).get("orders", {}).get("edges", [])
    orders_to_save = [edge['node'] for edge in orders if 'node' in edge] # Safely extract node

    if orders_to_save:
        logger.info(f"Attempting to save {len(orders_to_save)} Shopify orders for user {user_id}...")
        try:
            # Note: Ensure 'orders' collection exists in MongoDB
            # Use user_id (main app user ID) as the ad_account_id equivalent for consistency
            save_items(
                collection_name="orders",
                ad_account_id=user_id,
                items_data=orders_to_save,
                platform="shopify"
            )
            logger.info(f"✅ Saved {len(orders_to_save)} Shopify orders for user {user_id}.")
        except Exception as e:
             logger.exception(f"Error saving Shopify orders for user {user_id}: {e}")
             # Decide if failure to save should raise an error to the client
    else:
         logger.info(f"No Shopify orders found to save for user {user_id}.")

    return {"user_id": user_id, "data": orders}


@router.get("/products/{user_id}")
def get_products(
    user_id: str,
    current_user_id: str = Depends(get_current_user_id) # Add authentication
):
    """Fetches products for the authenticated user's linked Shopify store."""
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Use NEW function
    connection_details = get_platform_connection_details(user_id, "shopify")
    if not connection_details or not connection_details.get("access_token") or not connection_details.get("shop_url"):
        raise HTTPException(status_code=404, detail="Shopify connection details not found or incomplete.")

    shop_url = connection_details["shop_url"]
    access_token = connection_details["access_token"]

    try:
        product_data_response = get_shopify_products(shop_url, access_token)
        if product_data_response is None:
            raise HTTPException(status_code=502, detail="Failed to fetch products from Shopify API.")
    except Exception as e:
         logger.exception(f"Unexpected error fetching Shopify products for user {user_id}: {e}")
         raise HTTPException(status_code=500, detail="Internal server error fetching products.")

    products = product_data_response.get("data", {}).get("products", {}).get("edges", [])
    products_to_save = [edge['node'] for edge in products if 'node' in edge] # Safely extract node

    if products_to_save:
        logger.info(f"Attempting to save {len(products_to_save)} Shopify products for user {user_id}...")
        try:
            # Note: Ensure 'products' collection exists in MongoDB
            save_items(
                collection_name="products",
                ad_account_id=user_id,
                items_data=products_to_save,
                platform="shopify"
            )
            logger.info(f"✅ Saved {len(products_to_save)} Shopify products for user {user_id}.")
        except Exception as e:
             logger.exception(f"Error saving Shopify products for user {user_id}: {e}")
    else:
        logger.info(f"No Shopify products found to save for user {user_id}.")

    return {"user_id": user_id, "data": products}