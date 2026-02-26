// FILE: Frontend/src/components/dashboard/MetaAdSetsTable.tsx
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MetaAdSet } from "@/hooks/useMetaData";
import { DateRange } from "react-day-picker";
import { Users, ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { DemographicsModal } from "@/components/modals/DemographicsModal";

interface MetaAdSetsTableProps {
  adsets: MetaAdSet[];
  isLoading?: boolean;
  dateRange?: string;
  customRange?: DateRange;
  campaignFilter?: { id: string; name: string } | null;
  onClearFilter?: () => void;
}

export const MetaAdSetsTable = ({
  adsets,
  isLoading = false,
  dateRange = "30days",
  customRange,
  campaignFilter,
  onClearFilter,
}: MetaAdSetsTableProps) => {
  const [selectedAdSet, setSelectedAdSet] = useState<{
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatBudget = (budgetCents: string) => {
    return formatCurrency(parseInt(budgetCents) / 100);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getStatusStyle = (status: string) => {
    const statusUpper = status.toUpperCase();
    if (statusUpper === "ACTIVE") {
      return "bg-green-500/10 text-green-400 border-green-500/30";
    } else if (statusUpper === "PAUSED") {
      return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
    }
    return "bg-slate-500/10 text-slate-400 border-slate-500/30";
  };

  const formatStatus = (status: string) => {
    return status.charAt(0) + status.slice(1).toLowerCase();
  };

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-slate-700/50 p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading ad sets...</p>
        </div>
      </Card>
    );
  }

  if (adsets.length === 0) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-slate-700/50 p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No ad sets found. Connect your Meta account to view ad sets.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-slate-700/50 p-6">
      <div className="space-y-4">
        {/* Campaign Filter Banner */}
        {campaignFilter && (
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={onClearFilter}
                className="p-1 rounded hover:bg-blue-500/20 transition-colors shrink-0"
                title="Back to all ad sets"
              >
                <ArrowLeft className="h-4 w-4 text-blue-400" />
              </button>
              <p className="text-sm text-blue-300 truncate">
                Showing ad sets for <span className="font-semibold text-blue-200">{campaignFilter.name}</span>
              </p>
            </div>
            <button
              onClick={onClearFilter}
              className="p-1 rounded hover:bg-blue-500/20 transition-colors shrink-0"
            >
              <X className="h-3.5 w-3.5 text-blue-400" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {campaignFilter ? "Filtered Ad Sets" : "Meta Ad Sets"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {adsets.length} ad set{adsets.length !== 1 ? "s" : ""} • {getDateRangeText()}
            </p>
          </div>
        </div>

        {/* ✅ FIXED: Dark borders */}
        <div className="border border-slate-700/50 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-800/50 border-b border-slate-700/50 hover:bg-slate-800/50">
                  <TableHead className="font-semibold min-w-[200px] text-slate-300">
                    Ad Set Name
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead className="font-semibold text-slate-300">
                    Status
                  </TableHead>
                  <TableHead className="font-semibold text-right text-slate-300">
                    Daily Budget
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
                {adsets.map((adset) => (
                  <TableRow
                    key={adset.id}
                    className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors"
                  >
                    <TableCell className="font-medium text-foreground">
                      {adset.name}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-primary hover:bg-primary/10"
                        title="View Demographics"
                        onClick={() =>
                          setSelectedAdSet({ id: adset.id, name: adset.name })
                        }
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle(
                          adset.status
                        )}`}
                      >
                        {formatStatus(adset.status)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium text-muted-foreground">
                      {formatBudget(adset.daily_budget)}
                    </TableCell>
                    {adset.insights ? (
                      <>
                        <TableCell className="text-right font-semibold text-foreground">
                          {formatCurrency(adset.insights.spend)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatNumber(adset.insights.impressions)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatNumber(adset.insights.reach)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatNumber(adset.insights.clicks)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              adset.insights.ctr >= 2
                                ? "text-green-400 font-semibold"
                                : "text-muted-foreground"
                            }
                          >
                            {formatPercentage(adset.insights.ctr)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(adset.insights.cpm)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(adset.insights.cpc)}
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
            <p className="text-xs text-muted-foreground">Total Budget</p>
            <p className="text-lg font-semibold text-foreground">
              {formatCurrency(
                adsets.reduce(
                  (sum, a) => sum + parseInt(a.daily_budget) / 100,
                  0
                )
              )}
              /day
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Spend</p>
            <p className="text-lg font-semibold text-foreground">
              {formatCurrency(
                adsets.reduce((sum, a) => sum + (a.insights?.spend || 0), 0)
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Clicks</p>
            <p className="text-lg font-semibold text-foreground">
              {formatNumber(
                adsets.reduce((sum, a) => sum + (a.insights?.clicks || 0), 0)
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Avg. CTR</p>
            <p className="text-lg font-semibold text-foreground">
              {formatPercentage(
                adsets.reduce((sum, a) => sum + (a.insights?.ctr || 0), 0) /
                  adsets.filter((a) => a.insights).length || 0
              )}
            </p>
          </div>
        </div>
      </div>

      <DemographicsModal
        isOpen={!!selectedAdSet}
        onClose={() => setSelectedAdSet(null)}
        level="adset"
        itemId={selectedAdSet?.id || null}
        itemName={selectedAdSet?.name || ""}
      />
    </Card>
  );
};
