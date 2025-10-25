// hooks/usePlatformStatus.ts
import { useState, useEffect } from "react";
import axios from "axios";

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

      try {
        console.log("🔍 Fetching platform status for user:", userId);
        const res = await axios.get(`${backendUrl}/user/${userId}/platforms`);
        console.log("✅ Platform status:", res.data);
        setPlatformStatus(res.data);
        setError(null);
      } catch (e) {
        console.error("❌ Failed to fetch platform status:", e);
        setError("Failed to load platform connections");
      } finally {
        setLoading(false);
      }
    };

    fetchPlatforms();
  }, [userId, backendUrl]);

  return { platformStatus, loading, error };
};
