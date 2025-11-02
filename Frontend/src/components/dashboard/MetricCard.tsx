// FILE: Frontend/src/components/dashboard/MetricCard.tsx
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  subtitle?: string;
  prefix?: string;
  suffix?: string;
}

export const MetricCard = ({
  title,
  value,
  change,
  subtitle = "vs. last period",
  prefix = "",
  suffix = "",
}: MetricCardProps) => {
  const formatValue = () => {
    if (typeof value === "number") {
      return value.toLocaleString();
    }
    return value;
  };

  const changeColor = change && change >= 0 ? "text-green-600" : "text-red-600";
  const TrendIcon = change && change >= 0 ? TrendingUp : TrendingDown;

  return (
    <Card className="p-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-3xl font-bold">
            {prefix}
            {formatValue()}
            {suffix}
          </h3>
          {change !== undefined && (
            <div
              className={`flex items-center gap-1 text-sm font-medium ${changeColor}`}
            >
              <TrendIcon className="h-4 w-4" />
              <span>{Math.abs(change).toFixed(1)}</span>
            </div>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </Card>
  );
};
