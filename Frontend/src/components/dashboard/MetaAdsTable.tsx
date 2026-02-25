// FILE: Frontend/src/components/dashboard/MetaAdsTable.tsx
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
import { Image, Video, FileText, Users } from "lucide-react";
import { MetaAd } from "@/hooks/useMetaData";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { DemographicsModal } from "@/components/modals/DemographicsModal";

interface MetaAdsTableProps {
  ads: MetaAd[];
  isLoading?: boolean;
  dateRange?: string;
  customRange?: DateRange;
}

export const MetaAdsTable = ({
  ads,
  isLoading = false,
  dateRange = "30days",
  customRange,
}: MetaAdsTableProps) => {
  const [selectedAd, setSelectedAd] = useState<{
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

  const getCreativeType = (ad: MetaAd) => {
    if (ad.creative?.image_url) {
      return { type: "image", icon: Image };
    } else if (ad.name.toLowerCase().includes("video")) {
      return { type: "video", icon: Video };
    } else {
      return { type: "text", icon: FileText };
    }
  };

  const truncateText = (text: string, maxLength: number = 60) => {
    if (!text) return "N/A";
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  };

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-slate-700/50 p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading ads...</p>
        </div>
      </Card>
    );
  }

  if (ads.length === 0) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-slate-700/50 p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No ads found. Connect your Meta account to view ads.
          </p>
        </div>
      </Card>
    );
  }

  return (
    // ✅ FIXED: Added relative positioning to prevent z-index issues
    <Card className="bg-card/50 backdrop-blur-sm border-slate-700/50 p-4 sm:p-6 relative">
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Meta Ads</h3>
            <p className="text-sm text-muted-foreground">
              {ads.length} ads • {getDateRangeText()}
            </p>
          </div>
        </div>

        {/* ✅ FIXED: Dark borders + proper overflow handling */}
        <div className="border border-slate-700/50 rounded-lg overflow-hidden">
          <div className="overflow-x-auto relative">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-800/50 border-b border-slate-700/50 hover:bg-slate-800/50">
                  <TableHead className="font-semibold min-w-[200px] text-slate-300">
                    Ad Name
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead className="font-semibold text-slate-300">
                    Creative
                  </TableHead>
                  <TableHead className="font-semibold min-w-[250px] text-slate-300">
                    Ad Body
                  </TableHead>
                  <TableHead className="font-semibold text-slate-300">
                    Status
                  </TableHead>
                  <TableHead className="font-semibold text-right text-slate-300">
                    Spend
                  </TableHead>
                  <TableHead className="font-semibold text-right text-slate-300">
                    Impressions
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
                {ads.map((ad) => {
                  const creativeType = getCreativeType(ad);
                  const CreativeIcon = creativeType.icon;

                  return (
                    <TableRow
                      key={ad.id}
                      className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors"
                    >
                      <TableCell className="font-medium text-foreground">
                        {ad.name}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-primary hover:bg-primary/10"
                          title="View Demographics"
                          onClick={() =>
                            setSelectedAd({ id: ad.id, name: ad.name })
                          }
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CreativeIcon className="h-4 w-4 text-muted-foreground" />
                          {ad.creative?.image_url && (
                            <img
                              src={ad.creative.image_url}
                              alt="Ad creative"
                              className="w-12 h-12 object-cover rounded border border-slate-600"
                            />
                          )}
                          <Badge
                            variant="outline"
                            className="text-xs capitalize border-slate-600 text-slate-300"
                          >
                            {creativeType.type}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="max-w-[250px]">
                          <p className="text-muted-foreground line-clamp-2">
                            {truncateText(ad.creative?.body || "No copy", 80)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle(
                            ad.status
                          )}`}
                        >
                          {formatStatus(ad.status)}
                        </span>
                      </TableCell>
                      {ad.insights ? (
                        <>
                          <TableCell className="text-right font-semibold text-foreground">
                            {formatCurrency(ad.insights.spend)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatNumber(ad.insights.impressions)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatNumber(ad.insights.clicks)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={
                                ad.insights.ctr >= 2
                                  ? "text-green-400 font-semibold"
                                  : "text-muted-foreground"
                              }
                            >
                              {formatPercentage(ad.insights.ctr)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatCurrency(ad.insights.cpm)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatCurrency(ad.insights.cpc)}
                          </TableCell>
                        </>
                      ) : (
                        <TableCell
                          colSpan={6}
                          className="text-center text-muted-foreground text-sm"
                        >
                          No insights available
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-700/50">
          <div>
            <p className="text-xs text-muted-foreground">Total Spend</p>
            <p className="text-lg font-semibold text-foreground">
              {formatCurrency(
                ads.reduce((sum, a) => sum + (a.insights?.spend || 0), 0)
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Impressions</p>
            <p className="text-lg font-semibold text-foreground">
              {formatNumber(
                ads.reduce((sum, a) => sum + (a.insights?.impressions || 0), 0)
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Clicks</p>
            <p className="text-lg font-semibold text-foreground">
              {formatNumber(
                ads.reduce((sum, a) => sum + (a.insights?.clicks || 0), 0)
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Avg. CTR</p>
            <p className="text-lg font-semibold text-foreground">
              {formatPercentage(
                ads.reduce((sum, a) => sum + (a.insights?.ctr || 0), 0) /
                  ads.filter((a) => a.insights).length || 0
              )}
            </p>
          </div>
        </div>
      </div>

      <DemographicsModal
        isOpen={!!selectedAd}
        onClose={() => setSelectedAd(null)}
        level="ad"
        itemId={selectedAd?.id || null}
        itemName={selectedAd?.name || ""}
      />
    </Card>
  );
};
