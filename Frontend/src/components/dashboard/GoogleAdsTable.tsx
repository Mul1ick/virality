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

interface GoogleAd {
  id: string;
  name: string;
  status: string;
  ad_group_id: string;
  ad_group_name?: string;
  type?: string;
}

interface GoogleAdsTableProps {
  ads: GoogleAd[];
  isLoading?: boolean;
}

export const GoogleAdsTable = ({
  ads,
  isLoading = false,
}: GoogleAdsTableProps) => {
  // Get status badge styling
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

  // Format status text
  const formatStatus = (status: string) => {
    return status.charAt(0) + status.slice(1).toLowerCase();
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
            No ads found. Connect your Google Ads account to view ads.
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
            <h3 className="text-lg font-semibold">Google Ads</h3>
            <p className="text-sm text-muted-foreground">
              {ads.length} ads across all ad groups
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
                <TableHead className="font-semibold min-w-[200px]">
                  Ad Group
                </TableHead>
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ads.map((ad) => (
                <TableRow
                  key={ad.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  {/* Ad Name */}
                  <TableCell className="font-medium">{ad.name}</TableCell>

                  {/* Ad Group Name */}
                  <TableCell className="text-muted-foreground">
                    {ad.ad_group_name || "N/A"}
                  </TableCell>

                  {/* Ad Type */}
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {ad.type || "Standard"}
                    </Badge>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Total Ads</p>
            <p className="text-lg font-semibold">{ads.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Enabled</p>
            <p className="text-lg font-semibold text-green-600">
              {ads.filter((ad) => ad.status.toUpperCase() === "ENABLED").length}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Paused</p>
            <p className="text-lg font-semibold text-yellow-600">
              {ads.filter((ad) => ad.status.toUpperCase() === "PAUSED").length}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};
