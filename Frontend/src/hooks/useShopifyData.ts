// hooks/useShopifyData.ts - OPTIMIZED VERSION
import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export interface ShopifyOrder {
  id: string;
  name?: string;
  orderNumber?: string;
  email?: string;
  customer?: { email?: string };
  created_at?: string;
  createdAt?: string;
  total_price?: string;
  totalPrice?: string;
  currentTotalPrice?: { amount: string };
  financial_status?: string;
  financialStatus?: string;
  displayFinancialStatus?: string;
  fulfillment_status?: string;
  fulfillmentStatus?: string;
  displayFulfillmentStatus?: string;
  line_items?: any[];
  lineItems?: any[] | { edges?: any[] };
}

export interface ShopifyProduct {
  id: string;
  title: string;
  vendor?: string;
  product_type?: string;
  created_at: string;
  updated_at: string;
  status?: string;
  variants?: any[];
  image?: { src: string };
}

export interface ShopifyCustomer {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  orders_count?: number;
  total_spent?: string;
  created_at: string;
  updated_at: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export const useShopifyData = (
  userId: string | null,
  isConnected: boolean,
  platformsLoaded: boolean
) => {
  const [orders, setOrders] = useState<ShopifyOrder[]>([]);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [customers, setCustomers] = useState<ShopifyCustomer[]>([]);

  const [ordersPagination, setOrdersPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    hasMore: true,
  });

  const [productsPagination, setProductsPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    hasMore: true,
  });

  const [customersPagination, setCustomersPagination] =
    useState<PaginationInfo>({
      page: 1,
      limit: 50,
      total: 0,
      hasMore: true,
    });

  const [loading, setLoading] = useState({
    orders: false,
    products: false,
    customers: false,
  });

  const [error, setError] = useState({
    orders: null as string | null,
    products: null as string | null,
    customers: null as string | null,
  });

  // Fetch orders with pagination
  const fetchOrders = useCallback(
    async (page: number = 1, append: boolean = false) => {
      if (!userId || !isConnected || !platformsLoaded) return;

      try {
        setLoading((prev) => ({ ...prev, orders: true }));
        console.log(`📊 Fetching Shopify orders - page ${page}...`);

        const token = localStorage.getItem("access_token");
        const res = await axios.get(`${backendUrl}/shopify/orders/${userId}`, {
          params: { page, limit: 50 },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        const newOrders = res.data.data || res.data.orders || [];
        const total = res.data.total || newOrders.length;

        setOrders((prev) => (append ? [...prev, ...newOrders] : newOrders));
        setOrdersPagination({
          page,
          limit: 50,
          total,
          hasMore: newOrders.length === 50,
        });
        setError((prev) => ({ ...prev, orders: null }));
        console.log(`✅ Fetched ${newOrders.length} orders (page ${page})`);
      } catch (e: any) {
        console.error("❌ Shopify orders error:", e);
        setError((prev) => ({
          ...prev,
          orders: e.response?.data?.detail || "Failed to fetch orders",
        }));
      } finally {
        setLoading((prev) => ({ ...prev, orders: false }));
      }
    },
    [userId, isConnected, platformsLoaded]
  );

  // Fetch products with pagination
  const fetchProducts = useCallback(
    async (page: number = 1, append: boolean = false) => {
      if (!userId || !isConnected || !platformsLoaded) return;

      try {
        setLoading((prev) => ({ ...prev, products: true }));
        console.log(`📊 Fetching Shopify products - page ${page}...`);

        const token = localStorage.getItem("access_token");
        const res = await axios.get(
          `${backendUrl}/shopify/products/${userId}`,
          {
            params: { page, limit: 50 },
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );

        const newProducts = res.data.data || res.data.products || [];
        const total = res.data.total || newProducts.length;

        setProducts((prev) =>
          append ? [...prev, ...newProducts] : newProducts
        );
        setProductsPagination({
          page,
          limit: 50,
          total,
          hasMore: newProducts.length === 50,
        });
        setError((prev) => ({ ...prev, products: null }));
        console.log(`✅ Fetched ${newProducts.length} products (page ${page})`);
      } catch (e: any) {
        console.error("❌ Shopify products error:", e);
        setError((prev) => ({
          ...prev,
          products: e.response?.data?.detail || "Failed to fetch products",
        }));
      } finally {
        setLoading((prev) => ({ ...prev, products: false }));
      }
    },
    [userId, isConnected, platformsLoaded]
  );

  // Fetch customers with pagination
  const fetchCustomers = useCallback(
    async (page: number = 1, append: boolean = false) => {
      if (!userId || !isConnected || !platformsLoaded) return;

      try {
        setLoading((prev) => ({ ...prev, customers: true }));
        console.log(`📊 Fetching Shopify customers - page ${page}...`);

        const token = localStorage.getItem("access_token");
        const res = await axios.get(
          `${backendUrl}/shopify/customers/${userId}`,
          {
            params: { page, limit: 50 },
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );

        const newCustomers = res.data.data || res.data.customers || [];
        const total = res.data.total || newCustomers.length;

        setCustomers((prev) =>
          append ? [...prev, ...newCustomers] : newCustomers
        );
        setCustomersPagination({
          page,
          limit: 50,
          total,
          hasMore: newCustomers.length === 50,
        });
        setError((prev) => ({ ...prev, customers: null }));
        console.log(
          `✅ Fetched ${newCustomers.length} customers (page ${page})`
        );
      } catch (e: any) {
        console.error("❌ Shopify customers error:", e);
        setError((prev) => ({
          ...prev,
          customers: e.response?.data?.detail || "Failed to fetch customers",
        }));
      } finally {
        setLoading((prev) => ({ ...prev, customers: false }));
      }
    },
    [userId, isConnected, platformsLoaded]
  );

  // Load more functions
  const loadMoreOrders = useCallback(() => {
    if (ordersPagination.hasMore && !loading.orders) {
      fetchOrders(ordersPagination.page + 1, true);
    }
  }, [ordersPagination, loading.orders, fetchOrders]);

  const loadMoreProducts = useCallback(() => {
    if (productsPagination.hasMore && !loading.products) {
      fetchProducts(productsPagination.page + 1, true);
    }
  }, [productsPagination, loading.products, fetchProducts]);

  const loadMoreCustomers = useCallback(() => {
    if (customersPagination.hasMore && !loading.customers) {
      fetchCustomers(customersPagination.page + 1, true);
    }
  }, [customersPagination, loading.customers, fetchCustomers]);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Auto-sync on first connection
  const checkAndSync = useCallback(async () => {
    if (!userId || !isConnected || !platformsLoaded) return;

    // Check if we have any data in MongoDB
    try {
      const token = localStorage.getItem("access_token");
      const testFetch = await axios.get(
        `${backendUrl}/shopify/orders/${userId}`,
        {
          params: { page: 1, limit: 1 },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      // If we have data, skip sync
      if (testFetch.data?.total > 0) {
        console.log("📦 [Shopify] Data exists, loading pages...");
        setSyncComplete(true);
        await fetchOrders(1, false);
        return;
      }

      // No data found - trigger full sync
      console.log("🔄 [Shopify] No data found, starting initial sync...");
      setSyncing(true);
      setSyncError(null);

      const syncResponse = await axios.post(
        `${backendUrl}/shopify/sync/${userId}`,
        {},
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          timeout: 300000, // 5 minute timeout
        }
      );

      console.log("✅ [Shopify] Sync complete:", syncResponse.data);
      setSyncComplete(true);

      // Now fetch paginated data
      await fetchOrders(1, false);
    } catch (e: any) {
      console.error("❌ [Shopify] Sync failed:", e);
      setSyncError(
        e.response?.data?.detail || "Sync failed. Please try again."
      );
    } finally {
      setSyncing(false);
    }
  }, [userId, isConnected, platformsLoaded, fetchOrders]);

  // Initial check and sync on mount
  useEffect(() => {
    if (platformsLoaded && isConnected && userId) {
      checkAndSync();
    }
  }, [userId, isConnected, platformsLoaded]);

  // Refresh all data (reset to page 1)
  const refreshAll = useCallback(async () => {
    console.log("🔄 Refreshing Shopify data...");
    await Promise.all([
      fetchOrders(1, false),
      fetchProducts(1, false),
      fetchCustomers(1, false),
    ]);
    console.log("✅ Shopify data refreshed");
  }, [fetchOrders, fetchProducts, fetchCustomers]);

  return {
    orders,
    products,
    customers,
    loading,
    error,
    syncing,
    syncComplete,
    syncError,
    pagination: {
      orders: ordersPagination,
      products: productsPagination,
      customers: customersPagination,
    },
    loadMore: {
      orders: loadMoreOrders,
      products: loadMoreProducts,
      customers: loadMoreCustomers,
    },
    fetchOrders,
    fetchProducts,
    fetchCustomers,
    refreshAll,
    checkAndSync,
  };
};
