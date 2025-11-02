// hooks/useGoogleData.ts - SIMPLE VERSION (Metrics already in data!)
import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";

const backendUrl = import.meta.env.VITE_BACKEND_URL;

// Simplified interfaces - metrics are part of the main object
export interface GoogleCampaign {
  id: string;
  name: string;
  status: string;
  advertising_channel_type: string;
  clicks: number;
  impressions: number;
  conversions: number;
  cost_micros: number;
  // Computed metrics
  spend?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
}

export interface GoogleAdGroup {
  id: string;
  name: string;
  status: string;
  campaign_id: string;
  campaign_name?: string;
  clicks: number;
  impressions: number;
  conversions: number;
  cost_micros: number;
  // Computed
  spend?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
}

export interface GoogleAd {
  id: string;
  name: string;
  status: string;
  ad_group_id: string;
  ad_group_name?: string;
  clicks: number;
  impressions: number;
  conversions: number;
  cost_micros: number;
  // Computed
  spend?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
}

// Helper to compute metrics
function computeMetrics<
  T extends { clicks: number; impressions: number; cost_micros: number }
>(item: T): T & { spend: number; ctr: number; cpc: number; cpm: number } {
  const clicks = Number(item.clicks) || 0;
  const impressions = Number(item.impressions) || 0;
  const costMicros = Number(item.cost_micros) || 0;
  const spend = costMicros / 1000000; // Convert micros to dollars

  return {
    ...item,
    spend,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
  };
}

export const useGoogleData = (
  userId: string | null,
  managerId: string | null | undefined,
  customerId: string | null | undefined,
  isConnected: boolean,
  platformsLoaded: boolean
) => {
  const [campaigns, setCampaigns] = useState<GoogleCampaign[]>([]);
  const [adGroups, setAdGroups] = useState<GoogleAdGroup[]>([]);
  const [ads, setAds] = useState<GoogleAd[]>([]);

  const [loading, setLoading] = useState({
    campaigns: false,
    adGroups: false,
    ads: false,
  });

  const [error, setError] = useState({
    campaigns: null as string | null,
    adGroups: null as string | null,
    ads: null as string | null,
  });

  const canFetch = platformsLoaded && isConnected && userId && customerId;

  // Fetch ALL data
  useEffect(() => {
    if (!canFetch) {
      console.log("⏭️ [Google] Skipping fetch");
      return;
    }

    const fetchAllData = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) {
        console.error("❌ [Google] No auth token");
        return;
      }

      setLoading({ campaigns: true, adGroups: true, ads: true });
      setError({ campaigns: null, adGroups: null, ads: null });

      const headers = { Authorization: `Bearer ${token}` };
      const params: any = { customer_id: customerId };
      if (managerId) params.manager_id = managerId;

      try {
        console.log("📊 [Google] Fetching all data...");

        // Fetch all in parallel (3 API calls)
        const [campaignsRes, adGroupsRes, adsRes] = await Promise.all([
          axios
            .get(`${backendUrl}/google/campaigns/${userId}`, {
              params,
              headers,
              timeout: 30000,
            })
            .catch((err) => ({ error: err })),

          axios
            .get(`${backendUrl}/google/adgroups/all/${userId}`, {
              params,
              headers,
              timeout: 30000,
            })
            .catch((err) => ({ error: err })),

          axios
            .get(`${backendUrl}/google/ads/all/${userId}`, {
              params,
              headers,
              timeout: 30000,
            })
            .catch((err) => ({ error: err })),
        ]);

        // Process campaigns
        if ("error" in campaignsRes) {
          console.error("❌ [Google] Campaigns error:", campaignsRes.error);
          setError((prev) => ({
            ...prev,
            campaigns: "Failed to fetch campaigns",
          }));
        } else {
          const processed = (campaignsRes.data?.campaigns || [])
            .map((c: any) =>
              computeMetrics({
                id: c.id || "",
                name: c.name || "Unnamed",
                status: c.status || "",
                advertising_channel_type: c.advertising_channel_type || "",
                clicks: Number(c.clicks) || 0,
                impressions: Number(c.impressions) || 0,
                conversions: Number(c.conversions) || 0,
                cost_micros: Number(c.cost_micros) || 0,
              })
            )
            .filter((c: GoogleCampaign) => c.spend > 0 || c.clicks > 0); // Only show campaigns with data

          console.log(`✅ [Google] Campaigns: ${processed.length} with data`);
          setCampaigns(processed);
        }

        // Process ad groups
        if ("error" in adGroupsRes) {
          console.error("❌ [Google] Ad groups error:", adGroupsRes.error);
          setError((prev) => ({
            ...prev,
            adGroups: "Failed to fetch ad groups",
          }));
        } else {
          const processed = (adGroupsRes.data?.adgroups || [])
            .map((ag: any) =>
              computeMetrics({
                id: ag.id || "",
                name: ag.name || "Unnamed",
                status: ag.status || "",
                campaign_id: ag.campaign_id || "",
                clicks: Number(ag.clicks) || 0,
                impressions: Number(ag.impressions) || 0,
                conversions: Number(ag.conversions) || 0,
                cost_micros: Number(ag.cost_micros) || 0,
              })
            )
            .filter((ag: GoogleAdGroup) => ag.spend > 0 || ag.clicks > 0);

          console.log(`✅ [Google] Ad Groups: ${processed.length} with data`);
          setAdGroups(processed);
        }

        // Process ads
        if ("error" in adsRes) {
          console.error("❌ [Google] Ads error:", adsRes.error);
          setError((prev) => ({ ...prev, ads: "Failed to fetch ads" }));
        } else {
          const processed = (adsRes.data?.ads || [])
            .map((ad: any) =>
              computeMetrics({
                id: ad.id || "",
                name: ad.name || "Unnamed",
                status: ad.status || "",
                ad_group_id: ad.ad_group_id || "",
                clicks: Number(ad.clicks) || 0,
                impressions: Number(ad.impressions) || 0,
                conversions: Number(ad.conversions) || 0,
                cost_micros: Number(ad.cost_micros) || 0,
              })
            )
            .filter((ad: GoogleAd) => ad.spend > 0 || ad.clicks > 0);

          console.log(`✅ [Google] Ads: ${processed.length} with data`);
          setAds(processed);
        }

        console.log("✅ [Google] All data loaded!");
      } catch (e: any) {
        console.error("❌ [Google] Unexpected error:", e);
      } finally {
        setLoading({ campaigns: false, adGroups: false, ads: false });
      }
    };

    fetchAllData();
  }, [canFetch, userId, managerId, customerId]);

  // Add campaign names to ad groups
  const enrichedAdGroups = useMemo(() => {
    const campaignMap = new Map(campaigns.map((c) => [c.id, c.name]));

    return adGroups.map((ag) => ({
      ...ag,
      campaign_name: campaignMap.get(ag.campaign_id) || "Unknown Campaign",
    }));
  }, [adGroups, campaigns]);

  // Add ad group names to ads
  const enrichedAds = useMemo(() => {
    const adGroupMap = new Map(adGroups.map((ag) => [ag.id, ag.name]));

    return ads.map((ad) => ({
      ...ad,
      ad_group_name: adGroupMap.get(ad.ad_group_id) || "Unknown Ad Group",
    }));
  }, [ads, adGroups]);

  // Refresh function
  const refreshAll = useCallback(async () => {
    console.log("🔄 [Google] Refreshing...");
    // Just trigger re-fetch by updating a dependency (could add a trigger state)
  }, []);

  return {
    campaigns,
    adGroups: enrichedAdGroups,
    ads: enrichedAds,
    loading,
    error,
    refreshAll,
  };
};
