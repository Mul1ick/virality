import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  change: number;
  changeLabel: string;
  format?: "currency" | "percentage" | "number";
}

export const KPICard = ({ title, value, change, changeLabel, format = "currency" }: KPICardProps) => {
  const isPositive = change > 0;
  const isNeutral = change === 0;
  
  const getChangeColor = () => {
    if (isNeutral) return "text-muted-foreground";
    return isPositive ? "text-success" : "text-destructive";
  };

  const getChangeIcon = () => {
    if (isNeutral) return <Minus className="h-4 w-4" />;
    return isPositive ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  return (
    <Card className="p-6 hover:border-primary/50 transition-all duration-300">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="flex items-baseline justify-between">
          <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
          <div className={`flex items-center gap-1 text-sm font-medium ${getChangeColor()}`}>
            {getChangeIcon()}
            <span>{Math.abs(change)}{format === "percentage" ? "%" : ""}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{changeLabel}</p>
      </div>
    </Card>
  );
};
