from fastapi import HTTPException
import requests, hmac, hashlib, time, urllib.parse
from typing import Dict, Any, Optional, List
from datetime import datetime, date
from collections import defaultdict
from app.utils.logger import get_logger
from app.database.mongo_client import (
    save_or_update_platform_connection,
    get_platform_connection_details,
    save_items,
    db
)
from app.utils.shopify_api import (
    get_all_orders, get_all_products, get_all_customers,
    get_all_collections, get_inventory_levels
)
from app.utils.security import decode_token
from app.config.config import settings

logger = get_logger()


def verify_shopify_hmac(query_dict: dict, secret: str) -> bool:
    """Verify HMAC signature in Shopify callback query parameters."""
    q = [(k, v) for k, v in query_dict.items() if k not in ("hmac", "signature")]
    q.sort(key=lambda kv: kv[0])
    msg = urllib.parse.urlencode(q, doseq=True)
    digest = hmac.new(secret.encode(), msg.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(digest, query_dict.get("hmac", ""))


def exchange_code_for_token(shop: str, code: str) -> str:
    """Exchange authorization code for permanent access token."""
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
    """Retrieve and validate Shopify connection for the given user."""
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    details = get_platform_connection_details(user_id, "shopify")
    if not details or not details.get("access_token") or not details.get("shop_url"):
        raise HTTPException(status_code=404, detail="Shopify connection missing or incomplete.")
    return details


def transform_orders_to_daily_insights(orders: List[Dict], user_id: str, shop_url: str) -> List[Dict]:
    """
    Transform raw Shopify orders into daily insights format.
    Similar to how Google/Meta store daily aggregated data.
    """
    daily_data = defaultdict(lambda: {
        'total_revenue': 0.0,
        'order_count': 0,
        'total_items': 0,
        'orders': []
    })
    
    for order in orders:
        try:
            # Parse date from created_at
            created_at = order.get('created_at', '')
            if isinstance(created_at, str):
                order_date = datetime.fromisoformat(created_at.replace('Z', '+00:00')).date()
            elif isinstance(created_at, datetime):
                order_date = created_at.date()
            else:
                logger.warning(f"[Shopify Transform] Skipping order with invalid date: {order.get('id')}")
                continue
            
            date_str = order_date.strftime('%Y-%m-%d')
            
            # Extract financial data
            total_price = float(order.get('total_price', 0) or 0)
            line_items_count = len(order.get('line_items', []))
            
            # Aggregate by date
            daily_data[date_str]['total_revenue'] += total_price
            daily_data[date_str]['order_count'] += 1
            daily_data[date_str]['total_items'] += line_items_count
            daily_data[date_str]['orders'].append(order.get('id'))
            
        except Exception as e:
            logger.error(f"[Shopify Transform] Error processing order {order.get('id')}: {e}")
            continue
    
    # Convert to list of daily insight documents
    insights = []
    for date_str, data in daily_data.items():
        insight = {
            'user_id': user_id,
            'platform': 'shopify',
            'shop_url': shop_url,
            'date_start': date_str,
            'date_end': date_str,
            'total_revenue': data['total_revenue'],
            'order_count': data['order_count'],
            'total_items': data['total_items'],
            'avg_order_value': data['total_revenue'] / data['order_count'] if data['order_count'] > 0 else 0,
            'order_ids': data['orders'][:100],  # Store first 100 order IDs for reference
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        insights.append(insight)
    
    logger.info(f"[Shopify Transform] Created {len(insights)} daily insights from {len(orders)} orders")
    return insights


def save_daily_insights(insights: List[Dict], user_id: str):
    """
    Save or update daily insights in MongoDB.
    Uses upsert to handle incremental updates.
    """
    if not insights:
        logger.warning(f"[Shopify Daily Insights] No insights to save for user {user_id}")
        return
    
    collection = db['shopify_daily_insights']
    
    try:
        for insight in insights:
            # Upsert based on user_id, platform, and date
            filter_query = {
                'user_id': user_id,
                'platform': 'shopify',
                'date_start': insight['date_start']
            }
            
            update_doc = {
                '$set': insight,
                '$setOnInsert': {'created_at': datetime.utcnow().isoformat()}
            }
            
            collection.update_one(filter_query, update_doc, upsert=True)
        
        logger.info(f"[Shopify Daily Insights] Saved {len(insights)} daily insights for user {user_id}")
        
    except Exception as e:
        logger.exception(f"[Shopify Daily Insights] Failed to save: {e}")
        raise


def fetch_and_save_paginated(
    resource_type: str,
    user_id: str,
    page: int = 1,
    limit: int = 50,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Fetch a resource type with pagination from MongoDB (NOT from Shopify API).
    This reads from cached data in MongoDB.
    """
    try:
        collection_name = f"shopify_{resource_type}"
        collection = db[collection_name]
        
        # Build query - ALWAYS include platform for consistency
        query = {
            "user_id": user_id,
            "platform": "shopify"
        }
        
        # Add date filters if provided
        if start_date or end_date:
            date_query = {}
            if start_date:
                date_query["$gte"] = start_date
            if end_date:
                date_query["$lte"] = end_date
            query["created_at"] = date_query
        
        # Get total count
        total = collection.count_documents(query)
        
        logger.info(f"[Shopify {resource_type.title()}] Found {total} total items for user {user_id}")
        
        # Paginate
        skip = (page - 1) * limit
        cursor = collection.find(query).skip(skip).limit(limit).sort("created_at", -1)
        data = list(cursor)
        
        # Remove MongoDB _id field
        for item in data:
            item.pop("_id", None)
        
        logger.info(f"[Shopify {resource_type.title()}] Page {page}: Returned {len(data)}/{total} items")
        
        return {
            "data": data,
            "count": len(data),
            "total": total,
            "page": page,
            "limit": limit,
            "has_more": (skip + len(data)) < total,
        }
    except Exception as e:
        logger.exception(f"[Shopify {resource_type.title()}] Pagination failed: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching {resource_type}.")


def fetch_and_save(
    resource_type: str, 
    user_id: str, 
    func, 
    shop_url: str, 
    token: str, 
    **kwargs
) -> Dict[str, Any]:
    """
    Fetch a resource type (orders, products, etc.) from Shopify API and save to DB.
    
    For ORDERS: Creates both raw orders collection AND daily insights collection.
    For other resources: Just saves raw data.
    
    This is for INITIAL sync or refresh - fetches ALL data from Shopify.
    """
    try:
        data = func(shop_url, token, **kwargs)
        
        if not data:
            logger.warning(f"[Shopify {resource_type.title()}] No data returned from API")
            return {
                "data": [],
                "count": 0,
                "user_id": user_id,
            }
        
        # Save raw data
        save_items(f"shopify_{resource_type}", user_id, data, "shopify")
        logger.info(f"[Shopify {resource_type.title()}] Saved {len(data)} raw items for {user_id}")
        
        # For orders, ALSO create daily insights
        if resource_type == "orders":
            insights = transform_orders_to_daily_insights(data, user_id, shop_url)
            save_daily_insights(insights, user_id)
            logger.info(f"[Shopify Orders] Created {len(insights)} daily insights")

        return {
            "data": data,
            "count": len(data),
            "user_id": user_id,
        }
        
    except Exception as e:
        logger.exception(f"[Shopify {resource_type.title()}] Failed: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching {resource_type}.")