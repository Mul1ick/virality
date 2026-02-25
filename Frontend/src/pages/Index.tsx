// FILE: Frontend/src/pages/Index.tsx
import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { Loader2, X, AlertCircle, Zap } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { OverviewTab } from "@/components/dashboard/tabs/OverviewTab";
import { MetaTab } from "@/components/dashboard/tabs/MetaTab";
import { GoogleTab } from "@/components/dashboard/tabs/GoogleTab";
import { ShopifyTab } from "@/components/dashboard/tabs/ShopifyTab";
import { usePlatformStatus } from "@/hooks/usePlatformStatus";
// import { useShopifyOverviewData } from "@/hooks/useShopifyOverviewData"; // COMMENTED OUT - Coming Soon
import { useOverviewData } from "@/hooks/useOverviewData";
import { useGoogleOverviewData } from "@/hooks/useGoogleOverviewData";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useSidebarState } from "@/hooks/useSidebarState";

const Index = () => {
  const [dateRange, setDateRange] = useState("30days");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [showHistoricalBanner, setShowHistoricalBanner] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [activeSubTab, setActiveSubTab] = useState("meta");
  const { isOpen: sidebarOpen, setIsOpen: setSidebarOpen, toggle: toggleSidebar } = useSidebarState();

  // Get userId from URL params first, then fall back to localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get("user_id") || localStorage.getItem("user_id");

  // Fetch platform status
  const {
    platformStatus,
    loading: platformsLoading,
    error: platformsError,
  } = usePlatformStatus(userId);

  // Fetch Meta overview data
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

  // Fetch Google overview data
  const {
    aggregatedData: googleOverviewData,
    chartData: googleChartData,
    loading: googleOverviewLoading,
    error: googleOverviewError,
  } = useGoogleOverviewData(
    userId,
    platformStatus.google.client_customer_id,
    platformStatus.google.selected_manager_id ||
      platformStatus.google.manager_id,
    platformStatus.google.connected,
    !platformsLoading,
    dateRange,
    customRange
  );

  /* SHOPIFY DATA FETCHING - COMMENTED OUT FOR NOW
  // Fetch Shopify overview data
  const {
    chartData: shopifyChartData,
    loading: shopifyOverviewLoading,
    error: shopifyOverviewError,
  } = useShopifyOverviewData(
    userId,
    platformStatus.shopify.connected,
    !platformsLoading,
    dateRange,
    customRange
  );

  // Calculate Shopify aggregated data from chartData
  const shopifyOverviewData = shopifyChartData.reduce(
    (acc, day) => ({
      totalRevenue: acc.totalRevenue + day.totalRevenue,
      orderCount: acc.orderCount + day.orderCount,
      avgOrderValue: 0,
    }),
    { totalRevenue: 0, orderCount: 0, avgOrderValue: 0 }
  );

  // Recalculate average order value
  shopifyOverviewData.avgOrderValue =
    shopifyOverviewData.orderCount > 0
      ? shopifyOverviewData.totalRevenue / shopifyOverviewData.orderCount
      : 0;
  */

  // TEMPORARY: Mock empty Shopify data
  const shopifyChartData: any[] = [];
  const shopifyOverviewLoading = false;
  const shopifyOverviewError = null;
  const shopifyOverviewData = {
    totalRevenue: 0,
    orderCount: 0,
    avgOrderValue: 0,
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

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <OverviewTab
            dateRange={dateRange}
            customRange={customRange}
            chartData={overviewChartData}
            isLoading={overviewLoading}
            error={overviewError}
            activeSubTab={activeSubTab}
            onSubTabChange={setActiveSubTab}
            googleData={googleOverviewData}
            googleChartData={googleChartData}
            googleLoading={googleOverviewLoading}
            googleError={googleOverviewError}
            shopifyData={shopifyOverviewData}
            shopifyChartData={shopifyChartData}
            shopifyLoading={shopifyOverviewLoading}
            shopifyError={shopifyOverviewError}
          />
        );

      case "meta":
        return (
          <MetaTab
            userId={userId}
            adAccountId={platformStatus.meta.ad_account_id}
            isConnected={platformStatus.meta.connected}
            platformsLoaded={!platformsLoading}
            headerDateRange={dateRange}
            headerCustomRange={customRange}
          />
        );

      case "google":
        return (
          <GoogleTab
            userId={userId}
            managerId={
              platformStatus.google.selected_manager_id ||
              platformStatus.google.manager_id
            }
            customerId={platformStatus.google.client_customer_id}
            isConnected={platformStatus.google.connected}
            platformsLoaded={!platformsLoading}
            headerDateRange={dateRange}
            headerCustomRange={customRange}
          />
        );

      case "shopify":
        return (
          <ShopifyTab
            userId={userId}
            isConnected={platformStatus.shopify.connected}
            platformsLoaded={!platformsLoading}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Dark gradient background overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 -z-10"></div>
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent -z-10"></div>

      {/* Header */}
      <DashboardHeader
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        customRange={customRange}
        onCustomRangeChange={handleCustomRangeChange}
        onToggleSidebar={toggleSidebar}
      />

      {/* Main Layout with Sidebar */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* Desktop Sidebar - hidden on mobile */}
        <div className="hidden md:block fixed left-0 top-[73px] h-[calc(100vh-73px)] w-64 z-40">
          <DashboardSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            activeSubTab={activeSubTab}
            onSubTabChange={setActiveSubTab}
          />
        </div>

        {/* Mobile Sidebar - Sheet drawer */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-[280px] bg-card/95 backdrop-blur-xl border-border/50 [&>button]:hidden">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            {/* Custom branded header with close button */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-br from-primary to-secondary rounded-lg">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-foreground text-sm">Navigation</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <DashboardSidebar
              activeTab={activeTab}
              onTabChange={(tab) => {
                setActiveTab(tab);
                setSidebarOpen(false);
              }}
              activeSubTab={activeSubTab}
              onSubTabChange={(subTab) => {
                setActiveSubTab(subTab);
                setSidebarOpen(false);
              }}
            />
          </SheetContent>
        </Sheet>

        {/* Main Content - With left margin to account for sidebar on desktop */}
        <main className="flex-1 md:ml-64 overflow-x-hidden">
          <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-6 max-w-full md:max-w-[calc(100vw-16rem)]">
            {/* Platform Error Banner */}
            {platformsError && (
              <Card className="bg-destructive/10 border-destructive/50 backdrop-blur-sm p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <p className="text-destructive font-semibold">
                      Error loading platforms
                    </p>
                    <p className="text-destructive/80 text-sm mt-1">
                      {platformsError}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Historical Data Loading Banner */}
            {showHistoricalBanner &&
              platformStatus.meta.connected &&
              platformStatus.meta.ad_account_id && (
                <Card className="bg-primary/10 border-primary/30 backdrop-blur-sm p-4 mb-6 relative overflow-hidden">
                  {/* Animated gradient background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 animate-pulse"></div>

                  <button
                    onClick={() => setShowHistoricalBanner(false)}
                    className="absolute top-3 right-3 text-primary hover:text-primary/70 transition-colors z-10"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  <div className="flex items-center gap-3 pr-8 relative z-10">
                    <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">
                        Loading Historical Data
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Fetching 2.5 years of data in the background. This may
                        take 5-15 minutes. You can use the dashboard normally
                        while this completes.
                      </p>
                    </div>
                  </div>
                </Card>
              )}

            {/* Tab Content */}
            {renderTabContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
