import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MetaCampaignsTable } from "@/components/dashboard/MetaCampaignsTable";
import { MetaAdSetsTable } from "@/components/dashboard/MetaAdSetsTable";
import { MetaAdsTable } from "@/components/dashboard/MetaAdsTable";
import { Facebook, RefreshCw } from "lucide-react";
import { MetaCampaign, MetaAdSet, MetaAd } from "@/hooks/useMetaData";
import { DateRange } from "react-day-picker";

interface MetaTabProps {
  campaigns: MetaCampaign[];
  adSets: MetaAdSet[];
  ads: MetaAd[];
  loading: {
    campaigns: boolean;
    adSets: boolean;
    ads: boolean;
  };
  isConnected: boolean;
  isRefreshing: boolean;
  onRefresh: () => Promise<void>;
  dateRange: string;
  customRange?: DateRange;
}

export const MetaTab = ({
  campaigns,
  adSets,
  ads,
  loading,
  isConnected,
  isRefreshing,
  onRefresh,
  dateRange,
  customRange,
}: MetaTabProps) => {
  const hasData = campaigns.length > 0 || adSets.length > 0 || ads.length > 0;

  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Facebook className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Meta Campaigns & Ads</h2>
        </div>
        <Button
          onClick={onRefresh}
          disabled={isRefreshing || !isConnected}
          variant="outline"
          size="sm"
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
          />
          {isRefreshing ? "Refreshing..." : "Refresh Data"}
        </Button>
      </div>

      {hasData ? (
        <Tabs defaultValue="campaigns" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="campaigns">
              Campaigns {campaigns.length > 0 && `(${campaigns.length})`}
            </TabsTrigger>
            <TabsTrigger value="adsets">
              Ad Sets {adSets.length > 0 && `(${adSets.length})`}
            </TabsTrigger>
            <TabsTrigger value="ads">
              Ads {ads.length > 0 && `(${ads.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns">
            <MetaCampaignsTable
              campaigns={campaigns}
              isLoading={loading.campaigns}
            />
          </TabsContent>

          <TabsContent value="adsets">
            <MetaAdSetsTable adsets={adSets} isLoading={loading.adSets} />
          </TabsContent>

          <TabsContent value="ads">
            <MetaAdsTable ads={ads} isLoading={loading.ads} />
          </TabsContent>
        </Tabs>
      ) : (
        <p className="text-muted-foreground">
          {isConnected
            ? "No Meta data available. Try refreshing or check your ad account."
            : "Meta not connected. Connect your Meta account in the Profile page."}
        </p>
      )}
    </div>
  );
};
