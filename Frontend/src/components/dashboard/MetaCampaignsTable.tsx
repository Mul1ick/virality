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
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface CampaignInsights {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpm: number;
  cpc: number;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  insights: CampaignInsights | null;
}

interface MetaCampaignsTableProps {
  campaigns: Campaign[];
  isLoading?: boolean;
}

export const MetaCampaignsTable = ({
  campaigns,
  isLoading = false,
}: MetaCampaignsTableProps) => {
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Format large numbers
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  // Get status badge styling
  const getStatusStyle = (status: string) => {
    const statusUpper = status.toUpperCase();
    if (statusUpper === "ACTIVE") {
      return "bg-green-500/10 text-green-700 border-green-500/20";
    } else if (statusUpper === "PAUSED") {
      return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
    } else if (statusUpper === "ARCHIVED" || statusUpper === "DELETED") {
      return "bg-red-500/10 text-red-700 border-red-500/20";
    }
    return "bg-gray-500/10 text-gray-700 border-gray-500/20";
  };

  // Format objective text
  const formatObjective = (objective: string) => {
    return objective
      .replace("OUTCOME_", "")
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Format status text
  const formatStatus = (status: string) => {
    return status.charAt(0) + status.slice(1).toLowerCase();
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
            No campaigns found. Connect your Meta account to view campaigns.
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
            <h3 className="text-lg font-semibold">Meta Campaigns</h3>
            <p className="text-sm text-muted-foreground">
              {campaigns.length} campaigns • Last 30 days
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
                <TableHead className="font-semibold">Objective</TableHead>
                <TableHead className="font-semibold text-right">
                  Spend
                </TableHead>
                <TableHead className="font-semibold text-right">
                  Impressions
                </TableHead>
                <TableHead className="font-semibold text-right">
                  Reach
                </TableHead>
                <TableHead className="font-semibold text-right">
                  Clicks
                </TableHead>
                <TableHead className="font-semibold text-right">CTR</TableHead>
                <TableHead className="font-semibold text-right">CPM</TableHead>
                <TableHead className="font-semibold text-right">CPC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow
                  key={campaign.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  {/* Campaign Name */}
                  <TableCell className="font-medium">{campaign.name}</TableCell>

                  {/* Status Badge */}
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle(
                        campaign.status
                      )}`}
                    >
                      {formatStatus(campaign.status)}
                    </span>
                  </TableCell>

                  {/* Objective */}
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {formatObjective(campaign.objective)}
                    </Badge>
                  </TableCell>

                  {/* Insights Data */}
                  {campaign.insights ? (
                    <>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(campaign.insights.spend)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(campaign.insights.impressions)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(campaign.insights.reach)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(campaign.insights.clicks)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            campaign.insights.ctr >= 2
                              ? "text-green-600 font-semibold"
                              : ""
                          }
                        >
                          {formatPercentage(campaign.insights.ctr)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(campaign.insights.cpm)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(campaign.insights.cpc)}
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground text-sm"
                      >
                        No insights available
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Total Spend</p>
            <p className="text-lg font-semibold">
              {formatCurrency(
                campaigns.reduce((sum, c) => sum + (c.insights?.spend || 0), 0)
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Impressions</p>
            <p className="text-lg font-semibold">
              {formatNumber(
                campaigns.reduce(
                  (sum, c) => sum + (c.insights?.impressions || 0),
                  0
                )
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Clicks</p>
            <p className="text-lg font-semibold">
              {formatNumber(
                campaigns.reduce((sum, c) => sum + (c.insights?.clicks || 0), 0)
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Avg. CTR</p>
            <p className="text-lg font-semibold">
              {formatPercentage(
                campaigns.reduce((sum, c) => sum + (c.insights?.ctr || 0), 0) /
                  campaigns.filter((c) => c.insights).length || 0
              )}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};
