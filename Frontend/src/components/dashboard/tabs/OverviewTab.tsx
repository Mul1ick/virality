// FILE: Frontend/src/components/dashboard/tabs/OverviewTab.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Facebook, Search, ShoppingCart, TrendingUp } from "lucide-react";
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
  // Google data props
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
}

export const OverviewTab = ({
  dateRange,
  customRange,
  chartData,
  isLoading,
  error,
  googleData,
  googleChartData,
  googleLoading,
  googleError,
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
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="meta" className="w-full">
        <TabsList>
          <TabsTrigger value="meta" className="gap-2">
            <Facebook className="h-4 w-4" />
            Meta Performance
          </TabsTrigger>
          <TabsTrigger value="google" className="gap-2">
            <Search className="h-4 w-4" />
            Google Performance
          </TabsTrigger>
        </TabsList>

        {/* META TAB */}
        <TabsContent value="meta" className="space-y-6">
          {isLoading ? (
            <Card className="p-6">
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading Meta data...</p>
              </div>
            </Card>
          ) : error ? (
            <Card className="p-6">
              <div className="text-center py-12">
                <p className="text-red-600 font-semibold mb-2">
                  Error loading Meta data
                </p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </Card>
          ) : (
            <>
              {/* Meta Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title="Total Ad Spend"
                  value={formatCurrency(metaTotals.spend)}
                  subtitle="vs. last period"
                />
                <MetricCard
                  title="Total Impressions"
                  value={formatNumber(metaTotals.impressions)}
                  subtitle="vs. last period"
                />
                <MetricCard
                  title="Total Clicks"
                  value={formatNumber(metaTotals.clicks)}
                  subtitle="vs. last period"
                />
                <MetricCard
                  title="Average CTR"
                  value={metaCTR.toFixed(2)}
                  suffix="%"
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
        </TabsContent>

        {/* GOOGLE TAB */}
        <TabsContent value="google" className="space-y-6">
          {googleLoading ? (
            <Card className="p-6">
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading Google data...</p>
              </div>
            </Card>
          ) : googleError ? (
            <Card className="p-6">
              <div className="text-center py-12">
                <p className="text-red-600 font-semibold mb-2">
                  Error loading Google data
                </p>
                <p className="text-sm text-muted-foreground">{googleError}</p>
              </div>
            </Card>
          ) : googleData ? (
            <>
              {/* Google Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title="Total Ad Spend"
                  value={formatCurrency(googleData.totalSpend)}
                  subtitle="vs. last period"
                />
                <MetricCard
                  title="Total Impressions"
                  value={formatNumber(googleData.totalImpressions)}
                  subtitle="vs. last period"
                />
                <MetricCard
                  title="Total Clicks"
                  value={formatNumber(googleData.totalClicks)}
                  subtitle="vs. last period"
                />
                <MetricCard
                  title="Average CTR"
                  value={googleData.avgCTR.toFixed(2)}
                  suffix="%"
                  subtitle="vs. last period"
                />
              </div>

              {/* Google Chart - USING SAME TrendChart COMPONENT AS META */}
              {googleChartData && googleChartData.length > 0 ? (
                <TrendChart
                  dateRange={dateRange}
                  data={googleChartData}
                  isLoading={googleLoading || false}
                  error={googleError || null}
                  platform="google"
                />
              ) : (
                <Card className="p-6">
                  <div className="text-center py-12">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-semibold mb-2">
                      No Daily Data Available
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Daily Google Ads insights need to be fetched first
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Go to the Google tab and let campaigns load, then come
                      back here
                    </p>
                  </div>
                </Card>
              )}
            </>
          ) : (
            <Card className="p-6">
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No Google Ads data available
                </p>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
