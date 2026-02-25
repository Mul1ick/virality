// FILE: Frontend/src/components/dashboard/TrendChart.tsx
import { Card } from "@/components/ui/card";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  Line,
  ComposedChart,
} from "recharts";
import { DailyChartData } from "@/hooks/useOverviewData";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface TrendChartProps {
  dateRange: string;
  data: DailyChartData[];
  isLoading: boolean;
  error: string | null;
  platform: "google" | "meta" | "shopify";
}

export const TrendChart = ({
  dateRange,
  data,
  isLoading,
  error,
  platform,
}: TrendChartProps) => {
  const isMobile = useIsMobile();

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format number
  const formatNumber = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return Math.round(value).toString();
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.toLocaleDateString("en-US", { month: "short" });
    const day = date.getDate();
    return `${month} ${day}`;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-lg p-3 shadow-2xl">
          <p className="font-semibold text-xs mb-2 text-slate-300">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between gap-4 text-xs"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-slate-400">{entry.name}</span>
                </div>
                <span className="font-semibold text-slate-200">
                  {entry.dataKey === "totalSpend"
                    ? formatCurrency(entry.value)
                    : formatNumber(entry.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // Get chart title
  const getTitle = () => {
    switch (dateRange) {
      case "today":
        return `Performance Overview`;
      case "7days":
        return `Last 7 days`;
      case "14days":
        return `Last 14 days`;
      case "30days":
        return `Last 30 days`;
      case "90days":
        return `Last 90 days`;
      case "lifetime":
        return `Lifetime`;
      default:
        return `Performance`;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-slate-700/50 p-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-48 mb-2 bg-slate-700/50" />
          <Skeleton className="h-[350px] w-full bg-slate-700/50" />
        </div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="bg-destructive/10 border-destructive/50 backdrop-blur-sm p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
          <div>
            <p className="text-destructive font-semibold">
              Error loading chart
            </p>
            <p className="text-destructive/80 text-sm mt-1">{error}</p>
          </div>
        </div>
      </Card>
    );
  }

  // No data state
  if (!data || data.length === 0) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-slate-700/50 p-6">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-semibold mb-2 text-foreground">
            No Data Available
          </p>
          <p className="text-sm text-muted-foreground">
            No chart data found for the selected date range
          </p>
        </div>
      </Card>
    );
  }

  // Format data
  const formattedData = data.map((item) => ({
    ...item,
    displayDate: formatDate(item.date),
  }));

  // Calculate totals
  const totalSpend = data.reduce((sum, d) => sum + (d.totalSpend || 0), 0);
  const totalImpressions = data.reduce(
    (sum, d) => sum + (d.totalImpressions || 0),
    0
  );
  const avgDailySpend = totalSpend / data.length;

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-slate-700/50 p-6">
      <div className="space-y-6">
        {/* Header with Legend */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xl font-bold text-foreground">{getTitle()}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data.length} data points
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
              <span className="text-xs text-slate-300">Spend</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-400"></div>
              <span className="text-xs text-slate-300">Impressions</span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={isMobile ? 220 : 320}>
          <ComposedChart data={formattedData}>
            <defs>
              <linearGradient
                id={`spend-gradient-${platform}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148, 163, 184, 0.06)"
              vertical={false}
            />

            {/* X Axis */}
            <XAxis
              dataKey="displayDate"
              stroke="#64748b"
              style={{ fontSize: "11px" }}
              tick={{ fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
            />

            {/* Left Y Axis - Spend */}
            <YAxis
              yAxisId="spend"
              stroke="#22d3ee"
              style={{ fontSize: "11px" }}
              tick={{ fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => {
                if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`;
                return `₹${value}`;
              }}
            />

            {/* Right Y Axis - Impressions */}
            <YAxis
              yAxisId="impressions"
              orientation="right"
              stroke="#a855f7"
              style={{ fontSize: "11px" }}
              tick={{ fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatNumber}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: "#334155", strokeWidth: 1 }}
            />

            {/* Spend - Area Chart (Primary) */}
            <Area
              yAxisId="spend"
              type="monotone"
              dataKey="totalSpend"
              stroke="#22d3ee"
              strokeWidth={2.5}
              fill={`url(#spend-gradient-${platform})`}
              name="Spend"
            />

            {/* Impressions - Line Chart (Secondary) */}
            <Line
              yAxisId="impressions"
              type="monotone"
              dataKey="totalImpressions"
              stroke="#a855f7"
              strokeWidth={2}
              dot={false}
              name="Impressions"
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-700/30">
          <div>
            <p className="text-[11px] sm:text-[10px] text-muted-foreground uppercase tracking-wide">
              Total Spend
            </p>
            <p className="text-lg font-bold text-foreground mt-1">
              {formatCurrency(totalSpend)}
            </p>
          </div>
          <div>
            <p className="text-[11px] sm:text-[10px] text-muted-foreground uppercase tracking-wide">
              Avg Daily
            </p>
            <p className="text-lg font-bold text-foreground mt-1">
              {formatCurrency(avgDailySpend)}
            </p>
          </div>
          <div>
            <p className="text-[11px] sm:text-[10px] text-muted-foreground uppercase tracking-wide">
              Impressions
            </p>
            <p className="text-lg font-bold text-foreground mt-1">
              {formatNumber(totalImpressions)}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};
