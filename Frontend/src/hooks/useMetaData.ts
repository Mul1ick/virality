// // hooks/useMetaData.ts
// import { useState, useEffect } from "react";
// import axios from "axios";
// import apiClient from "@/lib/api";

// interface AggregatedInsights {
//   [id: string]: Omit<MetaInsights, 'frequency'>; // Omit frequency if not reliably calculated
// }

// interface MetaInsights {
//   spend: number;
//   impressions: number;
//   reach: number;
//   clicks: number;
//   ctr: number;
//   cpm: number;
//   frequency: number;
//   cpc: number;
// }

// export interface MetaCampaign {
//   id: string;
//   name: string;
//   status: string;
//   objective: string;
//   insights: MetaInsights | null;
// }

// export interface MetaAdSet {
//   id: string;
//   name: string;
//   status: string;
//   daily_budget: string;
//   campaign_id: string;
//   insights: MetaInsights | null;
// }

// export interface MetaAd {
//   id: string;
//   name: string;
//   status: string;
//   adset_id: string;
//   creative: any;
//   insights: MetaInsights | null;
// }

// const processInsights = (insightsData: any): MetaInsights | null => {
//   if (!insightsData?.data?.[0]) return null;

//   const data = insightsData.data[0];
//   const clicks = parseInt(data.inline_link_clicks || 0);
//   const spend = parseFloat(data.spend || 0);

//   return {
//     spend,
//     impressions: parseInt(data.impressions || 0),
//     reach: parseInt(data.reach || 0),
//     clicks,
//     ctr: parseFloat(data.ctr || 0),
//     cpm: parseFloat(data.cpm || 0),
//     frequency: parseFloat(data.frequency || 0),
//     cpc: clicks > 0 ? spend / clicks : 0,
//   };
// };

// export const useMetaData = (
//   userId: string | null,
//   adAccountId: string | null | undefined,
//   isConnected: boolean,
//   platformsLoaded: boolean,
//   dateRange: string
// ) => {
//   const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
//   const [adSets, setAdSets] = useState<MetaAdSet[]>([]);
//   const [ads, setAds] = useState<MetaAd[]>([]);

//   const [campaignInsights, setCampaignInsights] = useState<AggregatedInsights>({});
//   const [adSetInsights, setAdSetInsights] = useState<AggregatedInsights>({});
//   const [adInsights, setAdInsights] = useState<AggregatedInsights>({});

//   const [loading, setLoading] = useState({
//     campaignsBasic: false,
//     adSetsBasic: false,
//     adsBasic: false,
//     // Add loading states for insights
//     campaignsInsights: false,
//     adSetsInsights: false,
//     adsInsights: false,
//   });

//   const [error, setError] = useState({
//     campaignsBasic: null as string | null,
//     adSetsBasic: null as string | null,
//     adsBasic: null as string | null,
//     // Add error states for insights
//     campaignsInsights: null as string | null,
//     adSetsInsights: null as string | null,
//     adsInsights: null as string | null,
//   });

//   const backendUrl = import.meta.env.VITE_BACKEND_URL;

//   // Fetch campaigns
//   useEffect(() => {
//     // Basic data fetching remains largely the same, just adjust loading/error states
//     if (!platformsLoaded || !isConnected || !adAccountId || !userId) return;

//     const fetchBasicData = async (level: 'campaigns' | 'adsets' | 'ads') => {
//       const basicLoadingKey = `${level}Basic` as keyof typeof loading;
//       const basicErrorKey = `${level}Basic` as keyof typeof error;
//       setLoading((prev) => ({ ...prev, [basicLoadingKey]: true }));
//       setError((prev) => ({ ...prev, [basicErrorKey]: null }));

//       try {
//         const endpoint = `/meta/${level}/${userId}/${adAccountId}`;
//         const res = await apiClient.get(endpoint); // Use apiClient

//         // Set basic data based on level
//         if (level === 'campaigns') {
//           setCampaigns(res.data.data?.map((c: any) => ({
//             id: c.id, name: c.name, status: c.status, objective: c.objective, insights: null // Initialize insights as null
//           })) || []);
//         } else if (level === 'adsets') {
//           setAdSets(res.data.data?.map((a: any) => ({
//             id: a.id, name: a.name, status: a.status, daily_budget: a.daily_budget, campaign_id: a.campaign_id, insights: null
//           })) || []);
//         } else if (level === 'ads') {
//           setAds(res.data.data?.map((a: any) => ({
//             id: a.id, name: a.name, status: a.status, adset_id: a.adset_id, creative: a.creative, insights: null
//           })) || []);
//         }
//       } catch (e: any) {
//         console.error(`❌ Meta ${level} basic error:`, e);
//         setError((prev) => ({
//           ...prev,
//           [basicErrorKey]: e.response?.data?.detail || `Failed to fetch ${level}`,
//         }));
//       } finally {
//         setLoading((prev) => ({ ...prev, [basicLoadingKey]: false }));
//       }
//     };

//     fetchBasicData('campaigns');
//     fetchBasicData('adsets');
//     fetchBasicData('ads');

//   }, [userId, adAccountId, isConnected, platformsLoaded]);

//   const refreshAll = async () => {
//     if (!userId || !adAccountId) return;

//     try {
//       setLoading({ campaigns: true, adSets: true, ads: true });

//       const token = localStorage.getItem("access_token");
//       const config = token
//         ? { headers: { Authorization: `Bearer ${token}` } }
//         : {};

//       const [campaignsRes, adsetsRes, adsRes] = await Promise.all([
//         axios.get(
//           `${backendUrl}/meta/campaigns/insights/${userId}/${adAccountId}`,
//           config
//         ),
//         axios.get(
//           `${backendUrl}/meta/adsets/insights/${userId}/${adAccountId}`,
//           config
//         ),
//         axios.get(
//           `${backendUrl}/meta/ads/insights/${userId}/${adAccountId}`,
//           config
//         ),
//       ]);

//       setCampaigns(
//         campaignsRes.data.data?.map((c: any) => ({
//           id: c.id,
//           name: c.name,
//           status: c.status,
//           objective: c.objective,
//           insights: processInsights(c.insights),
//         })) || []
//       );

//       setAdSets(
//         adsetsRes.data.data?.map((a: any) => ({
//           id: a.id,
//           name: a.name,
//           status: a.status,
//           daily_budget: a.daily_budget,
//           campaign_id: a.campaign_id,
//           insights: processInsights(a.insights),
//         })) || []
//       );

//       setAds(
//         adsRes.data.data?.map((a: any) => ({
//           id: a.id,
//           name: a.name,
//           status: a.status,
//           adset_id: a.adset_id,
//           creative: a.creative,
//           insights: processInsights(a.insights),
//         })) || []
//       );

//       setError({ campaigns: null, adSets: null, ads: null });
//     } catch (e: any) {
//       console.error("❌ Refresh failed:", e);
//       setError((prev) => ({
//         ...prev,
//         campaigns: e.response?.data?.detail || "Failed to refresh",
//       }));
//     } finally {
//       setLoading({ campaigns: false, adSets: false, ads: false });
//     }
//   };

//   return { campaigns, adSets, ads, loading, error, refreshAll };
// };


// Frontend/src/hooks/useMetaData.ts
import { useState, useEffect, useCallback,useMemo } from "react"; // Added useCallback
import apiClient from "@/lib/api"; // Use the configured apiClient

// --- Interfaces ---
interface MetaInsights {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpm: number;
  // frequency?: number; // Frequency is hard to aggregate correctly, making it optional
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
  daily_budget: string; // Keep as string as received from basic fetch
  campaign_id: string;
  insights: MetaInsights | null;
}

export interface MetaAdCreative { // Define Creative type
    image_url?: string;
    body?: string;
    id?: string; // Creative might have its own ID
}

export interface MetaAd {
  id: string;
  name: string;
  status: string;
  adset_id: string;
  creative: MetaAdCreative | null; // Use the defined type
  insights: MetaInsights | null;
}

// Interface for the aggregated insights dictionary received from backend
interface AggregatedInsights {
  // Use string index signature since IDs are strings
  [id: string]: Omit<MetaInsights, 'frequency'>; // Omit frequency if not reliably calculated
}

export const useMetaData = (
  userId: string | null,
  adAccountId: string | null | undefined,
  isConnected: boolean,
  platformsLoaded: boolean,
  dateRange: string // Use this to fetch insights
) => {
  // State for basic data
  const [campaignsBasic, setCampaignsBasic] = useState<Omit<MetaCampaign, 'insights'>[]>([]);
  const [adSetsBasic, setAdSetsBasic] = useState<Omit<MetaAdSet, 'insights'>[]>([]);
  const [adsBasic, setAdsBasic] = useState<Omit<MetaAd, 'insights'>[]>([]);

  // State for aggregated insights (dictionary format)
  const [campaignInsights, setCampaignInsights] = useState<AggregatedInsights>({});
  const [adSetInsights, setAdSetInsights] = useState<AggregatedInsights>({});
  const [adInsights, setAdInsights] = useState<AggregatedInsights>({});

  // Combined loading and error states
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

    const levels: ('campaigns' | 'adsets' | 'ads')[] = ['campaigns', 'adsets', 'ads'];
    levels.forEach(level => {
        const basicLoadingKey = `${level}Basic` as keyof typeof loading;
        const basicErrorKey = `${level}Basic` as keyof typeof error;
        setLoading((prev) => ({ ...prev, [basicLoadingKey]: true }));
        setError((prev) => ({ ...prev, [basicErrorKey]: null }));
    });

    try {
        const [campaignsRes, adsetsRes, adsRes] = await Promise.all([
             apiClient.get(`/meta/campaigns/${userId}/${adAccountId}`),
             apiClient.get(`/meta/adsets/${userId}/${adAccountId}`),
             apiClient.get(`/meta/ads/${userId}/${adAccountId}`)
        ]);

        setCampaignsBasic(campaignsRes.data.data?.map((c: any) => ({
            id: c.id, name: c.name, status: c.status, objective: c.objective
        })) || []);
         setError((prev) => ({ ...prev, campaignsBasic: null }));

        setAdSetsBasic(adsetsRes.data.data?.map((a: any) => ({
            id: a.id, name: a.name, status: a.status, daily_budget: a.daily_budget, campaign_id: a.campaign_id
        })) || []);
        setError((prev) => ({ ...prev, adSetsBasic: null }));

        setAdsBasic(adsRes.data.data?.map((a: any) => ({
            id: a.id, name: a.name, status: a.status, adset_id: a.adset_id, creative: a.creative // Ensure creative exists
        })) || []);
         setError((prev) => ({ ...prev, adsBasic: null }));

    } catch (e: any) {
        console.error(`❌ Meta basic data error:`, e);
        // Set a general error or specific ones if possible to determine which failed
        const errorMsg = e.response?.data?.detail || "Failed to fetch basic Meta data";
        setError((prev) => ({
            ...prev,
            campaignsBasic: errorMsg, // Example: Show error on all if one fails
            adSetsBasic: errorMsg,
            adsBasic: errorMsg,
        }));
    } finally {
         levels.forEach(level => {
            const basicLoadingKey = `${level}Basic` as keyof typeof loading;
            setLoading((prev) => ({ ...prev, [basicLoadingKey]: false }));
        });
    }
  }, [userId, adAccountId, isConnected, platformsLoaded]);


  // --- Fetch Aggregated Insights Logic ---
   const fetchAggregatedInsights = useCallback(async () => {
    if (!platformsLoaded || !isConnected || !adAccountId || !userId || !dateRange) return;

    const levels: ('campaign' | 'adset' | 'ad')[] = ['campaign', 'adset', 'ad'];
     levels.forEach(level => {
        const insightsLoadingKey = `${level}sInsights` as keyof typeof loading;
        const insightsErrorKey = `${level}sInsights` as keyof typeof error;
        setLoading((prev) => ({ ...prev, [insightsLoadingKey]: true }));
        setError((prev) => ({ ...prev, [insightsErrorKey]: null }));
    });

    try {
        const [campaignsInsRes, adsetsInsRes, adsInsRes] = await Promise.all([
             apiClient.get(`/aggregate/meta/insights/campaign`, { // Use new endpoint
                params: { ad_account_id: adAccountId, date_preset: dateRange }
             }),
             apiClient.get(`/aggregate/meta/insights/adset`, { // Use new endpoint
                params: { ad_account_id: adAccountId, date_preset: dateRange }
             }),
             apiClient.get(`/aggregate/meta/insights/ad`, { // Use new endpoint
                params: { ad_account_id: adAccountId, date_preset: dateRange }
             })
        ]);

        setCampaignInsights(campaignsInsRes.data || {});
        setError((prev) => ({ ...prev, campaignsInsights: null }));

        setAdSetInsights(adsetsInsRes.data || {});
         setError((prev) => ({ ...prev, adSetsInsights: null }));

        setAdInsights(adsInsRes.data || {});
         setError((prev) => ({ ...prev, adsInsights: null }));

    } catch (e: any) {
        console.error(`❌ Meta insights error:`, e);
        const errorMsg = e.response?.data?.detail || "Failed to fetch Meta insights";
         setError((prev) => ({
            ...prev,
            campaignsInsights: errorMsg, // Example: Show error on all if one fails
            adSetsInsights: errorMsg,
            adsInsights: errorMsg,
        }));
    } finally {
        levels.forEach(level => {
            const insightsLoadingKey = `${level}sInsights` as keyof typeof loading;
            setLoading((prev) => ({ ...prev, [insightsLoadingKey]: false }));
        });
    }
  }, [userId, adAccountId, isConnected, platformsLoaded, dateRange]);


  // --- Trigger Fetches on Dependency Change ---
  useEffect(() => {
    fetchBasicData();
  }, [fetchBasicData]); // Depends on userId, adAccountId, isConnected, platformsLoaded

  useEffect(() => {
    fetchAggregatedInsights();
  }, [fetchAggregatedInsights]); // Depends on userId, adAccountId, isConnected, platformsLoaded, dateRange


  // --- Combine Basic Data with Insights ---
  // Use useMemo for performance, re-calculates only when inputs change
  const combinedCampaigns = useMemo(() => campaignsBasic.map(c => ({
      ...c,
      insights: campaignInsights[c.id] || null
  })), [campaignsBasic, campaignInsights]);

  const combinedAdSets = useMemo(() => adSetsBasic.map(a => ({
      ...a,
      insights: adSetInsights[a.id] || null
  })), [adSetsBasic, adSetInsights]);

  const combinedAds = useMemo(() => adsBasic.map(a => ({
      ...a,
      insights: adInsights[a.id] || null
  })), [adsBasic, adInsights]);


  // --- Refresh Function ---
  const refreshAll = useCallback(async () => {
    console.log("🔄 Refreshing all Meta data...");
    // Simply re-trigger the data fetching functions
    await fetchBasicData();
    await fetchAggregatedInsights();
    console.log("✅ Meta data refresh triggered.");
  }, [fetchBasicData, fetchAggregatedInsights]); // Dependencies are the fetch functions themselves

  // --- Return Combined Data and States ---
  return {
    campaigns: combinedCampaigns,
    adSets: combinedAdSets,
    ads: combinedAds,
    // Provide composite loading/error states for easier UI handling
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
    refreshAll
  };
};