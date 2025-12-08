// Frontend/src/hooks/useMetaData.ts
// MINIMAL FIX - Just increase timeout and fix one thing
import { useState, useEffect, useCallback, useMemo } from "react";
import apiClient from "@/lib/api";
import { DateRange } from "react-day-picker";

// --- Interfaces ---
interface MetaInsights {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpm: number;
  cpc: number;
}

export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  insights: MetaInsights | null;
}

export interface MetaAdSet {
  id: string;
  name: string;
  status: string;
  daily_budget: string;
  campaign_id: string;
  insights: MetaInsights | null;
}

export interface MetaAdCreative {
  image_url?: string;
  body?: string;
  id?: string;
}

export interface MetaAd {
  id: string;
  name: string;
  status: string;
  adset_id: string;
  creative: MetaAdCreative | null;
  insights: MetaInsights | null;
}

interface AggregatedInsights {
  [id: string]: Omit<MetaInsights, "frequency">;
}

export const useMetaData = (
  userId: string | null,
  adAccountId: string | null | undefined,
  isConnected: boolean,
  platformsLoaded: boolean,
  dateRange: string,
  customRange?: DateRange
) => {
  // State for basic data
  const [campaignsBasic, setCampaignsBasic] = useState<
    Omit<MetaCampaign, "insights">[]
  >([]);
  const [adSetsBasic, setAdSetsBasic] = useState<Omit<MetaAdSet, "insights">[]>(
    []
  );
  const [adsBasic, setAdsBasic] = useState<Omit<MetaAd, "insights">[]>([]);

  // State for aggregated insights
  const [campaignInsights, setCampaignInsights] = useState<AggregatedInsights>(
    {}
  );
  const [adSetInsights, setAdSetInsights] = useState<AggregatedInsights>({});
  const [adInsights, setAdInsights] = useState<AggregatedInsights>({});

  // Loading and error states
  const [loading, setLoading] = useState({
    campaignsBasic: false,
    adSetsBasic: false,
    adsBasic: false,
    campaignsInsights: false,
    adSetsInsights: false,
    adsInsights: false,
  });
  const [error, setError] = useState({
    campaignsBasic: null as string | null,
    adSetsBasic: null as string | null,
    adsBasic: null as string | null,
    campaignsInsights: null as string | null,
    adSetsInsights: null as string | null,
    adsInsights: null as string | null,
  });

  // --- Fetch Basic Data Logic ---
  const fetchBasicData = useCallback(async () => {
    if (!platformsLoaded || !isConnected || !adAccountId || !userId) return;

    const levels: ("campaigns" | "adsets" | "ads")[] = [
      "campaigns",
      "adsets",
      "ads",
    ];
    levels.forEach((level) => {
      const basicLoadingKey = `${level}Basic` as keyof typeof loading;
      const basicErrorKey = `${level}Basic` as keyof typeof error;
      setLoading((prev) => ({ ...prev, [basicLoadingKey]: true }));
      setError((prev) => ({ ...prev, [basicErrorKey]: null }));
    });

    try {
      const [campaignsRes, adsetsRes, adsRes] = await Promise.all([
        apiClient.get(`/meta/campaigns/${userId}/${adAccountId}`),
        apiClient.get(`/meta/adsets/${userId}/${adAccountId}`),
        apiClient.get(`/meta/ads/${userId}/${adAccountId}`),
      ]);

      setCampaignsBasic(
        campaignsRes.data.data?.map((c: any) => ({
          id: c.id,
          name: c.name,
          status: c.status,
          objective: c.objective,
        })) || []
      );
      setError((prev) => ({ ...prev, campaignsBasic: null }));

      setAdSetsBasic(
        adsetsRes.data.data?.map((a: any) => ({
          id: a.id,
          name: a.name,
          status: a.status,
          daily_budget: a.daily_budget,
          campaign_id: a.campaign_id || a.campaign?.id || "",
        })) || []
      );
      setError((prev) => ({ ...prev, adSetsBasic: null }));

      setAdsBasic(
        adsRes.data.data?.map((a: any) => ({
          id: a.id,
          name: a.name,
          status: a.status,
          adset_id: a.adset_id,
          creative: a.creative,
        })) || []
      );
      setError((prev) => ({ ...prev, adsBasic: null }));
    } catch (e: any) {
      console.error(`❌ Meta basic data error:`, e);
      const errorMsg =
        e.response?.data?.detail || "Failed to fetch basic Meta data";
      setError((prev) => ({
        ...prev,
        campaignsBasic: errorMsg,
        adSetsBasic: errorMsg,
        adsBasic: errorMsg,
      }));
    } finally {
      levels.forEach((level) => {
        const basicLoadingKey = `${level}Basic` as keyof typeof loading;
        setLoading((prev) => ({ ...prev, [basicLoadingKey]: false }));
      });
    }
  }, [userId, adAccountId, isConnected, platformsLoaded]);

  // --- Fetch Aggregated Insights Logic ---
  const fetchAggregatedInsights = useCallback(async () => {
    if (
      !platformsLoaded ||
      !isConnected ||
      !adAccountId ||
      !userId ||
      !dateRange
    )
      return;

    if (dateRange === "custom" && (!customRange?.from || !customRange?.to)) {
      console.log("⏭️ Skipping insights: custom range incomplete");
      return;
    }

    // 🔧 DEBUG LOG
    console.log("📊 [Meta] Fetching insights:", {
      dateRange,
      isCustom: dateRange === "custom",
      from: customRange?.from?.toISOString(),
      to: customRange?.to?.toISOString(),
    });

    const isCustomRange =
      dateRange === "custom" && customRange?.from && customRange?.to;

    const levels: ("campaign" | "adset" | "ad")[] = ["campaign", "adset", "ad"];
    levels.forEach((level) => {
      const insightsLoadingKey = `${level}sInsights` as keyof typeof loading;
      const insightsErrorKey = `${level}sInsights` as keyof typeof error;
      setLoading((prev) => ({ ...prev, [insightsLoadingKey]: true }));
      setError((prev) => ({ ...prev, [insightsErrorKey]: null }));
    });

    try {
      if (isCustomRange) {
        // 🔧 USE POST ENDPOINT FOR CUSTOM DATE RANGE
        const formatDate = (date: Date) => date.toISOString().split("T")[0];

        console.log("📊 [Meta] Using POST with custom dates");

        const [campaignsInsRes, adsetsInsRes, adsInsRes] = await Promise.all([
          apiClient.post(
            `/aggregate/meta`,
            {
              ad_account_id: adAccountId,
              start_date: formatDate(customRange.from!),
              end_date: formatDate(customRange.to!),
              group_by: "campaign",
            },
            { timeout: 60000 } // 🔧 60 second timeout
          ),
          apiClient.post(
            `/aggregate/meta`,
            {
              ad_account_id: adAccountId,
              start_date: formatDate(customRange.from!),
              end_date: formatDate(customRange.to!),
              group_by: "adset",
            },
            { timeout: 60000 }
          ),
          apiClient.post(
            `/aggregate/meta`,
            {
              ad_account_id: adAccountId,
              start_date: formatDate(customRange.from!),
              end_date: formatDate(customRange.to!),
              group_by: "ad",
            },
            { timeout: 60000 }
          ),
        ]);

        setCampaignInsights(campaignsInsRes.data || {});
        setAdSetInsights(adsetsInsRes.data || {});
        setAdInsights(adsInsRes.data || {});
      } else {
        // 🔧 USE GET ENDPOINT FOR PRESET DATE RANGES
        console.log("📊 [Meta] Using GET with preset:", dateRange);

        const [campaignsInsRes, adsetsInsRes, adsInsRes] = await Promise.all([
          apiClient.get(`/aggregate/meta/insights/campaign`, {
            params: { ad_account_id: adAccountId, date_preset: dateRange },
            timeout: 60000, // 🔧 60 second timeout
          }),
          apiClient.get(`/aggregate/meta/insights/adset`, {
            params: { ad_account_id: adAccountId, date_preset: dateRange },
            timeout: 60000,
          }),
          apiClient.get(`/aggregate/meta/insights/ad`, {
            params: { ad_account_id: adAccountId, date_preset: dateRange },
            timeout: 60000,
          }),
        ]);

        setCampaignInsights(campaignsInsRes.data || {});
        setAdSetInsights(adsetsInsRes.data || {});
        setAdInsights(adsInsRes.data || {});
      }

      console.log("✅ [Meta] Insights loaded successfully");

      setError((prev) => ({
        ...prev,
        campaignsInsights: null,
        adSetsInsights: null,
        adsInsights: null,
      }));
    } catch (e: any) {
      console.error(`❌ Meta insights error:`, e);
      const errorMsg =
        e.response?.data?.detail || "Failed to fetch Meta insights";
      setError((prev) => ({
        ...prev,
        campaignsInsights: errorMsg,
        adSetsInsights: errorMsg,
        adsInsights: errorMsg,
      }));
    } finally {
      levels.forEach((level) => {
        const insightsLoadingKey = `${level}sInsights` as keyof typeof loading;
        setLoading((prev) => ({ ...prev, [insightsLoadingKey]: false }));
      });
    }
  }, [
    userId,
    adAccountId,
    isConnected,
    platformsLoaded,
    dateRange,
    customRange,
  ]);

  // --- Trigger Fetches ---
  useEffect(() => {
    fetchBasicData();
  }, [fetchBasicData]);

  useEffect(() => {
    fetchAggregatedInsights();
  }, [fetchAggregatedInsights]);

  // --- Combine Basic Data with Insights ---
  const combinedCampaigns = useMemo(
    () =>
      campaignsBasic.map((c) => ({
        ...c,
        insights: campaignInsights[c.id] || null,
      })),
    [campaignsBasic, campaignInsights]
  );

  const combinedAdSets = useMemo(
    () =>
      adSetsBasic.map((a) => ({
        ...a,
        insights: adSetInsights[a.id] || null,
      })),
    [adSetsBasic, adSetInsights]
  );

  const combinedAds = useMemo(
    () =>
      adsBasic.map((a) => ({
        ...a,
        insights: adInsights[a.id] || null,
      })),
    [adsBasic, adInsights]
  );

  // --- Refresh Function ---
  const refreshAll = useCallback(async () => {
    console.log("🔄 Syncing recent Meta data...");
    
    // 1. Trigger the Backend Sync
    try {
      await apiClient.post(`/meta/sync/recent/${userId}/${adAccountId}`);
      
      // 2. Wait a moment for sync to likely process (optional UX hack)
      // Since it's a background task, we can't await it perfectly without sockets,
      // but a small delay + re-fetch usually works for small accounts.
      await new Promise(r => setTimeout(r, 2000));
      
      // 3. Re-fetch from DB
      await fetchBasicData();
      // await fetchAggregatedInsights(); // Optional: only if you want to refresh charts too
      
      console.log("✅ Meta data refreshed.");
    } catch (e) {
      console.error("Sync failed", e);
    }
  }, [userId, adAccountId, fetchBasicData]);

  // --- Return ---
  return {
    campaigns: combinedCampaigns,
    adSets: combinedAdSets,
    ads: combinedAds,
    loading: {
      campaigns: loading.campaignsBasic || loading.campaignsInsights,
      adSets: loading.adSetsBasic || loading.adSetsInsights,
      ads: loading.adsBasic || loading.adsInsights,
    },
    error: {
      campaigns: error.campaignsBasic || error.campaignsInsights,
      adSets: error.adSetsBasic || error.adSetsInsights,
      ads: error.adsBasic || error.adsInsights,
    },
    refreshAll,
  };
};
