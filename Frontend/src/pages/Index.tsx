// pages/Index.tsx
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
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { NotificationBanner } from "@/components/dashboard/NotificationBanner";
import { OverviewTab } from "@/components/dashboard/tabs/OverviewTab";
import { MetaTab } from "@/components/dashboard/tabs/MetaTab";
import { GoogleTab } from "@/components/dashboard/tabs/GoogleTab";
import { ShopifyTab } from "@/components/dashboard/tabs/ShopifyTab";
import { usePlatformStatus } from "@/hooks/usePlatformStatus";
import { useMetaData } from "@/hooks/useMetaData";
import { useGoogleData } from "@/hooks/useGoogleData";
import { useShopifyData } from "@/hooks/useShopifyData";

const Index = () => {
  const [dateRange, setDateRange] = useState("30days");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showHistoricalBanner, setShowHistoricalBanner] = useState(true);

  // User data
  const [user, setUser] = useState({
    name: "Loading...",
    email: "Loading...",
    avatarUrl: null as string | null,
  });

  // Get userId from URL
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get("user_id");

  // Fetch platform status
  const {
    platformStatus,
    loading: platformsLoading,
    error: platformsError,
  } = usePlatformStatus(userId);

  // Fetch Meta data
  const {
    campaigns: metaCampaigns,
    adSets: metaAdSets,
    ads: metaAds,
    loading: metaLoading,
    error: metaError,
    refreshAll: refreshMeta,
  } = useMetaData(
    userId,
    platformStatus.meta.ad_account_id,
    platformStatus.meta.connected,
    !platformsLoading,
    dateRange
  );

  // Fetch Google data
  const {
    campaigns: googleCampaigns,
    loading: googleLoading,
    error: googleError,
  } = useGoogleData(
    userId,
    platformStatus.google.selected_manager_id ||
      platformStatus.google.manager_id, // ← Use selected_manager_id
    platformStatus.google.client_customer_id, // ← Use client_customer_id directly
    platformStatus.google.connected,
    !platformsLoading
  );

  // Fetch Shopify data
  const {
    orders: shopifyOrders,
    loading: shopifyLoading,
    error: shopifyError,
  } = useShopifyData(
    userId,
    platformStatus.shopify.connected,
    !platformsLoading
  );

  // Set user info when platforms load
  useEffect(() => {
    if (!platformsLoading && userId) {
      setUser({
        name: "User",
        email: userId,
        avatarUrl: null,
      });
    }
  }, [platformsLoading, userId]);

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
    const anyMetaLoading =
      metaLoading.campaigns || metaLoading.adSets || metaLoading.ads;
    const anyMetaError =
      metaError.campaigns || metaError.adSets || metaError.ads;

    setNotifications({
      loading: {
        platforms: platformsLoading,
        meta: anyMetaLoading,
        google: googleLoading,
        shopify: shopifyLoading,
      },
      error: {
        platforms: platformsError,
        meta: anyMetaError,
        google: googleError,
        shopify: shopifyError,
      },
      success: {
        meta:
          !anyMetaLoading &&
          !anyMetaError &&
          metaCampaigns.length > 0 &&
          platformStatus.meta.connected,
        google:
          !googleLoading &&
          !googleError &&
          googleCampaigns.length > 0 &&
          platformStatus.google.connected,
        shopify:
          !shopifyLoading &&
          !shopifyError &&
          shopifyOrders.length > 0 &&
          platformStatus.shopify.connected,
      },
    });
  }, [
    platformsLoading,
    platformsError,
    metaLoading,
    metaError,
    metaCampaigns.length,
    metaAdSets.length,
    metaAds.length,
    googleLoading,
    googleError,
    googleCampaigns.length,
    shopifyLoading,
    shopifyError,
    shopifyOrders.length,
    platformStatus,
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

  // Handle Meta refresh
  const handleRefreshMeta = async () => {
    setIsRefreshing(true);
    try {
      await refreshMeta();
      setNotifications((prev) => ({
        ...prev,
        success: { ...prev.success, meta: true },
      }));
    } catch (e) {
      console.error("Refresh failed:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        user={user}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      <main className="container mx-auto px-6 py-4">
        <NotificationBanner
          loading={notifications.loading}
          error={notifications.error}
          success={notifications.success}
          counts={{
            metaCampaigns: metaCampaigns.length,
            metaAdSets: metaAdSets.length,
            metaAds: metaAds.length,
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

          <TabsContent value="overview">
            <OverviewTab dateRange={dateRange} />
          </TabsContent>

          <TabsContent value="meta">
            <MetaTab
              campaigns={metaCampaigns}
              adSets={metaAdSets}
              ads={metaAds}
              loading={metaLoading}
              isConnected={platformStatus.meta.connected}
              isRefreshing={isRefreshing}
              onRefresh={handleRefreshMeta}
            />
          </TabsContent>

          <TabsContent value="google">
            <GoogleTab
              campaigns={googleCampaigns}
              isConnected={platformStatus.google.connected}
              loading={{
                campaigns: false,
              }}
              isRefreshing={false}
              onRefresh={function (): Promise<void> {
                throw new Error("Function not implemented.");
              }}
            />
          </TabsContent>

          <TabsContent value="shopify">
            <ShopifyTab
              orders={shopifyOrders}
              isConnected={platformStatus.shopify.connected}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
