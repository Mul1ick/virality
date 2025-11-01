import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  Facebook,
  Search,
  ShoppingCart,
  Loader2,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { NotificationBanner } from "@/components/dashboard/NotificationBanner";
import { OverviewTab } from "@/components/dashboard/tabs/OverviewTab";
import { MetaTab } from "@/components/dashboard/tabs/MetaTab";
import { GoogleTab } from "@/components/dashboard/tabs/GoogleTab";
import { ShopifyTab } from "@/components/dashboard/tabs/ShopifyTab";
import { usePlatformStatus } from "@/hooks/usePlatformStatus";
import { useGoogleData } from "@/hooks/useGoogleData";
import { useShopifyData } from "@/hooks/useShopifyData";
import { useOverviewData } from "@/hooks/useOverviewData";

const Index = () => {
  const [dateRange, setDateRange] = useState("30days");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showHistoricalBanner, setShowHistoricalBanner] = useState(true);

  // Get userId from URL
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get("user_id");

  // Fetch platform status
  const {
    platformStatus,
    loading: platformsLoading,
    error: platformsError,
  } = usePlatformStatus(userId);

  const {
    chartData: overviewChartData,
    loading: overviewLoading,
    error: overviewError,
  } = useOverviewData(
    userId,
    platformStatus.meta.ad_account_id,
    platformStatus.meta.connected,
    !platformsLoading,
    dateRange,
    customRange
  );

  

  // Fetch Google data
  const {
    campaigns: googleCampaigns,
    adGroups: googleAdGroups,
    ads: googleAds,
    loading: googleLoading,
    error: googleError,
    refreshAll: refreshGoogle,
  } = useGoogleData(
    userId,
    platformStatus.google.selected_manager_id ||
      platformStatus.google.manager_id,
    platformStatus.google.client_customer_id,
    platformStatus.google.connected,
    !platformsLoading
  );

  // Fetch Shopify data
  const {
    orders: shopifyOrders,
    products: shopifyProducts,
    customers: shopifyCustomers,
    loading: shopifyLoading,
    error: shopifyError,
    refreshAll: refreshShopify,
  } = useShopifyData(
    userId,
    platformStatus.shopify.connected,
    !platformsLoading
  );

  // Notification state
  const [notifications, setNotifications] = useState({
    loading: {
      platforms: false,
      meta: false,
      google: false,
      shopify: false,
    },
    error: {
      platforms: null as string | null,
      meta: null as string | null,
      google: null as string | null,
      shopify: null as string | null,
    },
    success: {
      meta: false,
      google: false,
      shopify: false,
    },
  });

  // Update notifications based on hook states
  useEffect(() => {
    const anyShopifyLoading =
      shopifyLoading.orders ||
      shopifyLoading.products ||
      shopifyLoading.customers;
    const anyShopifyError =
      shopifyError.orders || shopifyError.products || shopifyError.customers;

    const anyGoogleLoading =
      googleLoading.campaigns || googleLoading.adGroups || googleLoading.ads;
    const anyGoogleError =
      googleError.campaigns || googleError.adGroups || googleError.ads;

    setNotifications({
      loading: {
        platforms: platformsLoading,
        meta: false, // Meta manages its own loading now
        google: anyGoogleLoading,
        shopify: anyShopifyLoading,
      },
      error: {
        platforms: platformsError,
        meta: null, // Meta manages its own errors now
        google: anyGoogleError,
        shopify: anyShopifyError,
      },
      success: {
        meta: false, // Meta manages its own success now
        google:
          !anyGoogleLoading &&
          !anyGoogleError &&
          googleCampaigns.length > 0 &&
          platformStatus.google.connected,
        shopify:
          !anyShopifyLoading &&
          !anyShopifyError &&
          shopifyOrders.length > 0 &&
          platformStatus.shopify.connected,
      },
    });
  }, [
    platformsLoading,
    platformsError,
    googleLoading.campaigns,
    googleLoading.adGroups,
    googleLoading.ads,
    googleError.campaigns,
    googleError.adGroups,
    googleError.ads,
    googleCampaigns.length,
    shopifyLoading.orders,
    shopifyLoading.products,
    shopifyLoading.customers,
    shopifyError.orders,
    shopifyError.products,
    shopifyError.customers,
    shopifyOrders.length,
    platformStatus.google.connected,
    platformStatus.shopify.connected,
  ]);

  // Auto-hide notifications after 3 seconds
  useEffect(() => {
    const hasAnyNotification =
      Object.values(notifications.loading).some((v) => v) ||
      Object.values(notifications.error).some((v) => v) ||
      Object.values(notifications.success).some((v) => v);

    if (hasAnyNotification) {
      const timer = setTimeout(() => {
        setNotifications((prev) => ({
          loading: {
            platforms: false,
            meta: false,
            google: false,
            shopify: false,
          },
          error: {
            platforms: null,
            meta: null,
            google: null,
            shopify: null,
          },
          success: {
            meta: false,
            google: false,
            shopify: false,
          },
        }));
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [notifications]);

  // Handle Google refresh
  const handleRefreshGoogle = async () => {
    setIsRefreshing(true);
    try {
      await refreshGoogle();
      setNotifications((prev) => ({
        ...prev,
        success: { ...prev.success, google: true },
      }));
    } catch (e) {
      console.error("Google refresh failed:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle date range change
  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
    if (value !== "custom") {
      setCustomRange(undefined);
    }
  };

  // Handle custom range change
  const handleCustomRangeChange = (range: DateRange | undefined) => {
    setCustomRange(range);
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        customRange={customRange}
        onCustomRangeChange={handleCustomRangeChange}
      />

      <main className="container mx-auto px-6 py-4">
        <NotificationBanner
          loading={notifications.loading}
          error={notifications.error}
          success={notifications.success}
          counts={{
            metaCampaigns: 0, // Meta manages its own counts now
            metaAdSets: 0,
            metaAds: 0,
            googleCampaigns: googleCampaigns.length,
            shopifyOrders: shopifyOrders.length,
          }}
        />

        {showHistoricalBanner &&
          platformStatus.meta.connected &&
          platformStatus.meta.ad_account_id && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 relative">
              <button
                onClick={() => setShowHistoricalBanner(false)}
                className="absolute top-3 right-3 text-blue-600 hover:text-blue-900 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-3 pr-8">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <div>
                  <p className="font-semibold text-blue-900">
                    Loading Historical Data
                  </p>
                  <p className="text-sm text-blue-700">
                    Fetching 2.5 years of data in the background. This may take
                    5-15 minutes. You can use the dashboard normally while this
                    completes.
                  </p>
                </div>
              </div>
            </div>
          )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="meta" className="gap-2">
              <Facebook className="h-4 w-4" />
              Meta
            </TabsTrigger>
            <TabsTrigger value="google" className="gap-2">
              <Search className="h-4 w-4" />
              Google{" "}
              {googleCampaigns.length > 0 && `(${googleCampaigns.length})`}
            </TabsTrigger>
            <TabsTrigger value="shopify" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Shopify
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab
              dateRange={dateRange}
              customRange={customRange}
              chartData={overviewChartData}
              isLoading={overviewLoading}
              error={overviewError}
            />
          </TabsContent>

          <TabsContent value="meta">
            {/* 🔥 SIMPLIFIED - MetaTab manages everything itself */}
            <MetaTab
              userId={userId}
              adAccountId={platformStatus.meta.ad_account_id}
              isConnected={platformStatus.meta.connected}
              platformsLoaded={!platformsLoading}
            />
          </TabsContent>

          <TabsContent value="google">
            <GoogleTab
              campaigns={googleCampaigns}
              adGroups={googleAdGroups}
              ads={googleAds}
              isConnected={platformStatus.google.connected}
              loading={googleLoading}
              isRefreshing={isRefreshing}
              onRefresh={handleRefreshGoogle}
              dateRange={dateRange}
              customRange={customRange}
            />
          </TabsContent>

          <TabsContent value="shopify">
            <ShopifyTab
              orders={shopifyOrders}
              products={shopifyProducts}
              customers={shopifyCustomers}
              isConnected={platformStatus.shopify.connected}
              loading={shopifyLoading}
              isRefreshing={isRefreshing}
              onRefresh={refreshShopify}
              dateRange={dateRange}
              customRange={customRange}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
