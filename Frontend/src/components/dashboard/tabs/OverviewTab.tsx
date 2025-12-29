// FILE: Frontend/src/components/dashboard/tabs/OverviewTab.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Facebook,
  Search,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Eye,
  MousePointer,
  Target,
  Package,
  Lock,
  Sparkles,
} from "lucide-react";
import { DateRange } from "react-day-picker";
import { DailyChartData } from "@/hooks/useOverviewData";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { Card } from "@/components/ui/card";

interface OverviewTabProps {
  dateRange: string;
  customRange?: DateRange;
  chartData: DailyChartData[];
  isLoading: boolean;
  error: string | null;
  activeSubTab?: string;
  onSubTabChange?: (subTab: string) => void;
  googleData?: {
    totalSpend: number;
    totalClicks: number;
    totalImpressions: number;
    totalConversions: number;
    avgCTR: number;
    avgCPC: number;
    avgCPM: number;
  };
  googleChartData?: Array<{
    date: string;
    totalSpend: number;
    totalClicks: number;
    totalImpressions: number;
    totalConversions?: number;
  }>;
  googleLoading?: boolean;
  googleError?: string | null;
  shopifyData?: {
    totalRevenue: number;
    orderCount: number;
    avgOrderValue: number;
  };
  shopifyChartData?: Array<{
    date: string;
    totalRevenue: number;
    orderCount: number;
    avgOrderValue: number;
  }>;
  shopifyLoading?: boolean;
  shopifyError?: string | null;
}

export const OverviewTab = ({
  dateRange,
  customRange,
  chartData,
  isLoading,
  error,
  activeSubTab = "meta",
  onSubTabChange,
  googleData,
  googleChartData,
  googleLoading,
  googleError,
  shopifyData,
  shopifyChartData,
  shopifyLoading,
  shopifyError,
}: OverviewTabProps) => {
  // Calculate Meta totals from chart data
  const metaTotals = chartData.reduce(
    (acc, day) => ({
      spend: acc.spend + day.totalSpend,
      impressions: acc.impressions + day.totalImpressions,
      clicks: acc.clicks + day.totalClicks,
    }),
    { spend: 0, impressions: 0, clicks: 0 }
  );

  const metaCTR =
    metaTotals.impressions > 0
      ? (metaTotals.clicks / metaTotals.impressions) * 100
      : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + "M";
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + "K";
    }
    return value.toFixed(0);
  };

  // Render content based on active sub-tab
  const renderContent = () => {
    switch (activeSubTab) {
      case "meta":
        return (
          <>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <MetricCard
                    key={i}
                    title="Loading..."
                    value="0"
                    loading={true}
                  />
                ))}
              </div>
            ) : error ? (
              <Card className="bg-card border-destructive/50 p-6">
                <div className="text-center py-12">
                  <p className="text-destructive font-semibold mb-2">
                    Error loading Meta data
                  </p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </Card>
            ) : (
              <>
                {/* Meta Metric Cards - NO DUMMY TRENDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <MetricCard
                    title="Total Ad Spend"
                    value={formatCurrency(metaTotals.spend)}
                    icon={DollarSign}
                    iconColor="cyan"
                    subtitle="vs. last period"
                  />
                  <MetricCard
                    title="Total Impressions"
                    value={formatNumber(metaTotals.impressions)}
                    icon={Eye}
                    iconColor="teal"
                    subtitle="vs. last period"
                  />
                  <MetricCard
                    title="Total Clicks"
                    value={formatNumber(metaTotals.clicks)}
                    icon={MousePointer}
                    iconColor="purple"
                    subtitle="vs. last period"
                  />
                  <MetricCard
                    title="Average CTR"
                    value={metaCTR.toFixed(2)}
                    suffix="%"
                    icon={Target}
                    iconColor="green"
                    subtitle="vs. last period"
                  />
                </div>

                {/* Meta Chart */}
                <TrendChart
                  dateRange={dateRange}
                  data={chartData}
                  isLoading={isLoading}
                  error={error}
                  platform="meta"
                />
              </>
            )}
          </>
        );

      case "google":
        return (
          <>
            {googleLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <MetricCard
                    key={i}
                    title="Loading..."
                    value="0"
                    loading={true}
                  />
                ))}
              </div>
            ) : googleError ? (
              <Card className="bg-card border-destructive/50 p-6">
                <div className="text-center py-12">
                  <p className="text-destructive font-semibold mb-2">
                    Error loading Google data
                  </p>
                  <p className="text-sm text-muted-foreground">{googleError}</p>
                </div>
              </Card>
            ) : googleData ? (
              <>
                {/* Google Metric Cards - NO DUMMY TRENDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <MetricCard
                    title="Total Ad Spend"
                    value={formatCurrency(googleData.totalSpend)}
                    icon={DollarSign}
                    iconColor="cyan"
                    subtitle="vs. last period"
                  />
                  <MetricCard
                    title="Total Impressions"
                    value={formatNumber(googleData.totalImpressions)}
                    icon={Eye}
                    iconColor="teal"
                    subtitle="vs. last period"
                  />
                  <MetricCard
                    title="Total Clicks"
                    value={formatNumber(googleData.totalClicks)}
                    icon={MousePointer}
                    iconColor="purple"
                    subtitle="vs. last period"
                  />
                  <MetricCard
                    title="Average CTR"
                    value={googleData.avgCTR.toFixed(2)}
                    suffix="%"
                    icon={Target}
                    iconColor="green"
                    subtitle="vs. last period"
                  />
                </div>

                {/* Google Chart */}
                {googleChartData && googleChartData.length > 0 ? (
                  <TrendChart
                    dateRange={dateRange}
                    data={googleChartData}
                    isLoading={googleLoading || false}
                    error={googleError || null}
                    platform="google"
                  />
                ) : (
                  <Card className="bg-card border-border/50 p-6">
                    <div className="text-center py-12">
                      <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-lg font-semibold mb-2">
                        No Daily Data Available
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Daily Google Ads insights need to be fetched first
                      </p>
                    </div>
                  </Card>
                )}
              </>
            ) : (
              <Card className="bg-card border-border/50 p-6">
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    No Google Ads data available
                  </p>
                </div>
              </Card>
            )}
          </>
        );

      case "shopify":
        return (
          <Card className="bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-teal-500/10 border-green-500/20 backdrop-blur-sm overflow-hidden relative">
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-green-500/5 to-green-500/0 animate-pulse"></div>

            <div className="relative z-10 p-12">
              <div className="max-w-xl mx-auto text-center space-y-4">
                {/* Icon */}
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-500/30 rounded-full blur-xl"></div>
                    <div className="relative p-4 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full border border-green-500/30">
                      <ShoppingCart className="h-12 w-12 text-green-500" />
                    </div>
                  </div>
                </div>

                {/* Heading */}
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Lock className="h-4 w-4 text-green-500" />
                    <h3 className="text-2xl font-bold text-foreground">
                      Shopify Analytics
                    </h3>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-full text-xs font-semibold border border-green-500/30">
                    <Sparkles className="h-3.5 w-3.5" />
                    Coming Soon
                  </div>
                </div>

                {/* Description */}
                <p className="text-muted-foreground max-w-md mx-auto">
                  We're building comprehensive Shopify integration to bring you
                  order analytics, revenue tracking, and customer insights
                  directly in your dashboard.
                </p>

                {/* Features Preview */}
                <div className="grid grid-cols-3 gap-3 mt-6 text-left">
                  <div className="p-3 bg-card/50 rounded-lg border border-border/50">
                    <DollarSign className="h-5 w-5 text-green-500 mb-2" />
                    <p className="text-xs font-semibold text-foreground">
                      Revenue
                    </p>
                    <p className="text-xs text-muted-foreground">Tracking</p>
                  </div>
                  <div className="p-3 bg-card/50 rounded-lg border border-border/50">
                    <Package className="h-5 w-5 text-green-500 mb-2" />
                    <p className="text-xs font-semibold text-foreground">
                      Order
                    </p>
                    <p className="text-xs text-muted-foreground">Analytics</p>
                  </div>
                  <div className="p-3 bg-card/50 rounded-lg border border-border/50">
                    <TrendingUp className="h-5 w-5 text-green-500 mb-2" />
                    <p className="text-xs font-semibold text-foreground">
                      ROAS
                    </p>
                    <p className="text-xs text-muted-foreground">Calculation</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );

      default:
        return null;
    }
  };

  return <div className="space-y-6">{renderContent()}</div>;
};

// // FILE: Frontend/src/components/dashboard/tabs/OverviewTab.tsx
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import {
//   Facebook,
//   Search,
//   ShoppingCart,
//   TrendingUp,
//   DollarSign,
//   Eye,
//   MousePointer,
//   Target,
//   Package,
// } from "lucide-react";
// import { DateRange } from "react-day-picker";
// import { DailyChartData } from "@/hooks/useOverviewData";
// import { MetricCard } from "@/components/dashboard/MetricCard";
// import { TrendChart } from "@/components/dashboard/TrendChart";
// import { Card } from "@/components/ui/card";

// interface OverviewTabProps {
//   dateRange: string;
//   customRange?: DateRange;
//   chartData: DailyChartData[];
//   isLoading: boolean;
//   error: string | null;
//   activeSubTab?: string;
//   onSubTabChange?: (subTab: string) => void;
//   googleData?: {
//     totalSpend: number;
//     totalClicks: number;
//     totalImpressions: number;
//     totalConversions: number;
//     avgCTR: number;
//     avgCPC: number;
//     avgCPM: number;
//   };
//   googleChartData?: Array<{
//     date: string;
//     totalSpend: number;
//     totalClicks: number;
//     totalImpressions: number;
//     totalConversions?: number;
//   }>;
//   googleLoading?: boolean;
//   googleError?: string | null;
//   shopifyData?: {
//     totalRevenue: number;
//     orderCount: number;
//     avgOrderValue: number;
//   };
//   shopifyChartData?: Array<{
//     date: string;
//     totalRevenue: number;
//     orderCount: number;
//     avgOrderValue: number;
//   }>;
//   shopifyLoading?: boolean;
//   shopifyError?: string | null;
// }

// export const OverviewTab = ({
//   dateRange,
//   customRange,
//   chartData,
//   isLoading,
//   error,
//   activeSubTab = "meta",
//   onSubTabChange,
//   googleData,
//   googleChartData,
//   googleLoading,
//   googleError,
//   shopifyData,
//   shopifyChartData,
//   shopifyLoading,
//   shopifyError,
// }: OverviewTabProps) => {
//   // Calculate Meta totals from chart data
//   const metaTotals = chartData.reduce(
//     (acc, day) => ({
//       spend: acc.spend + day.totalSpend,
//       impressions: acc.impressions + day.totalImpressions,
//       clicks: acc.clicks + day.totalClicks,
//     }),
//     { spend: 0, impressions: 0, clicks: 0 }
//   );

//   const metaCTR =
//     metaTotals.impressions > 0
//       ? (metaTotals.clicks / metaTotals.impressions) * 100
//       : 0;

//   const formatCurrency = (value: number) => {
//     return new Intl.NumberFormat("en-US", {
//       style: "currency",
//       currency: "USD",
//       minimumFractionDigits: 0,
//       maximumFractionDigits: 0,
//     }).format(value);
//   };

//   const formatNumber = (value: number) => {
//     if (value >= 1000000) {
//       return (value / 1000000).toFixed(1) + "M";
//     } else if (value >= 1000) {
//       return (value / 1000).toFixed(1) + "K";
//     }
//     return value.toFixed(0);
//   };

//   // Render content based on active sub-tab
//   const renderContent = () => {
//     switch (activeSubTab) {
//       case "meta":
//         return (
//           <>
//             {isLoading ? (
//               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//                 {[...Array(4)].map((_, i) => (
//                   <MetricCard
//                     key={i}
//                     title="Loading..."
//                     value="0"
//                     loading={true}
//                   />
//                 ))}
//               </div>
//             ) : error ? (
//               <Card className="bg-card border-destructive/50 p-6">
//                 <div className="text-center py-12">
//                   <p className="text-destructive font-semibold mb-2">
//                     Error loading Meta data
//                   </p>
//                   <p className="text-sm text-muted-foreground">{error}</p>
//                 </div>
//               </Card>
//             ) : (
//               <>
//                 {/* Meta Metric Cards - NO DUMMY TRENDS */}
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//                   <MetricCard
//                     title="Total Ad Spend"
//                     value={formatCurrency(metaTotals.spend)}
//                     icon={DollarSign}
//                     iconColor="cyan"
//                     subtitle="vs. last period"
//                   />
//                   <MetricCard
//                     title="Total Impressions"
//                     value={formatNumber(metaTotals.impressions)}
//                     icon={Eye}
//                     iconColor="teal"
//                     subtitle="vs. last period"
//                   />
//                   <MetricCard
//                     title="Total Clicks"
//                     value={formatNumber(metaTotals.clicks)}
//                     icon={MousePointer}
//                     iconColor="purple"
//                     subtitle="vs. last period"
//                   />
//                   <MetricCard
//                     title="Average CTR"
//                     value={metaCTR.toFixed(2)}
//                     suffix="%"
//                     icon={Target}
//                     iconColor="green"
//                     subtitle="vs. last period"
//                   />
//                 </div>

//                 {/* Meta Chart */}
//                 <TrendChart
//                   dateRange={dateRange}
//                   data={chartData}
//                   isLoading={isLoading}
//                   error={error}
//                   platform="meta"
//                 />
//               </>
//             )}
//           </>
//         );

//       case "google":
//         return (
//           <>
//             {googleLoading ? (
//               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//                 {[...Array(4)].map((_, i) => (
//                   <MetricCard
//                     key={i}
//                     title="Loading..."
//                     value="0"
//                     loading={true}
//                   />
//                 ))}
//               </div>
//             ) : googleError ? (
//               <Card className="bg-card border-destructive/50 p-6">
//                 <div className="text-center py-12">
//                   <p className="text-destructive font-semibold mb-2">
//                     Error loading Google data
//                   </p>
//                   <p className="text-sm text-muted-foreground">{googleError}</p>
//                 </div>
//               </Card>
//             ) : googleData ? (
//               <>
//                 {/* Google Metric Cards - NO DUMMY TRENDS */}
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//                   <MetricCard
//                     title="Total Ad Spend"
//                     value={formatCurrency(googleData.totalSpend)}
//                     icon={DollarSign}
//                     iconColor="cyan"
//                     subtitle="vs. last period"
//                   />
//                   <MetricCard
//                     title="Total Impressions"
//                     value={formatNumber(googleData.totalImpressions)}
//                     icon={Eye}
//                     iconColor="teal"
//                     subtitle="vs. last period"
//                   />
//                   <MetricCard
//                     title="Total Clicks"
//                     value={formatNumber(googleData.totalClicks)}
//                     icon={MousePointer}
//                     iconColor="purple"
//                     subtitle="vs. last period"
//                   />
//                   <MetricCard
//                     title="Average CTR"
//                     value={googleData.avgCTR.toFixed(2)}
//                     suffix="%"
//                     icon={Target}
//                     iconColor="green"
//                     subtitle="vs. last period"
//                   />
//                 </div>

//                 {/* Google Chart */}
//                 {googleChartData && googleChartData.length > 0 ? (
//                   <TrendChart
//                     dateRange={dateRange}
//                     data={googleChartData}
//                     isLoading={googleLoading || false}
//                     error={googleError || null}
//                     platform="google"
//                   />
//                 ) : (
//                   <Card className="bg-card border-border/50 p-6">
//                     <div className="text-center py-12">
//                       <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
//                       <p className="text-lg font-semibold mb-2">
//                         No Daily Data Available
//                       </p>
//                       <p className="text-sm text-muted-foreground mb-4">
//                         Daily Google Ads insights need to be fetched first
//                       </p>
//                     </div>
//                   </Card>
//                 )}
//               </>
//             ) : (
//               <Card className="bg-card border-border/50 p-6">
//                 <div className="text-center py-12">
//                   <p className="text-muted-foreground">
//                     No Google Ads data available
//                   </p>
//                 </div>
//               </Card>
//             )}
//           </>
//         );

//       case "shopify":
//         return (
//           <>
//             {shopifyLoading ? (
//               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                 {[...Array(3)].map((_, i) => (
//                   <MetricCard
//                     key={i}
//                     title="Loading..."
//                     value="0"
//                     loading={true}
//                   />
//                 ))}
//               </div>
//             ) : shopifyError ? (
//               <Card className="bg-card border-destructive/50 p-6">
//                 <div className="text-center py-12">
//                   <p className="text-destructive font-semibold mb-2">
//                     Error loading Shopify data
//                   </p>
//                   <p className="text-sm text-muted-foreground">
//                     {shopifyError}
//                   </p>
//                 </div>
//               </Card>
//             ) : shopifyData ? (
//               <>
//                 {/* Shopify Metric Cards - NO DUMMY TRENDS */}
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                   <MetricCard
//                     title="Total Revenue"
//                     value={formatCurrency(shopifyData.totalRevenue)}
//                     icon={DollarSign}
//                     iconColor="cyan"
//                     subtitle="Total sales"
//                   />
//                   <MetricCard
//                     title="Total Orders"
//                     value={formatNumber(shopifyData.orderCount)}
//                     icon={Package}
//                     iconColor="purple"
//                     subtitle="Orders placed"
//                   />
//                   <MetricCard
//                     title="Avg Order Value"
//                     value={formatCurrency(shopifyData.avgOrderValue)}
//                     icon={TrendingUp}
//                     iconColor="green"
//                     subtitle="Per order"
//                   />
//                 </div>

//                 {/* Shopify Chart */}
//                 {shopifyChartData && shopifyChartData.length > 0 ? (
//                   <TrendChart
//                     dateRange={dateRange}
//                     data={shopifyChartData.map((day) => ({
//                       date: day.date,
//                       totalSpend: day.totalRevenue,
//                       totalImpressions: day.orderCount,
//                       totalClicks: 0,
//                     }))}
//                     isLoading={shopifyLoading || false}
//                     error={shopifyError || null}
//                     platform="shopify"
//                   />
//                 ) : (
//                   <Card className="bg-card border-border/50 p-6">
//                     <div className="text-center py-12">
//                       <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
//                       <p className="text-lg font-semibold mb-2">
//                         No Daily Data Available
//                       </p>
//                       <p className="text-sm text-muted-foreground mb-4">
//                         Shopify order data needs to be synced first
//                       </p>
//                     </div>
//                   </Card>
//                 )}
//               </>
//             ) : (
//               <Card className="bg-card border-border/50 p-6">
//                 <div className="text-center py-12">
//                   <p className="text-muted-foreground">
//                     No Shopify data available
//                   </p>
//                 </div>
//               </Card>
//             )}
//           </>
//         );

//       default:
//         return null;
//     }
//   };

//   return <div className="space-y-6">{renderContent()}</div>;
// };
