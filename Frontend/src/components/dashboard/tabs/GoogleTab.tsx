import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CreativeGallery } from "@/components/dashboard/CreativeGallery";
import { RefreshCw } from "lucide-react";
import { DateRange } from "react-day-picker";

interface GoogleCampaign {
  id: string;
  name: string;
  objective: string;
  status?: string;
}

interface GoogleTabProps {
  campaigns: GoogleCampaign[];
  loading: {
    campaigns: boolean;
  };
  isConnected: boolean;
  isRefreshing: boolean;
  onRefresh: () => Promise<void>;
  dateRange: string;
  customRange?: DateRange;
}

export const GoogleTab = ({
  campaigns,
  loading,
  isConnected,
  isRefreshing,
  onRefresh,
  dateRange,
  customRange,
}: GoogleTabProps) => {
  const hasData = campaigns.length > 0;

  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="flex items-center justify-between mb-6">
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
          <h2 className="text-2xl font-bold">Google Ads Campaigns</h2>
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
          </TabsList>

          <TabsContent value="campaigns">
            <CreativeGallery
              campaigns={campaigns}
              isLoading={loading.campaigns}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <p className="text-muted-foreground">
          {isConnected
            ? "No Google Ads data available. Try refreshing or check your ad account."
            : "Google Ads not connected. Connect your Google Ads account in the Profile page."}
        </p>
      )}
    </div>
  );
};
