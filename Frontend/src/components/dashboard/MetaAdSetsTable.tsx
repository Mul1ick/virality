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
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { DemographicsModal } from "@/components/modals/DemographicsModal";

interface MetaAdSetsTableProps {
  adsets: MetaAdSet[];
  isLoading?: boolean;
  dateRange?: string;
  customRange?: DateRange;
}

export const MetaAdSetsTable = ({
  adsets,
  isLoading = false,
  dateRange = "30days",
  customRange,
}: MetaAdSetsTableProps) => {
  const [selectedAdSet, setSelectedAdSet] = useState<{id: string, name: string} | null>(null);
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
      return "bg-green-500/10 text-green-700 border-green-500/20";
    } else if (statusUpper === "PAUSED") {
      return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
    }
    return "bg-gray-500/10 text-gray-700 border-gray-500/20";
  };

  const formatStatus = (status: string) => {
    return status.charAt(0) + status.slice(1).toLowerCase();
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading ad sets...</p>
        </div>
      </Card>
    );
  }

  if (adsets.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No ad sets found. Connect your Meta account to view ad sets.
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
            <h3 className="text-lg font-semibold">Meta Ad Sets</h3>
            <p className="text-sm text-muted-foreground">
              {adsets.length} ad sets • {getDateRangeText()}
            </p>
          </div>
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold min-w-[200px]">
                  Ad Set Name
                </TableHead>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">
                  Daily Budget
                </TableHead>
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
              {adsets.map((adset) => (
                <TableRow
                  key={adset.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="font-medium">{adset.name}</TableCell>
                  <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 hover:text-primary hover:bg-primary/10"
                        title="View Demographics"
                        onClick={() => setSelectedAdSet({ id: adset.id, name: adset.name })}
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
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(adset.insights.spend)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(adset.insights.impressions)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(adset.insights.reach)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(adset.insights.clicks)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            adset.insights.ctr >= 2
                              ? "text-green-600 font-semibold"
                              : ""
                          }
                        >
                          {formatPercentage(adset.insights.ctr)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(adset.insights.cpm)}
                      </TableCell>
                      <TableCell className="text-right">
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Total Budget</p>
            <p className="text-lg font-semibold">
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
            <p className="text-lg font-semibold">
              {formatCurrency(
                adsets.reduce((sum, a) => sum + (a.insights?.spend || 0), 0)
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Clicks</p>
            <p className="text-lg font-semibold">
              {formatNumber(
                adsets.reduce((sum, a) => sum + (a.insights?.clicks || 0), 0)
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Avg. CTR</p>
            <p className="text-lg font-semibold">
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
        level="adset" // <-- Important: set level to adset
        itemId={selectedAdSet?.id || null}
        itemName={selectedAdSet?.name || ""}
      />
    </Card>
  );
};
