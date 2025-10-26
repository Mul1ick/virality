// hooks/useGoogleData.ts
import { useState, useEffect } from "react";
import axios from "axios";

export interface GoogleCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
}

export const useGoogleData = (
  userId: string | null,
  managerId: string | null | undefined,
  customerId: string | null | undefined,
  isConnected: boolean,
  platformsLoaded: boolean
) => {
  const [campaigns, setCampaigns] = useState<GoogleCampaign[]>([]);
  const [loading, setLoading] = useState({
    campaigns: false,
  });
  const [error, setError] = useState({
    campaigns: null as string | null,
  });

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
        setLoading((prev) => ({ ...prev, campaigns: true }));
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

        console.log("📦 Raw Google campaigns response:", res.data);

        // Process and map the campaigns data
        const processed =
          res.data.campaigns?.map((c: any) => {
            console.log("🔍 Processing campaign:", c);

            return {
              id: c.id || c.campaign?.id || "",
              name: c.name || c.campaign?.name || "Unnamed Campaign",
              status: c.status || c.campaign?.status || "",
              objective:
                c.advertising_channel_type ||
                c.campaign?.advertising_channel_type ||
                c.objective ||
                "",
            };
          }) || [];

        console.log("✅ Processed campaigns:", processed);
        setCampaigns(processed);
        setError((prev) => ({ ...prev, campaigns: null }));
      } catch (e: any) {
        console.error("❌ Google campaigns error:", e);
        setError((prev) => ({
          ...prev,
          campaigns:
            e.response?.data?.detail ||
            e.message ||
            "Failed to fetch Google campaigns",
        }));
      } finally {
        setLoading((prev) => ({ ...prev, campaigns: false }));
      }
    };

    fetchCampaigns();
  }, [userId, managerId, customerId, isConnected, platformsLoaded, backendUrl]);

  const refreshAll = async () => {
    if (!userId || !managerId || !customerId) return;

    try {
      setLoading({ campaigns: true });

      const token = localStorage.getItem("access_token");
      const res = await axios.get(`${backendUrl}/google/campaigns/${userId}`, {
        params: {
          customer_id: customerId,
          manager_id: managerId,
        },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const processed =
        res.data.campaigns?.map((c: any) => ({
          id: c.id || c.campaign?.id || "",
          name: c.name || c.campaign?.name || "Unnamed Campaign",
          status: c.status || c.campaign?.status || "",
          objective:
            c.advertising_channel_type ||
            c.campaign?.advertising_channel_type ||
            c.objective ||
            "",
        })) || [];

      setCampaigns(processed);
      setError({ campaigns: null });
    } catch (e: any) {
      console.error("❌ Refresh failed:", e);
      setError({
        campaigns: e.response?.data?.detail || "Failed to refresh",
      });
    } finally {
      setLoading({ campaigns: false });
    }
  };

  return { campaigns, loading, error, refreshAll };
};
