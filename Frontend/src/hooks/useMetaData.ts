// hooks/useMetaData.ts
import { useState, useEffect } from "react";
import axios from "axios";

interface MetaInsights {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpm: number;
  frequency: number;
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

export interface MetaAd {
  id: string;
  name: string;
  status: string;
  adset_id: string;
  creative: any;
  insights: MetaInsights | null;
}

const processInsights = (insightsData: any): MetaInsights | null => {
  if (!insightsData?.data?.[0]) return null;

  const data = insightsData.data[0];
  const clicks = parseInt(data.inline_link_clicks || 0);
  const spend = parseFloat(data.spend || 0);

  return {
    spend,
    impressions: parseInt(data.impressions || 0),
    reach: parseInt(data.reach || 0),
    clicks,
    ctr: parseFloat(data.ctr || 0),
    cpm: parseFloat(data.cpm || 0),
    frequency: parseFloat(data.frequency || 0),
    cpc: clicks > 0 ? spend / clicks : 0,
  };
};

export const useMetaData = (
  userId: string | null,
  adAccountId: string | null,
  isConnected: boolean,
  platformsLoaded: boolean,
  dateRange: string
) => {
  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
  const [adSets, setAdSets] = useState<MetaAdSet[]>([]);
  const [ads, setAds] = useState<MetaAd[]>([]);

  const [loading, setLoading] = useState({
    campaigns: false,
    adSets: false,
    ads: false,
  });

  const [error, setError] = useState({
    campaigns: null as string | null,
    adSets: null as string | null,
    ads: null as string | null,
  });

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  // Fetch campaigns
  useEffect(() => {
    if (!platformsLoaded || !isConnected || !adAccountId || !userId) return;

    const fetchCampaigns = async () => {
      try {
        setLoading((prev) => ({ ...prev, campaigns: true }));
        const res = await axios.get(
          `${backendUrl}/meta/campaigns/insights/${userId}/${adAccountId}`
        );

        const processed =
          res.data.data?.map((c: any) => ({
            id: c.id,
            name: c.name,
            status: c.status,
            objective: c.objective,
            insights: processInsights(c.insights),
          })) || [];

        setCampaigns(processed);
        setError((prev) => ({ ...prev, campaigns: null }));
      } catch (e: any) {
        console.error("❌ Meta campaigns error:", e);
        setError((prev) => ({
          ...prev,
          campaigns: e.response?.data?.detail || "Failed to fetch campaigns",
        }));
      } finally {
        setLoading((prev) => ({ ...prev, campaigns: false }));
      }
    };

    fetchCampaigns();
  }, [
    userId,
    adAccountId,
    isConnected,
    platformsLoaded,
    dateRange,
    backendUrl,
  ]);

  // Fetch ad sets
  useEffect(() => {
    if (!platformsLoaded || !isConnected || !adAccountId || !userId) return;

    const fetchAdSets = async () => {
      try {
        setLoading((prev) => ({ ...prev, adSets: true }));
        const res = await axios.get(
          `${backendUrl}/meta/adsets/insights/${userId}/${adAccountId}`
        );

        const processed =
          res.data.data?.map((a: any) => ({
            id: a.id,
            name: a.name,
            status: a.status,
            daily_budget: a.daily_budget,
            campaign_id: a.campaign_id,
            insights: processInsights(a.insights),
          })) || [];

        setAdSets(processed);
        setError((prev) => ({ ...prev, adSets: null }));
      } catch (e: any) {
        console.error("❌ Meta ad sets error:", e);
        setError((prev) => ({
          ...prev,
          adSets: e.response?.data?.detail || "Failed to fetch ad sets",
        }));
      } finally {
        setLoading((prev) => ({ ...prev, adSets: false }));
      }
    };

    fetchAdSets();
  }, [
    userId,
    adAccountId,
    isConnected,
    platformsLoaded,
    dateRange,
    backendUrl,
  ]);

  // Fetch ads
  useEffect(() => {
    if (!platformsLoaded || !isConnected || !adAccountId || !userId) return;

    const fetchAds = async () => {
      try {
        setLoading((prev) => ({ ...prev, ads: true }));
        const res = await axios.get(
          `${backendUrl}/meta/ads/insights/${userId}/${adAccountId}`
        );

        const processed =
          res.data.data?.map((a: any) => ({
            id: a.id,
            name: a.name,
            status: a.status,
            adset_id: a.adset_id,
            creative: a.creative,
            insights: processInsights(a.insights),
          })) || [];

        setAds(processed);
        setError((prev) => ({ ...prev, ads: null }));
      } catch (e: any) {
        console.error("❌ Meta ads error:", e);
        setError((prev) => ({
          ...prev,
          ads: e.response?.data?.detail || "Failed to fetch ads",
        }));
      } finally {
        setLoading((prev) => ({ ...prev, ads: false }));
      }
    };

    fetchAds();
  }, [
    userId,
    adAccountId,
    isConnected,
    platformsLoaded,
    dateRange,
    backendUrl,
  ]);

  const refreshAll = async () => {
    if (!userId || !adAccountId) return;

    try {
      setLoading({ campaigns: true, adSets: true, ads: true });

      const [campaignsRes, adsetsRes, adsRes] = await Promise.all([
        axios.get(
          `${backendUrl}/meta/campaigns/insights/${userId}/${adAccountId}`
        ),
        axios.get(
          `${backendUrl}/meta/adsets/insights/${userId}/${adAccountId}`
        ),
        axios.get(`${backendUrl}/meta/ads/insights/${userId}/${adAccountId}`),
      ]);

      setCampaigns(
        campaignsRes.data.data?.map((c: any) => ({
          id: c.id,
          name: c.name,
          status: c.status,
          objective: c.objective,
          insights: processInsights(c.insights),
        })) || []
      );

      setAdSets(
        adsetsRes.data.data?.map((a: any) => ({
          id: a.id,
          name: a.name,
          status: a.status,
          daily_budget: a.daily_budget,
          campaign_id: a.campaign_id,
          insights: processInsights(a.insights),
        })) || []
      );

      setAds(
        adsRes.data.data?.map((a: any) => ({
          id: a.id,
          name: a.name,
          status: a.status,
          adset_id: a.adset_id,
          creative: a.creative,
          insights: processInsights(a.insights),
        })) || []
      );

      setError({ campaigns: null, adSets: null, ads: null });
    } catch (e: any) {
      console.error("❌ Refresh failed:", e);
      setError((prev) => ({
        ...prev,
        campaigns: e.response?.data?.detail || "Failed to refresh",
      }));
    } finally {
      setLoading({ campaigns: false, adSets: false, ads: false });
    }
  };

  return { campaigns, adSets, ads, loading, error, refreshAll };
};
