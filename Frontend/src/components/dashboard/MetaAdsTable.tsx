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
import { Image, Video, FileText } from "lucide-react";

interface AdInsights {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpm: number;
  frequency: number;
  cpc: number;
}

interface AdCreative {
  image_url?: string;
  body?: string;
  id: string;
}

interface Ad {
  id: string;
  name: string;
  status: string;
  adset_id: string;
  creative: AdCreative;
  insights: AdInsights | null;
}

interface MetaAdsTableProps {
  ads: Ad[];
  isLoading?: boolean;
}

export const MetaAdsTable = ({ ads, isLoading = false }: MetaAdsTableProps) => {
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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
    }
    return "bg-gray-500/10 text-gray-700 border-gray-500/20";
  };

  // Format status text
  const formatStatus = (status: string) => {
    return status.charAt(0) + status.slice(1).toLowerCase();
  };

  // Detect creative type
  const getCreativeType = (ad: Ad) => {
    if (ad.creative.image_url) {
      return { type: "image", icon: Image };
    } else if (ad.name.toLowerCase().includes("video")) {
      return { type: "video", icon: Video };
    } else {
      return { type: "text", icon: FileText };
    }
  };

  // Truncate text
  const truncateText = (text: string, maxLength: number = 60) => {
    if (!text) return "N/A";
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading ads...</p>
        </div>
      </Card>
    );
  }

  if (ads.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No ads found. Connect your Meta account to view ads.
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
            <h3 className="text-lg font-semibold">Meta Ads</h3>
            <p className="text-sm text-muted-foreground">
              {ads.length} ads • Last 30 days
            </p>
          </div>
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold min-w-[200px]">
                  Ad Name
                </TableHead>
                <TableHead className="font-semibold">Creative</TableHead>
                <TableHead className="font-semibold min-w-[250px]">
                  Ad Body
                </TableHead>
                <TableHead className="font-semibold">Status</TableHead>
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
                {/* <TableHead className="font-semibold text-right">
                  Frequency
                </TableHead> */}
                <TableHead className="font-semibold text-right">CPM</TableHead>
                <TableHead className="font-semibold text-right">CPC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ads.map((ad) => {
                const creativeType = getCreativeType(ad);
                const CreativeIcon = creativeType.icon;

                return (
                  <TableRow
                    key={ad.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    {/* Ad Name */}
                    <TableCell className="font-medium">{ad.name}</TableCell>

                    {/* Creative Type */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CreativeIcon className="h-4 w-4 text-muted-foreground" />
                        {ad.creative.image_url && (
                          <img
                            src={ad.creative.image_url}
                            alt="Ad creative"
                            className="w-12 h-12 object-cover rounded border"
                          />
                        )}
                        <Badge variant="outline" className="text-xs capitalize">
                          {creativeType.type}
                        </Badge>
                      </div>
                    </TableCell>

                    {/* Ad Copy */}
                    <TableCell className="text-sm">
                      <div className="max-w-[250px]">
                        <p className="text-muted-foreground line-clamp-2">
                          {truncateText(ad.creative.body || "No copy", 80)}
                        </p>
                      </div>
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle(
                          ad.status
                        )}`}
                      >
                        {formatStatus(ad.status)}
                      </span>
                    </TableCell>

                    {/* Insights Data */}
                    {ad.insights ? (
                      <>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(ad.insights.spend)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(ad.insights.impressions)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(ad.insights.clicks)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              ad.insights.ctr >= 2
                                ? "text-green-600 font-semibold"
                                : ""
                            }
                          >
                            {formatPercentage(ad.insights.ctr)}
                          </span>
                        </TableCell>
                        {/* <TableCell className="text-right">
                          {ad.insights.frequency.toFixed(2)}
                        </TableCell> */}
                        <TableCell className="text-right">
                          {formatCurrency(ad.insights.cpm)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(ad.insights.cpc)}
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
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Total Spend</p>
            <p className="text-lg font-semibold">
              {formatCurrency(
                ads.reduce((sum, a) => sum + (a.insights?.spend || 0), 0)
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Impressions</p>
            <p className="text-lg font-semibold">
              {formatNumber(
                ads.reduce((sum, a) => sum + (a.insights?.impressions || 0), 0)
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Clicks</p>
            <p className="text-lg font-semibold">
              {formatNumber(
                ads.reduce((sum, a) => sum + (a.insights?.clicks || 0), 0)
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Avg. CTR</p>
            <p className="text-lg font-semibold">
              {formatPercentage(
                ads.reduce((sum, a) => sum + (a.insights?.ctr || 0), 0) /
                  ads.filter((a) => a.insights).length || 0
              )}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};
