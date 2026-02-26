// FILE: Frontend/src/components/dashboard/MetaCampaignsTable.tsx
import { Users, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { MetaCampaign } from "@/hooks/useMetaData";
import { DateRange } from "react-day-picker";
import { DemographicsModal } from "@/components/modals/DemographicsModal";
import { useState } from "react";

interface MetaCampaignsTableProps {
  campaigns: MetaCampaign[];
  isLoading?: boolean;
  dateRange?: string;
  customRange?: DateRange;
  onCampaignClick?: (campaignId: string, campaignName: string) => void;
}

export const MetaCampaignsTable = ({
  campaigns,
  isLoading = false,
  dateRange = "30days",
  customRange,
  onCampaignClick,
}: MetaCampaignsTableProps) => {
  const [selectedCampaign, setSelectedCampaign] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const getDateRangeText = () => {
    if (dateRange === "custom" && customRange?.from && customRange?.to) {
      return `${customRange.from.toLocaleDateString()} - ${customRange.to.toLocaleDateString()}`;
    }
    const labels: Record<string, string> = {
      today: "Today",
      "7days": "Last 7 days",
      "30days": "Last 30 days",
      "90days": "Last 90 days",
    };
    return labels[dateRange] || "Last 30 days";
  };

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) return "0";
    return new Intl.NumberFormat("en-US").format(value);
  };

  const formatPercentage = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) return "0.00%";
    return `${value.toFixed(2)}%`;
  };

  const getStatusStyle = (status: string) => {
    const statusUpper = status.toUpperCase();
    if (statusUpper === "ACTIVE") {
      return "bg-green-500/10 text-green-400 border-green-500/30";
    } else if (statusUpper === "PAUSED") {
      return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
    } else if (statusUpper === "ARCHIVED" || statusUpper === "DELETED") {
      return "bg-red-500/10 text-red-400 border-red-500/30";
    }
    return "bg-slate-500/10 text-slate-400 border-slate-500/30";
  };

  const formatObjective = (objective: string) => {
    return objective
      .replace("OUTCOME_", "")
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  const formatStatus = (status: string) => {
    return status.charAt(0) + status.slice(1).toLowerCase();
  };

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-slate-700/50 p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading campaigns...</p>
        </div>
      </Card>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-slate-700/50 p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No campaigns found. Connect your Meta account to view campaigns.
          </p>
        </div>
      </Card>
    );
  }

  // Calculate totals safely
  const totalSpend = campaigns.reduce(
    (sum, c) => sum + (c.insights?.spend || 0),
    0
  );
  const totalImpressions = campaigns.reduce(
    (sum, c) => sum + (c.insights?.impressions || 0),
    0
  );
  const totalClicks = campaigns.reduce(
    (sum, c) => sum + (c.insights?.clicks || 0),
    0
  );
  const campaignsWithInsights = campaigns.filter(
    (c) => c.insights && c.insights.ctr !== undefined
  );
  const avgCTR =
    campaignsWithInsights.length > 0
      ? campaignsWithInsights.reduce(
          (sum, c) => sum + (c.insights?.ctr || 0),
          0
        ) / campaignsWithInsights.length
      : 0;

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-slate-700/50 p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Meta Campaigns
            </h3>
            <p className="text-sm text-muted-foreground">
              {campaigns.length} campaigns • {getDateRangeText()}
            </p>
          </div>
        </div>

        {/* ✅ FIXED: Dark borders, no white borders */}
        <div className="border border-slate-700/50 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-800/50 border-b border-slate-700/50 hover:bg-slate-800/50">
                  <TableHead className="font-semibold min-w-[200px] text-slate-300">
                    Campaign Name
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead className="font-semibold text-slate-300">
                    Status
                  </TableHead>
                  <TableHead className="font-semibold text-slate-300">
                    Objective
                  </TableHead>
                  <TableHead className="font-semibold text-right text-slate-300">
                    Spend
                  </TableHead>
                  <TableHead className="font-semibold text-right text-slate-300">
                    Impressions
                  </TableHead>
                  <TableHead className="font-semibold text-right text-slate-300">
                    Reach
                  </TableHead>
                  <TableHead className="font-semibold text-right text-slate-300">
                    Clicks
                  </TableHead>
                  <TableHead className="font-semibold text-right text-slate-300">
                    CTR
                  </TableHead>
                  <TableHead className="font-semibold text-right text-slate-300">
                    CPM
                  </TableHead>
                  <TableHead className="font-semibold text-right text-slate-300">
                    CPC
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow
                    key={campaign.id}
                    className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors"
                  >
                    <TableCell className="font-medium text-foreground">
                      {onCampaignClick ? (
                        <button
                          onClick={() => onCampaignClick(campaign.id, campaign.name)}
                          className="flex items-center gap-1.5 hover:text-primary transition-colors text-left group"
                        >
                          <span className="group-hover:underline">{campaign.name}</span>
                          <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary shrink-0" />
                        </button>
                      ) : (
                        campaign.name
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-primary hover:bg-primary/10"
                        title="View Demographics"
                        onClick={() =>
                          setSelectedCampaign({
                            id: campaign.id,
                            name: campaign.name,
                          })
                        }
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                    </TableCell>
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
                      <Badge
                        variant="outline"
                        className="text-xs border-slate-600 text-slate-300"
                      >
                        {formatObjective(campaign.objective)}
                      </Badge>
                    </TableCell>
                    {campaign.insights ? (
                      <>
                        <TableCell className="text-right font-semibold text-foreground">
                          {formatCurrency(campaign.insights.spend)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatNumber(campaign.insights.impressions)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatNumber(campaign.insights.reach)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatNumber(campaign.insights.clicks)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              (campaign.insights.ctr || 0) >= 2
                                ? "text-green-400 font-semibold"
                                : "text-muted-foreground"
                            }
                          >
                            {formatPercentage(campaign.insights.ctr)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(campaign.insights.cpm)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(campaign.insights.cpc)}
                        </TableCell>
                      </>
                    ) : (
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground text-sm"
                      >
                        No insights available
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-700/50">
          <div>
            <p className="text-xs text-muted-foreground">Total Spend</p>
            <p className="text-lg font-semibold text-foreground">
              {formatCurrency(totalSpend)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Impressions</p>
            <p className="text-lg font-semibold text-foreground">
              {formatNumber(totalImpressions)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Clicks</p>
            <p className="text-lg font-semibold text-foreground">
              {formatNumber(totalClicks)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Avg. CTR</p>
            <p className="text-lg font-semibold text-foreground">
              {formatPercentage(avgCTR)}
            </p>
          </div>
        </div>
      </div>

      <DemographicsModal
        isOpen={!!selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
        level="campaign"
        itemId={selectedCampaign?.id || null}
        itemName={selectedCampaign?.name || ""}
      />
    </Card>
  );
};
