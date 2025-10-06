import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Campaign {
  id: string;
  name: string;
  platform: "Meta" | "Google";
  spend: number;
  revenue: number;
  roas: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

const campaigns: Campaign[] = [
  {
    id: "1",
    name: "Summer Sale - Retargeting",
    platform: "Meta",
    spend: 2400,
    revenue: 7200,
    roas: 3.0,
    impressions: 125000,
    clicks: 3200,
    conversions: 145,
  },
  {
    id: "2",
    name: "Search - Brand Keywords",
    platform: "Google",
    spend: 1800,
    revenue: 5400,
    roas: 3.0,
    impressions: 85000,
    clicks: 2100,
    conversions: 98,
  },
  {
    id: "3",
    name: "Product Launch - Prospecting",
    platform: "Meta",
    spend: 3200,
    revenue: 8900,
    roas: 2.78,
    impressions: 185000,
    clicks: 4200,
    conversions: 172,
  },
  {
    id: "4",
    name: "Shopping - Product Feed",
    platform: "Google",
    spend: 2100,
    revenue: 6800,
    roas: 3.24,
    impressions: 95000,
    clicks: 2800,
    conversions: 124,
  },
  {
    id: "5",
    name: "Video Engagement Campaign",
    platform: "Meta",
    spend: 1500,
    revenue: 3200,
    roas: 2.13,
    impressions: 220000,
    clicks: 1800,
    conversions: 65,
  },
];

type SortField = keyof Campaign;

export const CampaignTable = () => {
  const [sortField, setSortField] = useState<SortField>("spend");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedPlatform, setSelectedPlatform] = useState<
    "All" | "Google" | "Meta"
  >("All");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedCampaigns = [...campaigns].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortDirection === "asc"
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Campaign Performance</h3>
          <p className="text-sm text-muted-foreground">
            Detailed metrics across all platforms
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedPlatform === "All" ? "default" : "outline"}
            onClick={() => setSelectedPlatform("All")}
          >
            All
          </Button>
          <Button
            variant={selectedPlatform === "Meta" ? "default" : "outline"}
            onClick={() => setSelectedPlatform("Meta")}
          >
            Meta
          </Button>
          <Button
            variant={selectedPlatform === "Google" ? "default" : "outline"}
            onClick={() => setSelectedPlatform("Google")}
          >
            Google
          </Button>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Campaign</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("spend")}
                    className="h-8 p-0 hover:bg-transparent"
                  >
                    Spend
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("revenue")}
                    className="h-8 p-0 hover:bg-transparent"
                  >
                    Revenue
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("roas")}
                    className="h-8 p-0 hover:bg-transparent"
                  >
                    ROAS
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("impressions")}
                    className="h-8 p-0 hover:bg-transparent"
                  >
                    Impressions
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort("conversions")}
                    className="h-8 p-0 hover:bg-transparent"
                  >
                    Conversions
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCampaigns
                .filter(
                  (campaign) =>
                    selectedPlatform === "All" ||
                    campaign.platform == selectedPlatform
                )
                .map((campaign) => (
                  <TableRow key={campaign.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      {campaign.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          campaign.platform === "Meta" ? "default" : "secondary"
                        }
                      >
                        {campaign.platform}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(campaign.spend)}</TableCell>
                    <TableCell className="font-semibold text-success">
                      {formatCurrency(campaign.revenue)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          campaign.roas >= 3 ? "text-success font-semibold" : ""
                        }
                      >
                        {campaign.roas.toFixed(2)}x
                      </span>
                    </TableCell>
                    <TableCell>{formatNumber(campaign.impressions)}</TableCell>
                    <TableCell>{formatNumber(campaign.conversions)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Card>
  );
};
