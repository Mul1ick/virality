// hooks/usePlatformStatus.ts
import { useState, useEffect } from "react";
import apiClient from "@/lib/api";

interface PlatformStatus {
  meta: {
    connected: boolean;
    ad_account_id?: string | null;
    ad_account_name?: string | null;
  };
  google: {
    connected: boolean;
    customer_ids?: string[];
    manager_id?: string | null;
    client_customer_id?: string | null;
    selected_manager_id?: string | null;
  };
  shopify: {
    connected: boolean;
    shop_url?: string | null;
  };
}

export const usePlatformStatus = (userId: string | null) => {
  const [platformStatus, setPlatformStatus] = useState<PlatformStatus>({
    meta: { connected: false },
    google: { connected: false },
    shopify: { connected: false },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlatforms = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        console.log("🔍 Fetching platform status for user:", userId);

        // Use apiClient which automatically adds the Bearer token
        const res = await apiClient.get(`/user/${userId}/platforms`);

        console.log("✅ Platform status:", res.data);

        const data = res.data;

        setPlatformStatus({
          meta: {
            connected: data.meta?.connected || false,
            ad_account_id: data.meta?.ad_account_id || null,
            ad_account_name: data.meta?.ad_account_name || null,
          },
          google: {
            connected: data.google?.connected || false,
            customer_ids: data.google?.customer_ids || [],
            manager_id: data.google?.manager_id || null,
            client_customer_id: data.google?.client_customer_id || null,
            selected_manager_id: data.google?.selected_manager_id || null,
          },
          shopify: {
            connected: data.shopify?.connected || false,
            shop_url: data.shopify?.shop_url || null,
          },
        });

        setError(null);
      } catch (e: any) {
        console.error("❌ Failed to fetch platform status:", e);
        // Don't set error for 401 — the apiClient interceptor handles that
        if (e.response?.status !== 401) {
          setError("Failed to load platform connections");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPlatforms();
  }, [userId]);
  return { platformStatus, loading, error };
};
