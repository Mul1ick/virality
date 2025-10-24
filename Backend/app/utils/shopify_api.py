# FILE: app/utils/shopify_api.py

import requests
from app.utils.logger import get_logger
from app.config import settings # Needed if you use settings later

logger = get_logger()

# Use the latest stable API version (check Shopify docs for current version)
API_VERSION = "2025-10"

def _get_graphql_url(shop_url: str) -> str:
    """Constructs the GraphQL endpoint URL."""
    return f"https://{shop_url}/admin/api/{API_VERSION}/graphql.json"

def _get_shopify_headers(access_token: str) -> dict:
    """Creates the necessary headers for Shopify API requests."""
    return {
        "X-Shopify-Access-Token": access_token,
        "Content-Type": "application/json",
    }

def execute_shopify_query(shop_url: str, access_token: str, query: str, variables: dict = None) -> dict | None:
    """Executes a GraphQL query against the Shopify Admin API."""
    graphql_url = _get_graphql_url(shop_url)
    headers = _get_shopify_headers(access_token)
    payload = {'query': query}
    if variables:
        payload['variables'] = variables

    try:
        resp = requests.post(graphql_url, headers=headers, json=payload)
        resp.raise_for_status() # Check for HTTP errors
        response_data = resp.json()

        # Check for GraphQL errors within the response
        if "errors" in response_data:
            logger.error(f"[Shopify API] GraphQL errors for shop {shop_url}: {response_data['errors']}")
            return None # Indicate failure

        logger.info(f"[Shopify API] GraphQL query successful for shop {shop_url}.")
        return response_data

    except requests.exceptions.RequestException as e:
        error_detail = e.response.text if e.response else str(e)
        logger.error(f"[Shopify API] Failed to execute query for shop {shop_url}: {error_detail}")
        return None # Indicate failure
    except Exception as e:
        logger.error(f"[Shopify API] An unexpected error occurred for shop {shop_url}: {str(e)}")
        return None # Indicate failure


# --- Specific Data Fetching Functions ---

def get_shopify_orders(shop_url: str, access_token: str) -> dict | None:
    """Fetches the 10 most recent orders."""
    query = """
    query GetOrders {
      orders(first: 10, sortKey: PROCESSED_AT, reverse: true) {
        edges {
          node {
            id
            name # Order number like #1001
            processedAt
            displayFinancialStatus
            displayFulfillmentStatus
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            customer {
              firstName
              lastName
              email
            }
            lineItems(first: 5) {
              edges {
                node {
                  title
                  quantity
                  variant {
                    price
                    product { title }
                  }
                }
              }
            }
          }
        }
      }
    }
    """
    return execute_shopify_query(shop_url, access_token, query)


def get_shopify_products(shop_url: str, access_token: str) -> dict | None:
    """Fetches the first 10 products."""
    query = """
    query GetProducts {
      products(first: 10) {
        edges {
          node {
            id
            title
            handle
            status
            totalInventory
            productType
            vendor
            createdAt
            updatedAt
            variants(first: 5) {
              edges {
                node {
                  id
                  title
                  price
                  inventoryQuantity
                }
              }
            }
          }
        }
      }
    }
    """
    return execute_shopify_query(shop_url, access_token, query)

# Add more functions here later for analytics, customers, etc. as needed