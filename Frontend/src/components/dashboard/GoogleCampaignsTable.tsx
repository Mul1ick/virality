// FILE: GoogleCampaignsTable.tsx - CORRECT VERSION
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GoogleCampaign } from "@/hooks/useGoogleData";

interface GoogleCampaignsTableProps {
  campaigns: GoogleCampaign[];
  isLoading?: boolean;
}

export const GoogleCampaignsTable = ({
  campaigns,
  isLoading = false,
}: GoogleCampaignsTableProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getStatusStyle = (status: string) => {
    const statusUpper = status.toUpperCase();
    if (statusUpper === "ENABLED" || statusUpper === "ACTIVE") {
      return "bg-green-500/10 text-green-700 border-green-500/20";
    } else if (statusUpper === "PAUSED") {
      return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
    } else if (statusUpper === "REMOVED") {
      return "bg-red-500/10 text-red-700 border-red-500/20";
    }
    return "bg-gray-500/10 text-gray-700 border-gray-500/20";
  };

  const formatStatus = (status: string) => {
    return status.charAt(0) + status.slice(1).toLowerCase();
  };

  const formatObjective = (objective: string) => {
    return objective
      .replace("SEARCH", "Search")
      .replace("DISPLAY", "Display")
      .replace("SHOPPING", "Shopping")
      .replace("VIDEO", "Video")
      .replace("_", " ");
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading campaigns...</p>
        </div>
      </Card>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No campaigns with data available.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Google Ads Campaigns</h3>
            <p className="text-sm text-muted-foreground">
              {campaigns.length} campaigns with recent data
            </p>
          </div>
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold min-w-[200px]">
                  Campaign Name
                </TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="font-semibold text-right">
                  Spend
                </TableHead>
                <TableHead className="font-semibold text-right">
                  Impressions
                </TableHead>
                <TableHead className="font-semibold text-right">
                  Clicks
                </TableHead>
                <TableHead className="font-semibold text-right">CTR</TableHead>
                <TableHead className="font-semibold text-right">CPC</TableHead>
                <TableHead className="font-semibold text-right">CPM</TableHead>
                <TableHead className="font-semibold text-right">
                  Conversions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow
                  key={campaign.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle(
                        campaign.status
                      )}`}
                    >
                      {formatStatus(campaign.status)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {formatObjective(campaign.advertising_channel_type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(campaign.spend || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(campaign.impressions || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(campaign.clicks || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        (campaign.ctr || 0) >= 2
                          ? "text-green-600 font-semibold"
                          : ""
                      }
                    >
                      {formatPercentage(campaign.ctr || 0)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(campaign.cpc || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(campaign.cpm || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {(campaign.conversions || 0).toFixed(1)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Total Spend</p>
            <p className="text-lg font-semibold">
              {formatCurrency(
                campaigns.reduce((sum, c) => sum + (c.spend || 0), 0)
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Clicks</p>
            <p className="text-lg font-semibold">
              {formatNumber(
                campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0)
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Conversions</p>
            <p className="text-lg font-semibold">
              {campaigns
                .reduce((sum, c) => sum + (c.conversions || 0), 0)
                .toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Avg. CTR</p>
            <p className="text-lg font-semibold">
              {formatPercentage(
                campaigns.reduce((sum, c) => sum + (c.ctr || 0), 0) /
                  (campaigns.length || 1)
              )}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};
