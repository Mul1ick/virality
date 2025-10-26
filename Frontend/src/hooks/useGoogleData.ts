// hooks/useGoogleData.ts
import { useState, useEffect } from "react";
import axios from "axios";

export const useGoogleData = (
  userId: string | null,
  managerId: string | null | undefined,
  customerId: string | null | undefined,
  isConnected: boolean,
  platformsLoaded: boolean
) => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    if (!platformsLoaded || !isConnected || !userId) {
      return;
    }

    // Use selected_manager_id if available, fallback to manager_id
    const effectiveManagerId = managerId;
    const effectiveCustomerId = customerId;

    if (!effectiveManagerId || !effectiveCustomerId) {
      console.log("⚠️ Google connected but missing manager_id or customer_id");
      return;
    }

    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        console.log(`📊 Fetching Google campaigns...`);

        const token = localStorage.getItem("access_token");
        const res = await axios.get(
          `${backendUrl}/google/campaigns/${userId}`,
          {
            params: {
              customer_id: customerId,
              manager_id: managerId,
            },
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );

        setCampaigns(res.data.campaigns || []);
        setError(null);
      } catch (e: any) {
        console.error("❌ Google campaigns error:", e);
        setError(e.message || "Failed to fetch Google campaigns");
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, [userId, managerId, customerId, isConnected, platformsLoaded, backendUrl]);

  return { campaigns, loading, error };
};
