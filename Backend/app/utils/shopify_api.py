"""
Shopify API Utilities
---------------------
Provides helper functions for interacting with the Shopify GraphQL Admin API.

Handles:
- Rate limits and retry logic
- Cursor-based pagination for large datasets
- Convenience wrappers for fetching common entities like orders, products, etc.
"""

import time
import requests
from typing import Any, Dict, List, Optional
from app.utils.logger import get_logger

logger = get_logger()
API_VERSION = "2025-10"


# ---------------------------------------------------------------------------
# 🧩 Core GraphQL Query Executor
# ---------------------------------------------------------------------------
def _graphql(shop_url: str, token: str, query: str, variables: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
    """
    Execute a GraphQL query against the Shopify Admin API.

    Args:
        shop_url (str): The merchant's Shopify shop domain.
        token (str): The access token for authenticated API calls.
        query (str): The GraphQL query string.
        variables (dict, optional): Variables for the query.

    Returns:
        dict | None: JSON response data, or None if the request failed.
    """
    url = f"https://{shop_url}/admin/api/{API_VERSION}/graphql.json"
    headers = {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
    }

    try:
        response = requests.post(url, headers=headers, json={"query": query, "variables": variables or {}}, timeout=20)

        # Handle rate limiting
        if response.status_code == 429:
            wait_time = int(response.headers.get("Retry-After", "2"))
            logger.warning(f"[Shopify API] Rate limited — retrying in {wait_time}s")
            time.sleep(wait_time)
            return _graphql(shop_url, token, query, variables)

        response.raise_for_status()
        data = response.json()

        # Handle GraphQL errors
        if "errors" in data:
            logger.error(f"[Shopify API] GraphQL errors: {data['errors']}")
            return None

        return data

    except requests.exceptions.RequestException as e:
        logger.error(f"[Shopify API] HTTP error: {e}")
    except ValueError as e:
        logger.error(f"[Shopify API] Invalid JSON response: {e}")
    except Exception as e:
        logger.exception(f"[Shopify API] Unexpected error: {e}")

    return None


# ---------------------------------------------------------------------------
# 🔁 Pagination Helper
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# 🔁 Pagination Helper (Updated for historical pulls)
# ---------------------------------------------------------------------------
def _iterate(
    shop_url: str,
    token: str,
    connection: str,
    node_fields: str,
    variables: Optional[Dict[str, Any]] = None,
    query_filter: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Iteratively fetch all pages for a given GraphQL connection.
    Supports optional query filters (e.g., date range).

    Args:
        shop_url: The merchant's shop domain.
        token: Access token.
        connection: The GraphQL connection name (e.g., 'orders').
        node_fields: The node fields to retrieve in each edge.
        variables: Extra GraphQL variables.
        query_filter: Optional filter query (e.g., "created_at:>=2024-01-01 AND created_at:<=2024-12-31").
    """
    filter_clause = f'(first: 100, after: $cursor, query: "{query_filter}")' if query_filter else '(first: 100, after: $cursor)'

    query = f"""
    query Paginated($cursor: String) {{
      {connection}{filter_clause} {{
        edges {{
          cursor
          node {{ {node_fields} }}
        }}
        pageInfo {{ hasNextPage }}
      }}
    }}
    """

    cursor = None
    all_nodes: List[Dict[str, Any]] = []

    while True:
        response = _graphql(shop_url, token, query, {"cursor": cursor, **(variables or {})})
        if not response:
            break

        try:
            connection_data = response["data"][connection]
            edges = connection_data.get("edges", [])
            all_nodes.extend(e["node"] for e in edges)

            if not connection_data["pageInfo"]["hasNextPage"]:
                break

            cursor = edges[-1]["cursor"]
            logger.info(f"[Shopify API] Fetched {len(all_nodes)} records from '{connection}' so far")

        except KeyError as e:
            logger.error(f"[Shopify API] Unexpected response structure: {e}")
            break

    logger.info(f"[Shopify API] Completed fetching {len(all_nodes)} total records from '{connection}'")
    return all_nodes


# ---------------------------------------------------------------------------
# 📦 Convenience Fetchers (Updated for date range)
# ---------------------------------------------------------------------------
def get_all_orders(shop_url: str, token: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Fetch all orders for the given Shopify store, optionally within a date range.
    Date format: 'YYYY-MM-DD'
    """
    fields = """
      id name processedAt displayFinancialStatus displayFulfillmentStatus
      totalPriceSet { shopMoney { amount currencyCode } }
      lineItems(first: 50) { edges { node { title quantity variant { price } } } }
    """

    query_filter = None
    if start_date and end_date:
        query_filter = f"created_at:>={start_date} AND created_at:<={end_date}"
        logger.info(f"[Shopify Orders] Historical pull from {start_date} to {end_date}")

    return _iterate(shop_url, token, "orders", fields, query_filter=query_filter)


def get_all_products(shop_url: str, token: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict[str, Any]]:
    """Fetch all products with variants (optionally filtered by update date)."""
    fields = """
      id title handle status totalInventory productType vendor createdAt updatedAt
      variants(first: 50) { edges { node { id title price inventoryQuantity } } }
    """
    query_filter = None
    if start_date and end_date:
        query_filter = f"updated_at:>={start_date} AND updated_at:<={end_date}"
        logger.info(f"[Shopify Products] Historical pull {start_date} → {end_date}")
    return _iterate(shop_url, token, "products", fields, query_filter=query_filter)


def get_all_customers(shop_url: str, token: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict[str, Any]]:
    """Fetch all customers (optionally by update date)."""
    fields = "id email firstName lastName state createdAt updatedAt verifiedEmail"
    query_filter = None
    if start_date and end_date:
        query_filter = f"updated_at:>={start_date} AND updated_at:<={end_date}"
        logger.info(f"[Shopify Customers] Historical pull {start_date} → {end_date}")
    return _iterate(shop_url, token, "customers", fields, query_filter=query_filter)


def get_all_collections(shop_url: str, token: str) -> List[Dict[str, Any]]:
    """Fetch all collections."""
    fields = "id title handle updatedAt"
    return _iterate(shop_url, token, "collections", fields)


def get_inventory_levels(shop_url: str, token: str) -> List[Dict[str, Any]]:
    """Fetch all inventory levels via product variants."""
    fields = """
      id sku inventoryQuantity
      inventoryItem { id }
      product { id title }
    """
    return _iterate(shop_url, token, "productVariants", fields)


def get_all_collections(
    shop_url: str,
    token: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Fetch all collections (manual or smart), optionally filtered by update date."""
    fields = "id title handle updatedAt"
    query_filter = None
    if start_date and end_date:
        query_filter = f"updated_at:>={start_date} AND updated_at:<={end_date}"
        logger.info(f"[Shopify Collections] Historical pull {start_date} → {end_date}")
    return _iterate(shop_url, token, "collections", fields, query_filter=query_filter)


def get_inventory_levels(
    shop_url: str,
    token: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Fetch all inventory levels via product variants, optionally filtered by update date.
    """
    fields = """
      id sku inventoryQuantity updatedAt
      inventoryItem { id }
      product { id title }
    """
    query_filter = None
    if start_date and end_date:
        query_filter = f"updated_at:>={start_date} AND updated_at:<={end_date}"
        logger.info(f"[Shopify Inventory] Historical pull {start_date} → {end_date}")
    return _iterate(shop_url, token, "productVariants", fields, query_filter=query_filter)




