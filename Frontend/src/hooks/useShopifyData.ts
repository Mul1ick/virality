// hooks/useShopifyData.ts
import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export interface ShopifyOrder {
  id: string;
  name: string;
  email?: string;
  created_at: string;
  total_price: string;
  financial_status: string;
  fulfillment_status: string;
  line_items?: any[];
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
  image?: {
    src: string;
  };
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

export const useShopifyData = (
  userId: string | null,
  isConnected: boolean,
  platformsLoaded: boolean
) => {
  const [orders, setOrders] = useState<ShopifyOrder[]>([]);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [customers, setCustomers] = useState<ShopifyCustomer[]>([]);

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

  // Fetch orders
  useEffect(() => {
    if (!platformsLoaded || !isConnected || !userId) return;

    const fetchOrders = async () => {
      try {
        setLoading((prev) => ({ ...prev, orders: true }));
        console.log("📊 Fetching Shopify orders...");

        const token = localStorage.getItem("access_token");
        const res = await axios.get(
          `${backendUrl}/shopify/orders/${userId}`,
          token ? { headers: { Authorization: `Bearer ${token}` } } : {}
        );

        setOrders(res.data.data || res.data.orders || []);
        setError((prev) => ({ ...prev, orders: null }));
        console.log(`✅ Fetched ${res.data.data?.length || 0} orders`);
      } catch (e: any) {
        console.error("❌ Shopify orders error:", e);
        setError((prev) => ({
          ...prev,
          orders: e.response?.data?.detail || "Failed to fetch orders",
        }));
      } finally {
        setLoading((prev) => ({ ...prev, orders: false }));
      }
    };

    fetchOrders();
  }, [userId, isConnected, platformsLoaded]);

  // Fetch products
  useEffect(() => {
    if (!platformsLoaded || !isConnected || !userId) return;

    const fetchProducts = async () => {
      try {
        setLoading((prev) => ({ ...prev, products: true }));
        console.log("📊 Fetching Shopify products...");

        const token = localStorage.getItem("access_token");
        const res = await axios.get(
          `${backendUrl}/shopify/products/${userId}`,
          token ? { headers: { Authorization: `Bearer ${token}` } } : {}
        );

        setProducts(res.data.data || res.data.products || []);
        setError((prev) => ({ ...prev, products: null }));
        console.log(`✅ Fetched ${res.data.data?.length || 0} products`);
      } catch (e: any) {
        console.error("❌ Shopify products error:", e);
        setError((prev) => ({
          ...prev,
          products: e.response?.data?.detail || "Failed to fetch products",
        }));
      } finally {
        setLoading((prev) => ({ ...prev, products: false }));
      }
    };

    fetchProducts();
  }, [userId, isConnected, platformsLoaded]);

  // Fetch customers
  useEffect(() => {
    if (!platformsLoaded || !isConnected || !userId) return;

    const fetchCustomers = async () => {
      try {
        setLoading((prev) => ({ ...prev, customers: true }));
        console.log("📊 Fetching Shopify customers...");

        const token = localStorage.getItem("access_token");
        const res = await axios.get(
          `${backendUrl}/shopify/customers/${userId}`,
          token ? { headers: { Authorization: `Bearer ${token}` } } : {}
        );

        setCustomers(res.data.data || res.data.customers || []);
        setError((prev) => ({ ...prev, customers: null }));
        console.log(`✅ Fetched ${res.data.data?.length || 0} customers`);
      } catch (e: any) {
        console.error("❌ Shopify customers error:", e);
        setError((prev) => ({
          ...prev,
          customers: e.response?.data?.detail || "Failed to fetch customers",
        }));
      } finally {
        setLoading((prev) => ({ ...prev, customers: false }));
      }
    };

    fetchCustomers();
  }, [userId, isConnected, platformsLoaded]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    console.log("🔄 Refreshing all Shopify data...");
    if (!userId) return;

    const token = localStorage.getItem("access_token");
    const config = token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : {};

    try {
      setLoading({ orders: true, products: true, customers: true });

      const [ordersRes, productsRes, customersRes] = await Promise.all([
        axios.get(`${backendUrl}/shopify/orders/${userId}`, config),
        axios.get(`${backendUrl}/shopify/products/${userId}`, config),
        axios.get(`${backendUrl}/shopify/customers/${userId}`, config),
      ]);

      setOrders(ordersRes.data.data || ordersRes.data.orders || []);
      setProducts(productsRes.data.data || productsRes.data.products || []);
      setCustomers(customersRes.data.data || customersRes.data.customers || []);
      setError({ orders: null, products: null, customers: null });

      console.log("✅ Shopify data refreshed");
    } catch (e: any) {
      console.error("❌ Refresh failed:", e);
      setError((prev) => ({
        ...prev,
        orders: e.response?.data?.detail || "Failed to refresh",
      }));
    } finally {
      setLoading({ orders: false, products: false, customers: false });
    }
  }, [userId]);

  return { orders, products, customers, loading, error, refreshAll };
};
