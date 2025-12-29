// FILE: Frontend/src/components/dashboard/tabs/MetaTab.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MetaCampaignsTable } from "@/components/dashboard/MetaCampaignsTable";
import { MetaAdSetsTable } from "@/components/dashboard/MetaAdSetsTable";
import { MetaAdsTable } from "@/components/dashboard/MetaAdsTable";
import { Facebook, RefreshCw, Calendar } from "lucide-react";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { useMetaData } from "@/hooks/useMetaData";

interface MetaTabProps {
  userId: string | null;
  adAccountId: string | null | undefined;
  isConnected: boolean;
  platformsLoaded: boolean;
}

export const MetaTab = ({
  userId,
  adAccountId,
  isConnected,
  platformsLoaded,
}: MetaTabProps) => {
  const [dateRange, setDateRange] = useState("30days");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { campaigns, adSets, ads, loading, error, refreshAll } = useMetaData(
    userId,
    adAccountId,
    isConnected,
    platformsLoaded,
    dateRange,
    customRange
  );

  const hasData = campaigns.length > 0 || adSets.length > 0 || ads.length > 0;

  const getDateRangeText = () => {
    if (dateRange === "custom") {
      if (customRange?.from && customRange?.to) {
        return `${customRange.from.toLocaleDateString()} - ${customRange.to.toLocaleDateString()}`;
      }
      return "Select custom dates";
    }

    const labels: Record<string, string> = {
      today: "Today",
      "7days": "Last 7 Days",
      "30days": "Last 30 Days",
      "90days": "Last 90 Days",
    };

    return labels[dateRange] || "Last 30 Days";
  };

  const handleDateRangeChange = (value: string) => {
    console.log("📅 Date range changed:", value);
    setDateRange(value);
    if (value === "custom") {
      setShowCustomPicker(true);
    } else {
      setShowCustomPicker(false);
      setCustomRange(undefined);
    }
  };

  const handleCustomRangeApply = () => {
    if (customRange?.from && customRange?.to) {
      console.log("📅 Custom range applied:", {
        from: customRange.from.toLocaleDateString(),
        to: customRange.to.toLocaleDateString(),
      });
      setShowCustomPicker(false);
    } else {
      console.warn("⚠️ Custom range not complete");
    }
  };

  const handleRefresh = async () => {
    console.log("🔄 Manual refresh clicked");
    setIsRefreshing(true);
    try {
      await refreshAll();
    } catch (e) {
      console.error("❌ Meta refresh failed:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-slate-700/50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Facebook className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Meta Campaigns & Ads
            </h2>
            <p className="text-sm text-muted-foreground">
              {getDateRangeText()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <Select value={dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger className="w-[160px] border-slate-700/50 bg-slate-800/50">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent className="border-slate-700/50 bg-slate-800">
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {/* Refresh Button */}
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing || !isConnected}
            variant="outline"
            size="sm"
            className="border-slate-700/50 bg-slate-800/50 hover:bg-slate-800"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Custom Date Picker */}
      {showCustomPicker && (
        <div className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium mb-2 text-foreground">
                Select Custom Date Range
              </p>
              <DatePickerWithRange
                date={customRange}
                setDate={setCustomRange}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-700/50"
                onClick={() => {
                  setShowCustomPicker(false);
                  setDateRange("30days");
                  setCustomRange(undefined);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCustomRangeApply}
                disabled={!customRange?.from || !customRange?.to}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {(loading.campaigns || loading.adSets || loading.ads) && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading Meta data...</p>
        </div>
      )}

      {/* Error State */}
      {(error.campaigns || error.adSets || error.ads) && (
        <div className="bg-destructive/10 border border-destructive/50 backdrop-blur-sm rounded-lg p-4 mb-6">
          <p className="text-destructive font-semibold">
            Error loading Meta data
          </p>
          <p className="text-destructive/80 text-sm mt-1">
            {error.campaigns || error.adSets || error.ads}
          </p>
        </div>
      )}

      {/* Data Tabs */}
      {hasData ? (
        <Tabs defaultValue="campaigns" className="w-full">
          <TabsList className="mb-6 bg-slate-800/50 border border-slate-700/50">
            <TabsTrigger
              value="campaigns"
              className="data-[state=active]:bg-slate-700/50 data-[state=active]:text-foreground"
            >
              Campaigns {campaigns.length > 0 && `(${campaigns.length})`}
            </TabsTrigger>
            <TabsTrigger
              value="adsets"
              className="data-[state=active]:bg-slate-700/50 data-[state=active]:text-foreground"
            >
              Ad Sets {adSets.length > 0 && `(${adSets.length})`}
            </TabsTrigger>
            <TabsTrigger
              value="ads"
              className="data-[state=active]:bg-slate-700/50 data-[state=active]:text-foreground"
            >
              Ads {ads.length > 0 && `(${ads.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns">
            <MetaCampaignsTable
              campaigns={campaigns}
              isLoading={loading.campaigns}
              dateRange={dateRange}
              customRange={customRange}
            />
          </TabsContent>

          <TabsContent value="adsets">
            <MetaAdSetsTable
              adsets={adSets}
              isLoading={loading.adSets}
              dateRange={dateRange}
              customRange={customRange}
            />
          </TabsContent>

          <TabsContent value="ads">
            <MetaAdsTable
              ads={ads}
              isLoading={loading.ads}
              dateRange={dateRange}
              customRange={customRange}
            />
          </TabsContent>
        </Tabs>
      ) : !loading.campaigns &&
        !loading.adSets &&
        !loading.ads &&
        !error.campaigns &&
        !error.adSets &&
        !error.ads ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {isConnected
              ? "No Meta data available. Try refreshing or check your ad account."
              : "Meta not connected. Connect your Meta account in the Profile page."}
          </p>
        </div>
      ) : null}
    </div>
  );
};
