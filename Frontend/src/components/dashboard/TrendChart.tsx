import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { DailyChartData } from "@/hooks/useOverviewData"; // <-- Import type
import { Skeleton } from "@/components/ui/skeleton"; // <-- Import Skeleton
import { AlertCircle } from "lucide-react"; // <-- Import icon for error
import { useMemo } from "react";



interface TrendChartProps {
  dateRange: string; // Used for the title
  data: DailyChartData[]; // <-- Real data
  isLoading: boolean; // <-- Loading state
  error: string | null; // <-- Error state
}

export const TrendChart = ({ dateRange,
  data,
  isLoading,
  error, }: TrendChartProps) => {
  // Generate data based on selected date range

  // Format currency for tooltip
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Format number for tooltip
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground capitalize">
                {entry.name}:
              </span>
              <span className="font-semibold">
                {entry.name === "Impressions"
                  ? formatNumber(entry.value)
                  : formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Get chart title based on date range
  const getTitle = () => {
    switch (dateRange) {
      case "today":
        return "Today's Performance (Hourly)";
      case "7days":
        return "Last 7 Days Performance";
      case "14days":
        return "Last 14 Days Performance";
      case "30days":
        return "Last 30 Days Performance";
      case "lifetime":
        return "Lifetime Performance";
      default:
        return "Performance Trends";
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">{getTitle()}</h3>
          <p className="text-sm text-muted-foreground">
            Multi-metric analysis over time
          </p>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: "12px" }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: "12px" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            <Line
              type="monotone"
              dataKey="totalSpend"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--chart-2))" }}
              name="Spend"
            />
            <Line
              type="monotone"
              dataKey="totalImpressions"
              stroke="hsl(var(--chart-3))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--chart-3))" }}
              name="Impressions"
              yAxisId="impressions" // <-- Add a separate Y-axis for impressions
            />
            <YAxis
              yAxisId="impressions"
              orientation="right"
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: "12px" }}
              tickFormatter={formatNumber}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
