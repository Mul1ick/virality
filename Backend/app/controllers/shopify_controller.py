# FILE: app/controllers/shopify_controller.py

from fastapi import APIRouter, Query, HTTPException, Request
from fastapi.responses import RedirectResponse
import requests
import hmac
import hashlib
import os
import urllib.parse # Need this for HMAC verification
import secrets # For generating a secure nonce

from app.config import settings

from app.utils.logger import get_logger

# Near the top of app/controllers/shopify_controller.py
from app.database import save_or_update_user_token, get_user_token_by_source, save_shopify_user_token, save_items # Make sure save_items is here!
# Import the shopify_api functions
from app.utils.shopify_api import get_shopify_orders, get_shopify_products

router = APIRouter(prefix="/shopify", tags=["Shopify"])
logger = get_logger()

SCOPES = "read_orders,read_products,read_analytics"

# --- HMAC Security Validation ---
def verify_shopify_hmac(query_params_dict: dict, shopify_secret: str) -> bool:
    """ Verifies the HMAC signature from Shopify using the raw query parameters. """
    received_hmac = query_params_dict.pop('hmac', '')
    if not received_hmac:
        logger.warning("[Shopify HMAC] HMAC missing from callback request.")
        return False

    sorted_params_list = []
    for key in sorted(query_params_dict.keys()):
        escaped_key = str(key).replace('%', '%25').replace('&', '%26').replace('=', '%3D')
        # Handle list parameters correctly if they appear (Shopify sometimes sends arrays)
        value = query_params_dict[key]
        if isinstance(value, list):
             # Join list elements if needed, or handle appropriately
             escaped_value = str(value[0]).replace('%', '%25').replace('&', '%26') # Example: take first element
        else:
             escaped_value = str(value).replace('%', '%25').replace('&', '%26')
        sorted_params_list.append(f"{escaped_key}={escaped_value}")

    message = "&".join(sorted_params_list)

    digest = hmac.new(
        shopify_secret.encode('utf-8'), message.encode('utf-8'), hashlib.sha256
    ).hexdigest()

    is_valid = hmac.compare_digest(digest, received_hmac)
    if not is_valid:
        logger.warning(f"[Shopify HMAC] Invalid HMAC. Calculated: {digest}, Received: {received_hmac}, Message: {message}")
    else:
        logger.info("[Shopify HMAC] Verification successful.")
    return is_valid


# --- Step 1: The Login/Install Endpoint ---
@router.get("/login")
def shopify_login(shop: str = Query(..., description="The user's myshopify.com domain name (e.g., your-store-name)")):
    """ Kicks off the OAuth flow by redirecting the merchant to the Shopify authorization consent screen. """
    if not shop:
        raise HTTPException(status_code=400, detail="Missing 'shop' parameter")

    # Clean the shop name
    shop = shop.strip()
    if shop.startswith('https://'): shop = shop[8:]
    if shop.endswith('/'): shop = shop[:-1]
    if '.myshopify.com' not in shop:
        shop = f"{shop}.myshopify.com"

    # Generate a secure random nonce (state)
    # Store this nonce temporarily (e.g., in user session or cache) to validate in callback
    nonce = secrets.token_hex(16)
    # TODO: Store nonce associated with this login attempt for validation in callback

    auth_url = (
        f"https://{shop}/admin/oauth/authorize?"
        # 👇 CORRECTED TYPO: SHOPIFY_CLIENT_ID
        f"client_id={settings.SHOPIFY_CLIENT_ID}"
        f"&scope={SCOPES}"
        f"&redirect_uri={settings.SHOPIFY_REDIRECT_URI}"
        f"&state={nonce}"
        f"&grant_options[]=per-user" # For online access, use this
        # For offline (permanent) access, omit grant_options[]=per-user
    )

    logger.info(f"[Shopify OAuth] Redirecting user for shop: {shop}")
    logger.info(f"[Shopify OAuth] Constructed auth URL: {auth_url}")

    # 👇 THIS WAS MISSING: Actually return the redirect response
    try:
        # Explicitly set status code (though default is 307 for RedirectResponse)
        return RedirectResponse(url=auth_url, status_code=307)
    except Exception as e:
        logger.error(f"[Shopify OAuth] Failed to create RedirectResponse: {e}")
        raise HTTPException(status_code=500, detail="Failed to initiate Shopify login redirect.")


# --- Step 2: The Callback & Token Exchange Endpoint ---
@router.get("/callback")
def shopify_callback(request: Request, code: str = Query(...), shop: str = Query(...), state: str = Query(...), hmac: str = Query(...), timestamp: str = Query(...)):
    """ Handles the callback from Shopify after user grants permission. Verifies HMAC, exchanges code for token, saves token. """

    # TODO: Retrieve the nonce stored during /login and validate that 'state' == stored_nonce

    # 1. Verify HMAC
    query_params_dict = dict(request.query_params)
     # 👇 CORRECTED TYPO: SHOPIFY_CLIENT_SECRET
    if not verify_shopify_hmac(query_params_dict, settings.SHOPIFY_CLIENT_SECRET):
        raise HTTPException(status_code=403, detail="Invalid HMAC signature.")

    # 2. Exchange the code for a token
    token_url = f"https://{shop}/admin/oauth/access_token"
    payload = {
        # 👇 CORRECTED TYPO: SHOPIFY_CLIENT_ID
        "client_id": settings.SHOPIFY_CLIENT_ID,
        # 👇 CORRECTED TYPO: SHOPIFY_CLIENT_SECRET
        "client_secret": settings.SHOPIFY_CLIENT_SECRET,
        "code": code,
    }

    try:
        resp = requests.post(token_url, json=payload)
        resp.raise_for_status()
        token_data = resp.json()
        logger.info(f"[Shopify OAuth] Token exchange successful for shop: {shop}")
    except requests.exceptions.RequestException as e:
        error_detail = e.response.text if e.response else str(e)
        logger.error(f"[Shopify OAuth] Token exchange failed for shop {shop}: {error_detail}")
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {error_detail}")

    access_token = token_data.get("access_token")
    if not access_token:
        logger.error(f"[Shopify OAuth] Access token not found in response for shop {shop}: {token_data}")
        raise HTTPException(status_code=400, detail="Access token not found in Shopify's response.")

    user_id = shop.split('.')[0]
    
    # --- CHANGE THIS PART ---
    logger.info(f"Data being passed: user_id={user_id}, access_token=..., shop_url={shop}") # Simplified logging

    # Call the NEW dedicated Shopify save function
    save_shopify_user_token(
        user_id=user_id,
        access_token=access_token, # Pass token directly
        shop_url=shop              # Pass shop_url directly
    )
    # -----------------------
    
    logger.info(f"✅ [Shopify OAuth] Token saved for Shopify store: {user_id}")

    return RedirectResponse(url=f"http://localhost:8080/?user_id={user_id}&platform=shopify")

@router.get("/orders/{user_id}")
def get_orders(user_id: str):
    """Fetches recent orders and saves them to MongoDB."""
    token_data = get_user_token_by_source(user_id, source="shopify")
    if not token_data or not token_data.get("access_token") or not token_data.get("shop_url"):
        raise HTTPException(status_code=404, detail="Shopify account not linked or token missing")

    shop_url = token_data["shop_url"]
    access_token = token_data["access_token"]
    order_data_response = get_shopify_orders(shop_url, access_token) # Renamed variable

    if order_data_response is None:
        raise HTTPException(status_code=500, detail="Failed to fetch orders from Shopify API.")

    # Extract the actual list of orders from the GraphQL response structure
    orders = order_data_response.get("data", {}).get("orders", {}).get("edges", [])
    orders_to_save = [edge['node'] for edge in orders] # Get the 'node' which contains order details

    if orders_to_save:
        logger.info(f"Attempting to save {len(orders_to_save)} Shopify orders...")
        # Note: Shopify order IDs are GraphQL IDs (e.g., "gid://shopify/Order/12345")
        # Ensure your save_items logic handles this if needed, or extract numerical ID part.
        # For simplicity, we save the whole node object. Adjust if needed.
        save_items(
            collection_name="orders", # Assuming you have an 'orders' collection
            ad_account_id=user_id, # Using shop name as the identifier
            items_data=orders_to_save,
            platform="shopify"
        )
        logger.info(f"✅ Saved {len(orders_to_save)} Shopify orders to MongoDB.")
    else:
         logger.info("No Shopify orders found to save.")


    return {"user_id": user_id, "data": orders} # Return the original edges structure


@router.get("/products/{user_id}")
def get_products(user_id: str):
    """Fetches products and saves them to MongoDB."""
    token_data = get_user_token_by_source(user_id, source="shopify")
    if not token_data or not token_data.get("access_token") or not token_data.get("shop_url"):
        raise HTTPException(status_code=404, detail="Shopify account not linked or token missing")

    shop_url = token_data["shop_url"]
    access_token = token_data["access_token"]
    product_data_response = get_shopify_products(shop_url, access_token) # Renamed variable

    if product_data_response is None:
        raise HTTPException(status_code=500, detail="Failed to fetch products from Shopify API.")

    # Extract the actual list of products
    products = product_data_response.get("data", {}).get("products", {}).get("edges", [])
    products_to_save = [edge['node'] for edge in products] # Get the 'node' with product details

    if products_to_save:
        logger.info(f"Attempting to save {len(products_to_save)} Shopify products...")
        save_items(
            collection_name="products", # Assuming you have a 'products' collection
            ad_account_id=user_id, # Using shop name as the identifier
            items_data=products_to_save,
            platform="shopify"
        )
        logger.info(f"✅ Saved {len(products_to_save)} Shopify products to MongoDB.")
    else:
        logger.info("No Shopify products found to save.")

    return {"user_id": user_id, "data": products} # Return the original edges structureshopify_callback