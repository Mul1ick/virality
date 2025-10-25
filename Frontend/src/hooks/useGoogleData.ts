// hooks/useGoogleData.ts
import { useState, useEffect } from "react";
import axios from "axios";

export const useGoogleData = (
  userId: string | null,
  managerId: string | null,
  customerId: string | null,
  isConnected: boolean,
  platformsLoaded: boolean
) => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    if (
      !platformsLoaded ||
      !isConnected ||
      !managerId ||
      !customerId ||
      !userId
    ) {
      return;
    }

    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        console.log(`📊 Fetching Google campaigns...`);

        const res = await axios.get(
          `${backendUrl}/google/campaigns/${userId}`,
          {
            params: {
              customer_id: customerId,
              manager_id: managerId,
            },
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
