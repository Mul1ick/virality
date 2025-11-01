// Frontend/src/hooks/useMetaData.ts
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
  customRange?: DateRange // 🔥 NEW PARAM
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
          campaign_id: a.campaign_id,
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
      return;
    }

    // 🔥 Check if custom range is selected and valid
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
        // 🔥 USE POST ENDPOINT FOR CUSTOM DATE RANGE
        const formatDate = (date: Date) => date.toISOString().split("T")[0];

        const [campaignsInsRes, adsetsInsRes, adsInsRes] = await Promise.all([
          apiClient.post(`/aggregate/meta`, {
            ad_account_id: adAccountId,
            start_date: formatDate(customRange.from!),
            end_date: formatDate(customRange.to!),
            group_by: "campaign",
          }),
          apiClient.post(`/aggregate/meta`, {
            ad_account_id: adAccountId,
            start_date: formatDate(customRange.from!),
            end_date: formatDate(customRange.to!),
            group_by: "adset",
          }),
          apiClient.post(`/aggregate/meta`, {
            ad_account_id: adAccountId,
            start_date: formatDate(customRange.from!),
            end_date: formatDate(customRange.to!),
            group_by: "ad",
          }),
        ]);

        setCampaignInsights(campaignsInsRes.data || {});
        setAdSetInsights(adsetsInsRes.data || {});
        setAdInsights(adsInsRes.data || {});
      } else {
        // 🔥 USE GET ENDPOINT FOR PRESET DATE RANGES
        const [campaignsInsRes, adsetsInsRes, adsInsRes] = await Promise.all([
          apiClient.get(`/aggregate/meta/insights/campaign`, {
            params: { ad_account_id: adAccountId, date_preset: dateRange },
          }),
          apiClient.get(`/aggregate/meta/insights/adset`, {
            params: { ad_account_id: adAccountId, date_preset: dateRange },
          }),
          apiClient.get(`/aggregate/meta/insights/ad`, {
            params: { ad_account_id: adAccountId, date_preset: dateRange },
          }),
        ]);

        setCampaignInsights(campaignsInsRes.data || {});
        setAdSetInsights(adsetsInsRes.data || {});
        setAdInsights(adsInsRes.data || {});
      }

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
  ]); // 🔥 ADDED customRange

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
    console.log("🔄 Refreshing all Meta data...");
    await fetchBasicData();
    await fetchAggregatedInsights();
    console.log("✅ Meta data refresh triggered.");
  }, [fetchBasicData, fetchAggregatedInsights]);

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
