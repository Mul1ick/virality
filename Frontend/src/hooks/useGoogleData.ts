// hooks/useGoogleData.ts
import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const backendUrl = import.meta.env.VITE_BACKEND_URL; // 🔥 Outside hook

export interface GoogleCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
}

export interface GoogleAdGroup {
  id: string;
  name: string;
  status: string;
  campaign_id: string;
  campaign_name?: string;
}

export interface GoogleAd {
  id: string;
  name: string;
  status: string;
  ad_group_id: string;
  ad_group_name?: string;
  type?: string;
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

  // Fetch campaigns
  useEffect(() => {
    if (
      !platformsLoaded ||
      !isConnected ||
      !userId ||
      !managerId ||
      !customerId
    ) {
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
            params: { customer_id: customerId, manager_id: managerId },
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );

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
        setError((prev) => ({ ...prev, campaigns: null }));
      } catch (e: any) {
        console.error("❌ Google campaigns error:", e);
        setError((prev) => ({
          ...prev,
          campaigns:
            e.response?.data?.detail ||
            e.message ||
            "Failed to fetch campaigns",
        }));
      } finally {
        setLoading((prev) => ({ ...prev, campaigns: false }));
      }
    };

    fetchCampaigns();
  }, [userId, managerId, customerId, isConnected, platformsLoaded]);

  // Fetch ad groups for ALL campaigns
  useEffect(() => {
    if (
      !platformsLoaded ||
      !isConnected ||
      !userId ||
      !managerId ||
      !customerId ||
      campaigns.length === 0
    ) {
      return;
    }

    const fetchAdGroups = async () => {
      try {
        setLoading((prev) => ({ ...prev, adGroups: true }));
        console.log(
          `📊 Fetching Google ad groups for ${campaigns.length} campaigns...`
        );

        const token = localStorage.getItem("access_token");

        // Fetch ad groups for ALL campaigns in parallel
        const requests = campaigns.map((campaign) =>
          axios
            .get(`${backendUrl}/google/adgroups/${userId}`, {
              params: {
                customer_id: customerId,
                manager_id: managerId,
                campaign_id: campaign.id,
              },
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            })
            .catch((err) => {
              console.warn(
                `Failed to fetch ad groups for campaign ${campaign.id}:`,
                err
              );
              return { data: { adgroups: [] } }; // Return empty on error
            })
        );

        const results = await Promise.all(requests);

        // Flatten all ad groups and add campaign name
        const allAdGroups: GoogleAdGroup[] = [];
        results.forEach((res, idx) => {
          const campaignAdGroups =
            res.data.adgroups?.map((ag: any) => ({
              id: ag.id || ag.ad_group?.id || "",
              name: ag.name || ag.ad_group?.name || "Unnamed Ad Group",
              status: ag.status || ag.ad_group?.status || "",
              campaign_id: campaigns[idx].id,
              campaign_name: campaigns[idx].name,
            })) || [];
          allAdGroups.push(...campaignAdGroups);
        });

        setAdGroups(allAdGroups);
        setError((prev) => ({ ...prev, adGroups: null }));
        console.log(`✅ Fetched ${allAdGroups.length} total ad groups`);
      } catch (e: any) {
        console.error("❌ Google ad groups error:", e);
        setError((prev) => ({
          ...prev,
          adGroups: e.response?.data?.detail || "Failed to fetch ad groups",
        }));
      } finally {
        setLoading((prev) => ({ ...prev, adGroups: false }));
      }
    };

    fetchAdGroups();
  }, [campaigns, userId, managerId, customerId, isConnected, platformsLoaded]);

  // Fetch ads for ALL ad groups
  useEffect(() => {
    if (
      !platformsLoaded ||
      !isConnected ||
      !userId ||
      !managerId ||
      !customerId ||
      adGroups.length === 0
    ) {
      return;
    }

    const fetchAds = async () => {
      try {
        setLoading((prev) => ({ ...prev, ads: true }));
        console.log(
          `📊 Fetching Google ads for ${adGroups.length} ad groups...`
        );

        const token = localStorage.getItem("access_token");

        // Fetch ads for ALL ad groups in parallel
        const requests = adGroups.map((adGroup) =>
          axios
            .get(`${backendUrl}/google/ads/${userId}`, {
              params: {
                customer_id: customerId,
                manager_id: managerId,
                ad_group_id: adGroup.id,
              },
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            })
            .catch((err) => {
              console.warn(
                `Failed to fetch ads for ad group ${adGroup.id}:`,
                err
              );
              return { data: { ads: [] } }; // Return empty on error
            })
        );

        const results = await Promise.all(requests);

        // Flatten all ads and add ad group name
        const allAds: GoogleAd[] = [];
        results.forEach((res, idx) => {
          const adGroupAds =
            res.data.ads?.map((ad: any) => ({
              id: ad.id || ad.ad?.id || "",
              name: ad.name || ad.ad?.name || ad.headline || "Unnamed Ad",
              status: ad.status || ad.ad?.status || "",
              ad_group_id: adGroups[idx].id,
              ad_group_name: adGroups[idx].name,
              type: ad.type || ad.ad_type || "",
            })) || [];
          allAds.push(...adGroupAds);
        });

        setAds(allAds);
        setError((prev) => ({ ...prev, ads: null }));
        console.log(`✅ Fetched ${allAds.length} total ads`);
      } catch (e: any) {
        console.error("❌ Google ads error:", e);
        setError((prev) => ({
          ...prev,
          ads: e.response?.data?.detail || "Failed to fetch ads",
        }));
      } finally {
        setLoading((prev) => ({ ...prev, ads: false }));
      }
    };

    fetchAds();
  }, [adGroups, userId, managerId, customerId, isConnected, platformsLoaded]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    console.log("🔄 Refreshing all Google data...");

    // Re-fetch campaigns (which will trigger ad groups and ads cascade)
    if (!userId || !managerId || !customerId) return;

    try {
      setLoading({ campaigns: true, adGroups: true, ads: true });

      const token = localStorage.getItem("access_token");
      const res = await axios.get(`${backendUrl}/google/campaigns/${userId}`, {
        params: { customer_id: customerId, manager_id: managerId },
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
      setError({ campaigns: null, adGroups: null, ads: null });
    } catch (e: any) {
      console.error("❌ Refresh failed:", e);
      setError({
        campaigns: e.response?.data?.detail || "Failed to refresh",
        adGroups: null,
        ads: null,
      });
    }
  }, [userId, managerId, customerId]);

  return { campaigns, adGroups, ads, loading, error, refreshAll };
};
