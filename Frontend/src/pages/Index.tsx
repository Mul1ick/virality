import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KPICard } from "@/components/dashboard/KPICard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { MetaCampaignsTable } from "@/components/dashboard/MetaCampaignsTable";
import { CreativeGallery } from "@/components/dashboard/CreativeGallery";
import { DateRangeSelector } from "@/components/dashboard/DateRangeSelector";
import {
  BarChart3,
  TrendingUp,
  Facebook,
  Search,
  ShoppingCart,
} from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";

const Index = () => {
  const [dateRange, setDateRange] = useState("30days");
  const [metaCampaigns, setMetaCampaigns] = useState([]);
  const [googleCampaigns, setGoogleCampaigns] = useState([]);
  const [shopifyData, setShopifyData] = useState([]);
  const [loading, setLoading] = useState({
    meta: false,
    google: false,
    shopify: false,
  });
  const [success, setSuccess] = useState({
    meta: false,
    google: false,
    shopify: false,
  });
  const [error, setError] = useState({
    meta: null,
    google: null,
    shopify: null,
  });
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  // Fetch Meta campaigns WITH INSIGHTS
  useEffect(() => {
    const fetchMetaCampaigns = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const userId = urlParams.get("user_id");

      if (!userId) {
        console.log("No user_id found - user hasn't connected Meta");
        return;
      }

      try {
        setLoading((prev) => ({ ...prev, meta: true }));
        console.log(
          `Fetching Meta campaigns with insights for user: ${userId}`
        );

        // ✅ Call insights endpoint instead of basic campaigns
        const response = await axios.get(
          `${backendUrl}/meta/campaigns/insights/${userId}`
        );

        console.log("Meta campaigns with insights fetched:", response.data);

        // ✅ Process the nested insights data structure
        const processedCampaigns =
          response.data.data?.map((campaign) => {
            return {
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
                    cpc:
                      campaign.insights.data[0].inline_link_clicks > 0
                        ? parseFloat(campaign.insights.data[0].spend || 0) /
                          parseInt(
                            campaign.insights.data[0].inline_link_clicks || 1
                          )
                        : 0,
                  }
                : null,
            };
          }) || [];

        setMetaCampaigns(processedCampaigns);
        setError((prev) => ({ ...prev, meta: null }));
        setSuccess((prev) => ({ ...prev, meta: true }));
      } catch (e) {
        console.log(e);
        setError((prev) => ({
          ...prev,
          meta: e.response?.data?.detail || "Failed to fetch Meta campaigns",
        }));
      } finally {
        setLoading((prev) => ({ ...prev, meta: false }));
      }
    };

    fetchMetaCampaigns();
  }, [dateRange]);

  // Fetch Google campaigns
  useEffect(() => {
    const fetchGoogleCampaigns = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const userId = urlParams.get("user_id");

      if (!userId) {
        console.log("No user_id found - user hasn't connected Google");
        return;
      }
      try {
        setLoading((prev) => ({ ...prev, google: true }));
        console.log(`Fetching Google campaigns for user: ${userId}`);

        const response = await axios.get(
          `${backendUrl}/google/campaigns/${userId}`
        );

        setGoogleCampaigns(response.data.data || []);
        setError((prev) => ({ ...prev, google: null }));
        setSuccess((prev) => ({ ...prev, google: true }));
      } catch (e) {
        console.log(e);
        setError((prev) => ({
          ...prev,
          google:
            e.response?.data?.detail || "Failed to fetch Google campaigns",
        }));
      } finally {
        setLoading((prev) => ({ ...prev, google: false }));
      }
    };

    fetchGoogleCampaigns();
  }, []);

  // Fetch Shopify data
  useEffect(() => {
    const fetchShopifyData = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const userId = urlParams.get("user_id");

      if (!userId) {
        console.log("No user_id found - user hasn't connected Shopify");
        return;
      }
      try {
        setLoading((prev) => ({ ...prev, shopify: true }));
        console.log(`Fetching Shopify data for user: ${userId}`);

        const response = await axios.get(
          `${backendUrl}/shopify/orders/${userId}`
        );

        setShopifyData(response.data.data || []);
        setError((prev) => ({ ...prev, shopify: null }));
        setSuccess((prev) => ({ ...prev, shopify: true }));
      } catch (e) {
        console.log(e);
        setError((prev) => ({
          ...prev,
          shopify: e.response?.data?.detail || "Failed to fetch Shopify data",
        }));
      } finally {
        setLoading((prev) => ({ ...prev, shopify: false }));
      }
    };

    fetchShopifyData();
  }, []);

  // Auto-hide notifications after 2 seconds
  useEffect(() => {
    const hasAnyNotification =
      Object.values(loading).some((v) => v) ||
      Object.values(error).some((v) => v) ||
      Object.values(success).some((v) => v);

    if (hasAnyNotification) {
      const timer = setTimeout(() => {
        setLoading({ meta: false, google: false, shopify: false });
        setError({ meta: null, google: null, shopify: null });
        setSuccess({ meta: false, google: false, shopify: false });
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [loading, error, success]);

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
            <DateRangeSelector date={dateRange} onChange={setDateRange} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-4">
        {/* Notifications */}
        <div className="space-y-3 mb-6">
          {/* Loading States */}
          {loading.meta && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Facebook className="h-4 w-4 text-blue-600" />
                <p className="text-blue-700">Loading Meta campaigns...</p>
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

          {/* Error States */}
          {error.meta && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Facebook className="h-4 w-4 text-red-600" />
                <p className="text-red-700">Meta: {error.meta}</p>
              </div>
            </div>
          )}
          {error.google && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-red-600" />
                <p className="text-red-700">Google: {error.google}</p>
              </div>
            </div>
          )}
          {error.shopify && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-red-600" />
                <p className="text-red-700">Shopify: {error.shopify}</p>
              </div>
            </div>
          )}

          {/* Success States */}
          {success.meta && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Facebook className="h-4 w-4 text-green-600" />
                <p className="text-green-700">
                  ✅ {metaCampaigns.length} Meta campaigns loaded!
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

          {/* ✅ META TAB - NOW WITH TABLE */}
          <TabsContent value="meta" className="space-y-6">
            <MetaCampaignsTable
              campaigns={metaCampaigns}
              isLoading={loading.meta}
            />
          </TabsContent>

          {/* GOOGLE TAB - Keep existing */}
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
                  No Google campaigns loaded. Connect your Google Ads account in
                  the Profile page.
                </p>
              )}
            </div>
          </TabsContent>

          {/* SHOPIFY TAB - Keep existing */}
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
                  No Shopify orders loaded. Connect your Shopify store in the
                  Profile page.
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
