// FILE: Frontend/src/components/dashboard/MetricCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  suffix?: string;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: LucideIcon;
  iconColor?: "cyan" | "teal" | "purple" | "green" | "orange";
  loading?: boolean;
}

export const MetricCard = ({
  title,
  value,
  suffix = "",
  subtitle,
  trend,
  icon: Icon,
  iconColor = "cyan",
  loading = false,
}: MetricCardProps) => {
  // Icon color classes
  const iconColorClasses = {
    cyan: "metric-icon-cyan",
    teal: "metric-icon-teal",
    purple: "metric-icon-purple",
    green: "metric-icon-green",
    orange: "metric-icon-orange",
  };

  if (loading) {
    return (
      <Card className="bg-card border-border/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {Icon && (
            <div
              className={cn(
                "p-2 rounded-lg animate-pulse",
                iconColorClasses[iconColor]
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="h-8 w-24 bg-muted animate-pulse rounded mb-2"></div>
          <div className="h-4 w-32 bg-muted/50 animate-pulse rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group bg-card border-border/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 glow-border overflow-hidden relative cursor-pointer">
      {/* Subtle animated gradient background on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 animated-gradient"></div>
      </div>

      <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
        <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground/80 transition-colors">
          {title}
        </CardTitle>
        {Icon && (
          <div
            className={cn(
              "p-2 rounded-lg transition-all duration-300 group-hover:scale-110",
              iconColorClasses[iconColor]
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </CardHeader>

      <CardContent className="relative z-10">
        <div className="flex items-baseline gap-1">
          <div className="text-3xl font-bold text-foreground tracking-tight">
            {value}
          </div>
          {suffix && (
            <span className="text-xl font-semibold text-muted-foreground">
              {suffix}
            </span>
          )}
        </div>

        {(trend || subtitle) && (
          <div className="flex items-center gap-2 mt-2">
            {trend && (
              <div
                className={cn(
                  "flex items-center gap-1 text-sm font-medium",
                  trend.isPositive ? "text-green-500" : "text-red-500"
                )}
              >
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>
                  {trend.isPositive ? "+" : ""}
                  {trend.value}%
                </span>
              </div>
            )}
            {subtitle && (
              <p
                className={cn(
                  "text-sm",
                  trend ? "text-muted-foreground" : "text-muted-foreground/70"
                )}
              >
                {subtitle}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
