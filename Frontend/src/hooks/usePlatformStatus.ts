// hooks/usePlatformStatus.ts
import { useState, useEffect } from "react";
import axios from "axios";
import apiClient from "@/lib/api";

interface PlatformStatus {
  meta: { connected: boolean; ad_account_id: string | null };
  google: {
    connected: boolean;
    customer_ids: string[];
    manager_id: string | null;
    client_customer_id: string | null;
  };
  shopify: { connected: boolean; shop_url: string | null };
}

export const usePlatformStatus = (userId: string | null) => {
  const [platformStatus, setPlatformStatus] = useState<PlatformStatus>({
    meta: { connected: false, ad_account_id: null },
    google: {
      connected: false,
      customer_ids: [],
      manager_id: null,
      client_customer_id: null,
    },
    shopify: { connected: false, shop_url: null },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    const fetchPlatforms = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      // Reset status before fetching
      setPlatformStatus({
         meta: { connected: false, ad_account_id: null },
         google: { connected: false, customer_ids: [], manager_id: null, client_customer_id: null },
         shopify: { connected: false, shop_url: null },
      });
      setLoading(true); // Set loading true before fetch
      setError(null);


      try {
        console.log("🔍 Fetching platform status for user:", userId);
        // Use apiClient instead of axios
        const res = await apiClient.get(`/user/${userId}/platforms`); // Use relative path
        console.log("✅ Platform status:", res.data);

        // Ensure defaults if platform data is missing in response
        setPlatformStatus({
           meta: res.data.meta || { connected: false, ad_account_id: null },
           google: res.data.google || { connected: false, customer_ids: [], manager_id: null, client_customer_id: null },
           shopify: res.data.shopify || { connected: false, shop_url: null },
        });
        setError(null);
      } catch (e: any) { // Catch block already handles 401 via interceptor
        // Interceptor handles 401 redirect. Log other errors.
         if (e.response?.status !== 401) {
            console.error("❌ Failed to fetch platform status:", e);
            setError(e.response?.data?.detail || "Failed to load platform connections");
         }
      } finally {
        setLoading(false);
      }
    };

    fetchPlatforms();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]); // Removed backendUrl dependency if baseURL is set

  return { platformStatus, loading, error };
};
