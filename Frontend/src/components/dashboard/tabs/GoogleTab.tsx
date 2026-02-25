import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GoogleCampaignsTable } from "@/components/dashboard/GoogleCampaignsTable";
import { GoogleAdGroupsTable } from "@/components/dashboard/GoogleAdGroupsTable";
import { GoogleAdsTable } from "@/components/dashboard/GoogleAdsTable";
import { GoogleSyncStatus } from "@/components/dashboard/GoogleSyncStatus";
import { RefreshCw, Calendar } from "lucide-react";
import { useGoogleData } from "@/hooks/useGoogleData";
import { useGoogleOverviewData } from "@/hooks/useGoogleOverviewData";

interface GoogleTabProps {
  userId: string | null;
  managerId: string | null | undefined;
  customerId: string | null | undefined;
  isConnected: boolean;
  platformsLoaded: boolean;
  headerDateRange?: string;
  headerCustomRange?: DateRange;
}

export const GoogleTab = ({
  userId,
  managerId,
  customerId,
  isConnected,
  platformsLoaded,
  headerDateRange,
  headerCustomRange,
}: GoogleTabProps) => {
  const [dateRange, setDateRange] = useState(headerDateRange || "30days");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(headerCustomRange);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync with header date range when it changes
  useEffect(() => {
    if (headerDateRange) {
      setDateRange(headerDateRange);
    }
  }, [headerDateRange]);

  useEffect(() => {
    if (headerCustomRange) {
      setCustomRange(headerCustomRange);
    }
  }, [headerCustomRange]);

  // Fetch campaigns, ad groups, ads data
  const { campaigns, adGroups, ads, loading, error, refreshAll } =
    useGoogleData(
      userId,
      managerId,
      customerId,
      isConnected,
      platformsLoaded,
      dateRange
    );

  // Fetch overview data with auto-sync
  const { syncing, syncComplete, syncError, checkAndSync } =
    useGoogleOverviewData(
      userId,
      customerId,
      managerId,
      isConnected,
      platformsLoaded,
      dateRange,
      customRange
    );

  const hasData = campaigns.length > 0 || adGroups.length > 0 || ads.length > 0;

  const getDateRangeText = () => {
    const labels: Record<string, string> = {
      today: "Today",
      "7days": "Last 7 Days",
      "30days": "Last 30 Days",
      "90days": "Last 90 Days",
    };
    return labels[dateRange] || "Last 90 Days"; // ✅ Changed default from "Last 30 Days"
  };

  const handleDateRangeChange = (value: string) => {
    console.log("📅 [Google] Date range changed:", value);
    setDateRange(value);
  };

  const handleRefresh = async () => {
    console.log("🔄 [Google] Manual refresh clicked");
    setIsRefreshing(true);
    try {
      await refreshAll();
    } catch (e) {
      console.error("❌ [Google] Refresh failed:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground text-center py-8">
          Google Ads not connected. Connect your account in the Profile page.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-3">
          <svg className="h-6 w-6" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Google Ads Campaigns & Ads</h2>
            <p className="text-sm text-muted-foreground">
              {getDateRangeText()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <Select value={dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={handleRefresh}
            disabled={isRefreshing || !isConnected || syncing}
            variant="outline"
            size="sm"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Sync Status - Shows during initial sync */}
      <GoogleSyncStatus
        syncing={syncing}
        syncComplete={syncComplete}
        syncError={syncError}
        onRetry={checkAndSync}
      />

      {/* Show loading state */}
      {(loading.campaigns || loading.adGroups || loading.ads) && !syncing && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">
            Loading Google Ads data...
          </p>
        </div>
      )}

      {/* Show errors */}
      {(error.campaigns || error.adGroups || error.ads) && !syncing && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 font-semibold">
            Error loading Google Ads data
          </p>
          <p className="text-red-600 text-sm">
            {error.campaigns || error.adGroups || error.ads}
          </p>
        </div>
      )}

      {/* Main Content - Show live data regardless of sync status */}
      {!syncing && (
        <>
          {hasData ? (
            <Tabs defaultValue="campaigns" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="campaigns">
                  Campaigns {campaigns.length > 0 && `(${campaigns.length})`}
                </TabsTrigger>
                <TabsTrigger value="adgroups">
                  Ad Groups {adGroups.length > 0 && `(${adGroups.length})`}
                </TabsTrigger>
                <TabsTrigger value="ads">
                  Ads {ads.length > 0 && `(${ads.length})`}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="campaigns">
                <GoogleCampaignsTable
                  campaigns={campaigns}
                  isLoading={loading.campaigns}
                />
              </TabsContent>

              <TabsContent value="adgroups">
                <GoogleAdGroupsTable
                  adGroups={adGroups}
                  isLoading={loading.adGroups}
                />
              </TabsContent>

              <TabsContent value="ads">
                <GoogleAdsTable ads={ads} isLoading={loading.ads} />
              </TabsContent>
            </Tabs>
          ) : !loading.campaigns &&
            !loading.adGroups &&
            !loading.ads &&
            !error.campaigns &&
            !error.adGroups &&
            !error.ads ? (
            <p className="text-muted-foreground text-center py-8">
              No Google Ads data available. Try refreshing or check your
              account.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
};
