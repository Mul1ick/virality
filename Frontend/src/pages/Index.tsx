import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KPICard } from "@/components/dashboard/KPICard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { MetaCampaignsTable } from "@/components/dashboard/MetaCampaignsTable";
import { MetaAdSetsTable } from "@/components/dashboard/MetaAdSetsTable";
import { MetaAdsTable } from "@/components/dashboard/MetaAdsTable";
import { CreativeGallery } from "@/components/dashboard/CreativeGallery";
import { DateRangeSelector } from "@/components/dashboard/DateRangeSelector";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart3,
  TrendingUp,
  Facebook,
  Search,
  ShoppingCart,
  User,
  Settings,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Index = () => {
  const [dateRange, setDateRange] = useState("30days");
  const [metaCampaigns, setMetaCampaigns] = useState([]);
  const [metaAdSets, setMetaAdSets] = useState([]);
  const [metaAds, setMetaAds] = useState([]);
  const [googleCampaigns, setGoogleCampaigns] = useState([]);
  const [shopifyData, setShopifyData] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Platform connection state
  const [platformStatus, setPlatformStatus] = useState({
    meta: { connected: false, ad_account_id: null },
    google: {
      connected: false,
      customer_ids: [],
      manager_id: null,
      client_customer_id: null,
    },
    shopify: { connected: false, shop_url: null },
  });

  // User data
  const [user, setUser] = useState({
    name: "Loading...",
    email: "Loading...",
    avatarUrl: null,
  });

  const [loading, setLoading] = useState({
    platforms: true, // Loading platform status
    meta: false,
    metaAdSets: false,
    metaAds: false,
    google: false,
    shopify: false,
  });
  const [success, setSuccess] = useState({
    meta: false,
    metaAdSets: false,
    metaAds: false,
    google: false,
    shopify: false,
  });
  const [error, setError] = useState({
    platforms: null,
    meta: null,
    metaAdSets: null,
    metaAds: null,
    google: null,
    shopify: null,
  });
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();

  // STEP 1: Fetch user platforms and basic info on mount
  useEffect(() => {
    const fetchUserPlatforms = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const userId = urlParams.get("user_id");

      if (!userId) {
        console.log("No user_id in URL");
        setLoading((prev) => ({ ...prev, platforms: false }));
        return;
      }

      try {
        console.log("🔍 Fetching platform status for user:", userId);

        // Fetch platform connections
        const platformRes = await axios.get(
          `${backendUrl}/user/${userId}/platforms`
        );

        console.log("✅ Platform status:", platformRes.data);
        setPlatformStatus(platformRes.data);

        // TODO: Fetch user info (name, email) from a /user/{user_id} endpoint
        // For now, using placeholder
        setUser({
          name: "User",
          email: userId,
          avatarUrl: null,
        });
      } catch (e) {
        console.error("❌ Failed to fetch platform status:", e);
        setError((prev) => ({
          ...prev,
          platforms: "Failed to load platform connections",
        }));
      } finally {
        setLoading((prev) => ({ ...prev, platforms: false }));
      }
    };

    fetchUserPlatforms();
  }, []);

  // STEP 2: Fetch Meta campaigns when platform status is loaded
  useEffect(() => {
    const fetchMetaCampaigns = async () => {
      if (loading.platforms) return; // Wait for platform status
      if (!platformStatus.meta?.connected) {
        console.log("⏭️ Meta not connected, skipping campaigns fetch");
        return;
      }
      if (!platformStatus.meta?.ad_account_id) {
        console.log("⚠️ Meta connected but no ad_account_id");
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const userId = urlParams.get("user_id");

      try {
        setLoading((prev) => ({ ...prev, meta: true }));
        console.log(
          `📊 Fetching Meta campaigns for user: ${userId}, account: ${platformStatus.meta.ad_account_id}`
        );

        const response = await axios.get(
          `${backendUrl}/meta/campaigns/insights/${userId}/${platformStatus.meta.ad_account_id}`
        );

        const processedCampaigns =
          response.data.data?.map((campaign) => ({
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            objective: campaign.objective,
            insights: campaign.insights?.data?.[0]
              ? {
                  spend: parseFloat(campaign.insights.data[0].spend || 0),
                  impressions: parseInt(
                    campaign.insights.data[0].impressions || 0
                  ),
                  reach: parseInt(campaign.insights.data[0].reach || 0),
                  clicks: parseInt(
                    campaign.insights.data[0].inline_link_clicks || 0
                  ),
                  ctr: parseFloat(campaign.insights.data[0].ctr || 0),
                  cpm: parseFloat(campaign.insights.data[0].cpm || 0),
                  frequency: parseFloat(
                    campaign.insights.data[0].frequency || 0
                  ),
                  cpc:
                    campaign.insights.data[0].inline_link_clicks > 0
                      ? parseFloat(campaign.insights.data[0].spend || 0) /
                        parseInt(
                          campaign.insights.data[0].inline_link_clicks || 1
                        )
                      : 0,
                }
              : null,
          })) || [];

        setMetaCampaigns(processedCampaigns);
        setError((prev) => ({ ...prev, meta: null }));
        setSuccess((prev) => ({ ...prev, meta: true }));
      } catch (e) {
        console.error("❌ Meta campaigns error:", e);
        setError((prev) => ({
          ...prev,
          meta: e.response?.data?.detail || "Failed to fetch Meta campaigns",
        }));
      } finally {
        setLoading((prev) => ({ ...prev, meta: false }));
      }
    };

    fetchMetaCampaigns();
  }, [platformStatus, dateRange, loading.platforms]);

  // STEP 3: Fetch Meta Ad Sets
  useEffect(() => {
    const fetchMetaAdSets = async () => {
      if (loading.platforms) return;
      if (
        !platformStatus.meta?.connected ||
        !platformStatus.meta?.ad_account_id
      ) {
        console.log("⏭️ Skipping Meta ad sets fetch");
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const userId = urlParams.get("user_id");

      try {
        setLoading((prev) => ({ ...prev, metaAdSets: true }));

        const response = await axios.get(
          `${backendUrl}/meta/adsets/insights/${userId}/${platformStatus.meta.ad_account_id}`
        );

        const processedAdSets =
          response.data.data?.map((adset) => ({
            id: adset.id,
            name: adset.name,
            status: adset.status,
            daily_budget: adset.daily_budget,
            campaign_id: adset.campaign_id,
            insights: adset.insights?.data?.[0]
              ? {
                  spend: parseFloat(adset.insights.data[0].spend || 0),
                  impressions: parseInt(
                    adset.insights.data[0].impressions || 0
                  ),
                  reach: parseInt(adset.insights.data[0].reach || 0),
                  clicks: parseInt(
                    adset.insights.data[0].inline_link_clicks || 0
                  ),
                  ctr: parseFloat(adset.insights.data[0].ctr || 0),
                  cpm: parseFloat(adset.insights.data[0].cpm || 0),
                  frequency: parseFloat(adset.insights.data[0].frequency || 0),
                  cpc:
                    adset.insights.data[0].inline_link_clicks > 0
                      ? parseFloat(adset.insights.data[0].spend || 0) /
                        parseInt(adset.insights.data[0].inline_link_clicks || 1)
                      : 0,
                }
              : null,
          })) || [];

        setMetaAdSets(processedAdSets);
        setError((prev) => ({ ...prev, metaAdSets: null }));
        setSuccess((prev) => ({ ...prev, metaAdSets: true }));
      } catch (e) {
        console.error("❌ Meta ad sets error:", e);
        setError((prev) => ({
          ...prev,
          metaAdSets:
            e.response?.data?.detail || "Failed to fetch Meta ad sets",
        }));
      } finally {
        setLoading((prev) => ({ ...prev, metaAdSets: false }));
      }
    };

    fetchMetaAdSets();
  }, [platformStatus, dateRange, loading.platforms]);

  // STEP 4: Fetch Meta Ads
  useEffect(() => {
    const fetchMetaAds = async () => {
      if (loading.platforms) return;
      if (
        !platformStatus.meta?.connected ||
        !platformStatus.meta?.ad_account_id
      ) {
        console.log("⏭️ Skipping Meta ads fetch");
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const userId = urlParams.get("user_id");

      try {
        setLoading((prev) => ({ ...prev, metaAds: true }));

        const response = await axios.get(
          `${backendUrl}/meta/ads/insights/${userId}/${platformStatus.meta.ad_account_id}`
        );

        const processedAds =
          response.data.data?.map((ad) => ({
            id: ad.id,
            name: ad.name,
            status: ad.status,
            adset_id: ad.adset_id,
            creative: ad.creative,
            insights: ad.insights?.data?.[0]
              ? {
                  spend: parseFloat(ad.insights.data[0].spend || 0),
                  impressions: parseInt(ad.insights.data[0].impressions || 0),
                  reach: parseInt(ad.insights.data[0].reach || 0),
                  clicks: parseInt(ad.insights.data[0].inline_link_clicks || 0),
                  ctr: parseFloat(ad.insights.data[0].ctr || 0),
                  cpm: parseFloat(ad.insights.data[0].cpm || 0),
                  frequency: parseFloat(ad.insights.data[0].frequency || 0),
                  cpc:
                    ad.insights.data[0].inline_link_clicks > 0
                      ? parseFloat(ad.insights.data[0].spend || 0) /
                        parseInt(ad.insights.data[0].inline_link_clicks || 1)
                      : 0,
                }
              : null,
          })) || [];

        setMetaAds(processedAds);
        setError((prev) => ({ ...prev, metaAds: null }));
        setSuccess((prev) => ({ ...prev, metaAds: true }));
      } catch (e) {
        console.error("❌ Meta ads error:", e);
        setError((prev) => ({
          ...prev,
          metaAds: e.response?.data?.detail || "Failed to fetch Meta ads",
        }));
      } finally {
        setLoading((prev) => ({ ...prev, metaAds: false }));
      }
    };

    fetchMetaAds();
  }, [platformStatus, dateRange, loading.platforms]);

  // STEP 5: Fetch Google campaigns
  useEffect(() => {
    const fetchGoogleCampaigns = async () => {
      if (loading.platforms) return;
      if (!platformStatus.google?.connected) {
        console.log("⏭️ Google not connected, skipping campaigns fetch");
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const userId = urlParams.get("user_id");

      try {
        setLoading((prev) => ({ ...prev, google: true }));
        console.log("📊 Fetching Google campaigns...");

        const managerId = platformStatus.google.manager_id;
        const customerId =
          platformStatus.google.client_customer_id ||
          platformStatus.google.customer_ids?.[0];

        if (!managerId || !customerId) {
          throw new Error("Missing Google account IDs");
        }

        console.log(`Using Manager: ${managerId}, Client: ${customerId}`);

        const campaignsResponse = await axios.get(
          `${backendUrl}/google/campaigns/${userId}`,
          {
            params: {
              customer_id: customerId,
              manager_id: managerId,
            },
          }
        );

        setGoogleCampaigns(campaignsResponse.data.campaigns || []);
        setSuccess((prev) => ({ ...prev, google: true }));
      } catch (e) {
        console.error("❌ Google campaigns error:", e);
        setError((prev) => ({
          ...prev,
          google: e.message || "Failed to fetch Google campaigns",
        }));
      } finally {
        setLoading((prev) => ({ ...prev, google: false }));
      }
    };

    fetchGoogleCampaigns();
  }, [platformStatus, loading.platforms]);

  // STEP 6: Fetch Shopify data
  useEffect(() => {
    const fetchShopifyData = async () => {
      if (loading.platforms) return;
      if (!platformStatus.shopify?.connected) {
        console.log("⏭️ Shopify not connected, skipping fetch");
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const userId = urlParams.get("user_id");

      try {
        setLoading((prev) => ({ ...prev, shopify: true }));
        console.log("📊 Fetching Shopify data...");

        const response = await axios.get(
          `${backendUrl}/shopify/orders/${userId}`
        );

        setShopifyData(response.data.data || []);
        setError((prev) => ({ ...prev, shopify: null }));
        setSuccess((prev) => ({ ...prev, shopify: true }));
      } catch (e) {
        console.error("❌ Shopify error:", e);
        setError((prev) => ({
          ...prev,
          shopify: e.response?.data?.detail || "Failed to fetch Shopify data",
        }));
      } finally {
        setLoading((prev) => ({ ...prev, shopify: false }));
      }
    };

    fetchShopifyData();
  }, [platformStatus, loading.platforms]);

  // Auto-hide notifications after 3 seconds
  useEffect(() => {
    const hasAnyNotification =
      Object.values(loading).some((v) => v) ||
      Object.values(error).some((v) => v) ||
      Object.values(success).some((v) => v);

    if (hasAnyNotification) {
      const timer = setTimeout(() => {
        setLoading({
          platforms: false,
          meta: false,
          metaAdSets: false,
          metaAds: false,
          google: false,
          shopify: false,
        });
        setError({
          platforms: null,
          meta: null,
          metaAdSets: null,
          metaAds: null,
          google: null,
          shopify: null,
        });
        setSuccess({
          meta: false,
          metaAdSets: false,
          metaAds: false,
          google: false,
          shopify: false,
        });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [loading, error, success]);

  const handleSignOut = () => {
    localStorage.clear();
    navigate("/signin");
  };

  const handleRefreshMeta = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get("user_id");
    const adAccountId = platformStatus.meta?.ad_account_id;

    if (!userId || !adAccountId) {
      console.log("Cannot refresh: Missing user_id or ad_account_id");
      return;
    }

    setIsRefreshing(true);

    try {
      console.log("🔄 Refreshing all Meta data...");

      const [campaignsRes, adsetsRes, adsRes] = await Promise.all([
        axios.get(
          `${backendUrl}/meta/campaigns/insights/${userId}/${adAccountId}`
        ),
        axios.get(
          `${backendUrl}/meta/adsets/insights/${userId}/${adAccountId}`
        ),
        axios.get(`${backendUrl}/meta/ads/insights/${userId}/${adAccountId}`),
      ]);

      // Process campaigns
      const processedCampaigns =
        campaignsRes.data.data?.map((campaign) => ({
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          objective: campaign.objective,
          insights: campaign.insights?.data?.[0]
            ? {
                spend: parseFloat(campaign.insights.data[0].spend || 0),
                impressions: parseInt(
                  campaign.insights.data[0].impressions || 0
                ),
                reach: parseInt(campaign.insights.data[0].reach || 0),
                clicks: parseInt(
                  campaign.insights.data[0].inline_link_clicks || 0
                ),
                ctr: parseFloat(campaign.insights.data[0].ctr || 0),
                cpm: parseFloat(campaign.insights.data[0].cpm || 0),
                frequency: parseFloat(campaign.insights.data[0].frequency || 0),
                cpc:
                  campaign.insights.data[0].inline_link_clicks > 0
                    ? parseFloat(campaign.insights.data[0].spend || 0) /
                      parseInt(
                        campaign.insights.data[0].inline_link_clicks || 1
                      )
                    : 0,
              }
            : null,
        })) || [];

      // Process adsets
      const processedAdSets =
        adsetsRes.data.data?.map((adset) => ({
          id: adset.id,
          name: adset.name,
          status: adset.status,
          daily_budget: adset.daily_budget,
          campaign_id: adset.campaign_id,
          insights: adset.insights?.data?.[0]
            ? {
                spend: parseFloat(adset.insights.data[0].spend || 0),
                impressions: parseInt(adset.insights.data[0].impressions || 0),
                reach: parseInt(adset.insights.data[0].reach || 0),
                clicks: parseInt(
                  adset.insights.data[0].inline_link_clicks || 0
                ),
                ctr: parseFloat(adset.insights.data[0].ctr || 0),
                cpm: parseFloat(adset.insights.data[0].cpm || 0),
                frequency: parseFloat(adset.insights.data[0].frequency || 0),
                cpc:
                  adset.insights.data[0].inline_link_clicks > 0
                    ? parseFloat(adset.insights.data[0].spend || 0) /
                      parseInt(adset.insights.data[0].inline_link_clicks || 1)
                    : 0,
              }
            : null,
        })) || [];

      // Process ads
      const processedAds =
        adsRes.data.data?.map((ad) => ({
          id: ad.id,
          name: ad.name,
          status: ad.status,
          adset_id: ad.adset_id,
          creative: ad.creative,
          insights: ad.insights?.data?.[0]
            ? {
                spend: parseFloat(ad.insights.data[0].spend || 0),
                impressions: parseInt(ad.insights.data[0].impressions || 0),
                reach: parseInt(ad.insights.data[0].reach || 0),
                clicks: parseInt(ad.insights.data[0].inline_link_clicks || 0),
                ctr: parseFloat(ad.insights.data[0].ctr || 0),
                cpm: parseFloat(ad.insights.data[0].cpm || 0),
                frequency: parseFloat(ad.insights.data[0].frequency || 0),
                cpc:
                  ad.insights.data[0].inline_link_clicks > 0
                    ? parseFloat(ad.insights.data[0].spend || 0) /
                      parseInt(ad.insights.data[0].inline_link_clicks || 1)
                    : 0,
              }
            : null,
        })) || [];

      setMetaCampaigns(processedCampaigns);
      setMetaAdSets(processedAdSets);
      setMetaAds(processedAds);

      setSuccess((prev) => ({
        ...prev,
        meta: true,
        metaAdSets: true,
        metaAds: true,
      }));

      console.log("✅ Meta data refreshed successfully");
    } catch (e) {
      console.error("❌ Refresh failed:", e);
      setError((prev) => ({
        ...prev,
        meta: e.response?.data?.detail || "Failed to refresh Meta data",
      }));
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Unified metrics across Meta, Google & Shopify
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <DateRangeSelector date={dateRange} onChange={setDateRange} />

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full"
                  >
                    <Avatar className="h-10 w-10 border-2 border-primary/20">
                      <AvatarImage src={user.avatarUrl} alt={user.name} />
                      <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                        {user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.name}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile & Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Connect Platforms</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-4">
        {/* Notifications */}
        <div className="space-y-3 mb-6">
          {/* Platform Loading */}
          {loading.platforms && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-600 animate-spin" />
                <p className="text-blue-700">Loading platform connections...</p>
              </div>
            </div>
          )}

          {/* Platform Error */}
          {error.platforms && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-red-600" />
                <p className="text-red-700">{String(error.platforms)}</p>
              </div>
            </div>
          )}

          {/* Meta Loading - Consolidated */}
          {(loading.meta || loading.metaAdSets || loading.metaAds) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Facebook className="h-4 w-4 text-blue-600" />
                <p className="text-blue-700">Loading Meta data...</p>
              </div>
            </div>
          )}

          {loading.google && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-red-600" />
                <p className="text-red-700">Loading Google campaigns...</p>
              </div>
            </div>
          )}

          {loading.shopify && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-green-600" />
                <p className="text-green-700">Loading Shopify data...</p>
              </div>
            </div>
          )}

          {/* Error States - Consolidated */}
          {(error.meta || error.metaAdSets || error.metaAds) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Facebook className="h-4 w-4 text-red-600" />
                <p className="text-red-700">
                  Meta:{" "}
                  {String(error.meta || error.metaAdSets || error.metaAds)}
                </p>
              </div>
            </div>
          )}

          {error.google && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-red-600" />
                <p className="text-red-700">Google: {String(error.google)}</p>
              </div>
            </div>
          )}

          {error.shopify && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-red-600" />
                <p className="text-red-700">Shopify: {String(error.shopify)}</p>
              </div>
            </div>
          )}

          {/* Success States - Consolidated */}
          {(success.meta || success.metaAdSets || success.metaAds) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Facebook className="h-4 w-4 text-green-600" />
                <p className="text-green-700">
                  ✅ Meta data loaded! {metaCampaigns.length} campaigns,{" "}
                  {metaAdSets.length} ad sets, {metaAds.length} ads
                </p>
              </div>
            </div>
          )}

          {success.google && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-green-600" />
                <p className="text-green-700">
                  ✅ {googleCampaigns.length} Google campaigns loaded!
                </p>
              </div>
            </div>
          )}

          {success.shopify && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-green-600" />
                <p className="text-green-700">
                  ✅ {shopifyData.length} Shopify orders loaded!
                </p>
              </div>
            </div>
          )}
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="meta" className="gap-2">
              <Facebook className="h-4 w-4" />
              Meta {metaCampaigns.length > 0 && `(${metaCampaigns.length})`}
            </TabsTrigger>
            <TabsTrigger value="google" className="gap-2">
              <Search className="h-4 w-4" />
              Google
            </TabsTrigger>
            <TabsTrigger value="shopify" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Shopify
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard
                title="Total Ad Spend"
                value="$18,450"
                change={12.5}
                changeLabel="vs. last period"
                format="currency"
              />
              <KPICard
                title="Total Revenue"
                value="$52,300"
                change={18.3}
                changeLabel="vs. last period"
                format="currency"
              />
              <KPICard
                title="Blended ROAS"
                value="2.84x"
                change={4.2}
                changeLabel="vs. last period"
                format="number"
              />
              <KPICard
                title="Blended CPA"
                value="$28.50"
                change={-8.1}
                changeLabel="vs. last period"
                format="currency"
              />
            </div>

            {/* Trend Chart */}
            <TrendChart dateRange={dateRange} />
          </TabsContent>

          {/* META TAB WITH NESTED TABS AND REFRESH BUTTON */}
          <TabsContent value="meta" className="space-y-6">
            <div className="bg-card rounded-lg border p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Facebook className="h-6 w-6 text-blue-600" />
                  <h2 className="text-2xl font-bold">Meta Campaigns & Ads</h2>
                </div>
                <Button
                  onClick={handleRefreshMeta}
                  disabled={isRefreshing || !platformStatus.meta?.ad_account_id}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${
                      isRefreshing ? "animate-spin" : ""
                    }`}
                  />
                  {isRefreshing ? "Refreshing..." : "Refresh Data"}
                </Button>
              </div>
              {metaCampaigns.length > 0 ||
              metaAdSets.length > 0 ||
              metaAds.length > 0 ? (
                <Tabs defaultValue="campaigns" className="w-full">
                  <TabsList className="mb-6">
                    <TabsTrigger value="campaigns">
                      Campaigns{" "}
                      {metaCampaigns.length > 0 && `(${metaCampaigns.length})`}
                    </TabsTrigger>
                    <TabsTrigger value="adsets">
                      Ad Sets{" "}
                      {metaAdSets.length > 0 && `(${metaAdSets.length})`}
                    </TabsTrigger>
                    <TabsTrigger value="ads">
                      Ads {metaAds.length > 0 && `(${metaAds.length})`}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="campaigns">
                    <MetaCampaignsTable
                      campaigns={metaCampaigns}
                      isLoading={loading.meta}
                    />
                  </TabsContent>

                  <TabsContent value="adsets">
                    <MetaAdSetsTable
                      adsets={metaAdSets}
                      isLoading={loading.metaAdSets}
                    />
                  </TabsContent>

                  <TabsContent value="ads">
                    <MetaAdsTable ads={metaAds} isLoading={loading.metaAds} />
                  </TabsContent>
                </Tabs>
              ) : (
                <p className="text-muted-foreground">
                  {platformStatus.meta?.connected
                    ? "No Meta data available. Try refreshing or check your ad account."
                    : "Meta not connected. Connect your Meta account in the Profile page."}
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="google" className="space-y-6">
            <div className="bg-card rounded-lg border p-6">
              <div className="flex items-center gap-3 mb-4">
                <Search className="h-6 w-6 text-red-600" />
                <h2 className="text-2xl font-bold">Google Campaigns</h2>
              </div>
              {googleCampaigns.length > 0 ? (
                <>
                  <p className="text-muted-foreground mb-4">
                    {googleCampaigns.length} campaigns found
                  </p>
                  <CreativeGallery campaigns={googleCampaigns} />
                </>
              ) : (
                <p className="text-muted-foreground">
                  {platformStatus.google?.connected
                    ? "No Google campaigns found. Check your Google Ads account."
                    : "Google not connected. Connect your Google Ads account in the Profile page."}
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="shopify" className="space-y-6">
            <div className="bg-card rounded-lg border p-6">
              <div className="flex items-center gap-3 mb-4">
                <ShoppingCart className="h-6 w-6 text-green-600" />
                <h2 className="text-2xl font-bold">Shopify Orders</h2>
              </div>
              {shopifyData.length > 0 ? (
                <>
                  <p className="text-muted-foreground mb-4">
                    {shopifyData.length} orders found
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-semibold">
                            Order ID
                          </th>
                          <th className="text-left p-3 font-semibold">Date</th>
                          <th className="text-left p-3 font-semibold">
                            Amount
                          </th>
                          <th className="text-left p-3 font-semibold">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {shopifyData.map((order, idx) => (
                          <tr key={idx} className="border-b hover:bg-muted/50">
                            <td className="p-3">{order.id || `#${idx + 1}`}</td>
                            <td className="p-3">{order.date || "N/A"}</td>
                            <td className="p-3">{order.amount || "N/A"}</td>
                            <td className="p-3">{order.status || "N/A"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">
                  {platformStatus.shopify?.connected
                    ? "No Shopify orders found."
                    : "Shopify not connected. Connect your Shopify store in the Profile page."}
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
