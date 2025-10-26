import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImageIcon } from "lucide-react";

interface Creative {
  id: string;
  name: string;
  objective: string;
  status?: string;
}

interface CreativeGalleryProps {
  campaigns: Creative[];
  isLoading?: boolean;
}

export const CreativeGallery = ({
  campaigns,
  isLoading = false,
}: CreativeGalleryProps) => {
  // Get custom status styling
  const getStatusStyle = (status: string | undefined) => {
    if (!status) {
      return "bg-gray-500/10 text-gray-700 border-gray-500/20";
    }

    const statusUpper = status.toUpperCase();

    if (statusUpper === "ACTIVE" || statusUpper === "ENABLED") {
      return "bg-green-500/10 text-green-700 border-green-500/20 hover:bg-green-500/20";
    } else if (statusUpper === "PAUSED") {
      return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20 hover:bg-yellow-500/20";
    } else if (
      statusUpper === "ARCHIVED" ||
      statusUpper === "DELETED" ||
      statusUpper === "REMOVED"
    ) {
      return "bg-red-500/10 text-red-700 border-red-500/20 hover:bg-red-500/20";
    }
    return "bg-gray-500/10 text-gray-700 border-gray-500/20";
  };

  // Format objective text (remove OUTCOME_ prefix and capitalize)
  const formatObjective = (objective: string) => {
    if (!objective) return "Unknown";

    return objective
      .replace("OUTCOME_", "")
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Format status text
  const formatStatus = (status: string | undefined) => {
    if (!status) return "Unknown";
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

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Creative Performance</h3>
          <p className="text-sm text-muted-foreground">
            View all active campaigns
          </p>
        </div>

        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No campaigns found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((campaign) => (
              <Card
                key={campaign.id}
                className="p-4 hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
              >
                <div className="space-y-3">
                  {/* Campaign Icon Placeholder */}
                  <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-primary/40" />
                  </div>

                  {/* Campaign Details */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]">
                      {campaign.name}
                    </h4>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Status Badge with custom colors */}
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle(
                          campaign.status
                        )}`}
                      >
                        {formatStatus(campaign.status)}
                      </span>

                      {/* Objective Badge */}
                      <Badge variant="outline" className="text-xs">
                        {formatObjective(campaign.objective)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
