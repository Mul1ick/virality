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

interface AdSetInsights {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpm: number;
  frequency: number;
  cpc: number;
}

interface AdSet {
  id: string;
  name: string;
  status: string;
  daily_budget: string;
  campaign_id: string;
  insights: AdSetInsights | null;
}

interface MetaAdSetsTableProps {
  adsets: AdSet[];
  isLoading?: boolean;
}

export const MetaAdSetsTable = ({
  adsets,
  isLoading = false,
}: MetaAdSetsTableProps) => {
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format budget (comes in cents from Meta)
  const formatBudget = (budgetCents: string) => {
    return formatCurrency(parseInt(budgetCents) / 100);
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
    }
    return "bg-gray-500/10 text-gray-700 border-gray-500/20";
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
              {adsets.length} ad sets • Last 30 days
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
                <TableHead className="font-semibold text-right">
                  Frequency
                </TableHead>
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
                  {/* Ad Set Name */}
                  <TableCell className="font-medium">{adset.name}</TableCell>

                  {/* Status Badge */}
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle(
                        adset.status
                      )}`}
                    >
                      {formatStatus(adset.status)}
                    </span>
                  </TableCell>

                  {/* Daily Budget */}
                  <TableCell className="text-right font-medium text-muted-foreground">
                    {formatBudget(adset.daily_budget)}
                  </TableCell>

                  {/* Insights Data */}
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
                        {adset.insights.frequency.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(adset.insights.cpm)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(adset.insights.cpc)}
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell
                        colSpan={8}
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
    </Card>
  );
};
