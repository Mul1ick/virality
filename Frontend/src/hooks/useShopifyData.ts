// hooks/useShopifyData.ts
import { useState, useEffect } from "react";
import axios from "axios";

export const useShopifyData = (
  userId: string | null,
  isConnected: boolean,
  platformsLoaded: boolean
) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    if (!platformsLoaded || !isConnected || !userId) return;

    const fetchOrders = async () => {
      try {
        setLoading(true);
        console.log("📊 Fetching Shopify data...");

        const token = localStorage.getItem("access_token");
        const res = await axios.get(
          `${backendUrl}/shopify/orders/${userId}`,
          token ? { headers: { Authorization: `Bearer ${token}` } } : {}
        );

        setOrders(res.data.data || []);
        setError(null);
      } catch (e: any) {
        console.error("❌ Shopify error:", e);
        setError(e.response?.data?.detail || "Failed to fetch Shopify data");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [userId, isConnected, platformsLoaded, backendUrl]);

  return { orders, loading, error };
};
