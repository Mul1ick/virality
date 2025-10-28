import requests, time
from app.utils.logger import get_logger

logger = get_logger()
API_VERSION = "2025-10"

def _graphql(shop_url, token, query, variables=None):
    url = f"https://{shop_url}/admin/api/{API_VERSION}/graphql.json"
    headers = {"X-Shopify-Access-Token": token, "Content-Type": "application/json"}
    try:
        r = requests.post(url, headers=headers, json={"query": query, "variables": variables or {}}, timeout=20)
        if r.status_code == 429:
            wait = int(r.headers.get("Retry-After", "2"))
            logger.warning(f"[Shopify API] Rate limited, sleeping {wait}s")
            time.sleep(wait)
            return _graphql(shop_url, token, query, variables)
        r.raise_for_status()
        data = r.json()
        if "errors" in data:
            logger.error(f"[Shopify API] GraphQL errors: {data['errors']}")
            return None
        return data
    except Exception as e:
        logger.error(f"[Shopify API] Request failed: {e}")
        return None


def _iterate(shop_url, token, connection, node_fields, variables=None):
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
    cursor, all_nodes = None, []
    while True:
        resp = _graphql(shop_url, token, query, {"cursor": cursor})
        if not resp: break
        edges = resp["data"][connection]["edges"]
        all_nodes += [e["node"] for e in edges]
        if not resp["data"][connection]["pageInfo"]["hasNextPage"]:
            break
        cursor = edges[-1]["cursor"]
        logger.info(f"[Shopify API] Fetched {len(all_nodes)} so far from {connection}")
    return all_nodes


def get_all_orders(shop_url, token):
    fields = """
      id name processedAt displayFinancialStatus displayFulfillmentStatus
      totalPriceSet { shopMoney { amount currencyCode } }
      lineItems(first: 50) { edges { node { title quantity variant { price } } } }
    """
    return _iterate(shop_url, token, "orders", fields)


def get_all_products(shop_url, token):
    fields = """
      id title handle status totalInventory productType vendor createdAt updatedAt
      variants(first: 50) { edges { node { id title price inventoryQuantity } } }
    """
    return _iterate(shop_url, token, "products", fields)


def get_all_customers(shop_url, token):
    fields = "id email firstName lastName state createdAt updatedAt verifiedEmail"
    return _iterate(shop_url, token, "customers", fields)


def get_all_collections(shop_url, token):
    fields = "id title handle updatedAt"
    return _iterate(shop_url, token, "collections", fields)


def get_inventory_levels(shop_url, token):
    fields = """
      id sku inventoryQuantity
      inventoryItem { id }
      product { id title }
    """
    return _iterate(shop_url, token, "productVariants", fields)
