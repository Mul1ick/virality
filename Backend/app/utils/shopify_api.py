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
def _iterate(shop_url: str, token: str, connection: str, node_fields: str, variables: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """
    Iteratively fetch all pages for a given GraphQL connection.

    Args:
        shop_url (str): The merchant's shop domain.
        token (str): The access token.
        connection (str): The GraphQL connection name (e.g., 'orders').
        node_fields (str): The node fields to retrieve in each edge.
        variables (dict, optional): Extra GraphQL variables.

    Returns:
        list[dict]: Aggregated list of all nodes retrieved.
    """
    query = f"""
    query Paginated($cursor: String) {{
      {connection}(first: 100, after: $cursor) {{
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
# 📦 Convenience Fetchers
# ---------------------------------------------------------------------------
def get_all_orders(shop_url: str, token: str) -> List[Dict[str, Any]]:
    """
    Fetch all orders for the given Shopify store.
    """
    fields = """
      id name processedAt displayFinancialStatus displayFulfillmentStatus
      totalPriceSet { shopMoney { amount currencyCode } }
      lineItems(first: 50) { edges { node { title quantity variant { price } } } }
    """
    return _iterate(shop_url, token, "orders", fields)


def get_all_products(shop_url: str, token: str) -> List[Dict[str, Any]]:
    """
    Fetch all products with their variants.
    """
    fields = """
      id title handle status totalInventory productType vendor createdAt updatedAt
      variants(first: 50) { edges { node { id title price inventoryQuantity } } }
    """
    return _iterate(shop_url, token, "products", fields)


def get_all_customers(shop_url: str, token: str) -> List[Dict[str, Any]]:
    """
    Fetch all customers with contact details.
    """
    fields = "id email firstName lastName state createdAt updatedAt verifiedEmail"
    return _iterate(shop_url, token, "customers", fields)


def get_all_collections(shop_url: str, token: str) -> List[Dict[str, Any]]:
    """
    Fetch all collections (manual or smart).
    """
    fields = "id title handle updatedAt"
    return _iterate(shop_url, token, "collections", fields)


def get_inventory_levels(shop_url: str, token: str) -> List[Dict[str, Any]]:
    """
    Fetch all inventory levels via product variants.
    """
    fields = """
      id sku inventoryQuantity
      inventoryItem { id }
      product { id title }
    """
    return _iterate(shop_url, token, "productVariants", fields)
