import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImageIcon, TrendingUp, TrendingDown } from "lucide-react";

interface Creative {
  id: string;
  name: string;
  platform: "Meta" | "Google";
  type: "Image" | "Video" | "Carousel";
  spend: number;
  revenue: number;
  roas: number;
  impressions: number;
  ctr: number;
}

const creatives: Creative[] = [
  {
    id: "1",
    name: "Product Hero Shot A",
    platform: "Meta",
    type: "Image",
    spend: 850,
    revenue: 3400,
    roas: 4.0,
    impressions: 45000,
    ctr: 3.2,
  },
  {
    id: "2",
    name: "Testimonial Video",
    platform: "Meta",
    type: "Video",
    spend: 1200,
    revenue: 3200,
    roas: 2.67,
    impressions: 85000,
    ctr: 2.1,
  },
  {
    id: "3",
    name: "Collection Showcase",
    platform: "Meta",
    type: "Carousel",
    spend: 950,
    revenue: 3800,
    roas: 4.0,
    impressions: 52000,
    ctr: 3.5,
  },
  {
    id: "4",
    name: "Product Features B",
    platform: "Google",
    type: "Image",
    spend: 720,
    revenue: 1850,
    roas: 2.57,
    impressions: 38000,
    ctr: 2.8,
  },
  {
    id: "5",
    name: "Brand Story Video",
    platform: "Meta",
    type: "Video",
    spend: 1450,
    revenue: 5200,
    roas: 3.59,
    impressions: 125000,
    ctr: 2.4,
  },
  {
    id: "6",
    name: "Limited Offer Banner",
    platform: "Google",
    type: "Image",
    spend: 680,
    revenue: 2720,
    roas: 4.0,
    impressions: 32000,
    ctr: 3.8,
  },
];

export const CreativeGallery = () => {
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
          <h3 className="text-lg font-semibold">Creative Performance</h3>
          <p className="text-sm text-muted-foreground">
            Identify top-performing ad creatives
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {creatives.map((creative) => (
            <Card
              key={creative.id}
              className="p-4 hover:border-primary/50 transition-all duration-300 hover:shadow-lg"
            >
              <div className="space-y-3">
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm truncate">{creative.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {creative.type}
                    </Badge>
                    <Badge
                      variant={creative.platform === "Meta" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {creative.platform}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">ROAS</span>
                    <span className="font-semibold flex items-center gap-1">
                      {creative.roas >= 3.5 ? (
                        <TrendingUp className="h-3 w-3 text-success" />
                      ) : creative.roas < 2.8 ? (
                        <TrendingDown className="h-3 w-3 text-destructive" />
                      ) : null}
                      <span className={creative.roas >= 3.5 ? "text-success" : ""}>
                        {creative.roas.toFixed(2)}x
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Revenue</span>
                    <span className="font-semibold">{formatCurrency(creative.revenue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Impressions</span>
                    <span>{formatNumber(creative.impressions)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CTR</span>
                    <span className={creative.ctr >= 3 ? "text-success font-semibold" : ""}>
                      {creative.ctr.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Card>
  );
};
