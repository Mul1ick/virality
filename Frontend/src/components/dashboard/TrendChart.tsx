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
import { useMemo } from "react";

interface DateRangeSelectorProps {
  dateRange: string;
}

export const TrendChart = ({ dateRange }: DateRangeSelectorProps) => {
  // Generate data based on selected date range
  const chartData = useMemo(() => {
    const today = new Date();
    const data = [];

    let daysToShow = 30; // default
    let dataPoints = 10; // number of points on chart

    switch (dateRange) {
      case "today":
        daysToShow = 1;
        dataPoints = 24; // hourly data for today
        break;
      case "7days":
        daysToShow = 7;
        dataPoints = 7;
        break;
      case "30days":
        daysToShow = 30;
        dataPoints = 10;
        break;
      case "90days":
        daysToShow = 90;
        dataPoints = 12;
        break;
      case "lifetime":
        daysToShow = 180;
        dataPoints = 18;
        break;
      default:
        daysToShow = 30;
        dataPoints = 7;
    }

    // Generate sample data points
    if (dateRange === "today") {
      // Hourly data for today
      for (let i = 0; i < 24; i++) {
        const hour = i;
        const spend = Math.floor(Math.random() * 200) + 100;
        const revenue = spend * (Math.random() * 1.5 + 1.5); // ROAS between 1.5-3
        const impressions = Math.floor(Math.random() * 5000) + 3000;

        data.push({
          date: `${hour}:00`,
          spend: Math.round(spend),
          revenue: Math.round(revenue),
          impressions: impressions,
        });
      }
    } else {
      // Daily data
      const interval = Math.floor(daysToShow / dataPoints);

      for (let i = dataPoints - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i * interval);

        const baseSpend = 4000 + Math.random() * 2000;
        const spend = Math.floor(baseSpend);
        const revenue = Math.floor(spend * (Math.random() * 1 + 2)); // ROAS 2-3x
        const impressions = Math.floor(Math.random() * 50000) + 100000;

        data.push({
          date: date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          spend: spend,
          revenue: revenue,
          impressions: impressions,
        });
      }
    }

    return data;
  }, [dateRange]);

  // Format currency for tooltip
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
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
                {entry.name === "impressions"
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
          <LineChart data={chartData}>
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
              dataKey="revenue"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--chart-1))" }}
              name="Revenue"
            />
            <Line
              type="monotone"
              dataKey="spend"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--chart-2))" }}
              name="Spend"
            />
            <Line
              type="monotone"
              dataKey="impressions"
              stroke="hsl(var(--chart-3))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--chart-3))" }}
              name="Impressions"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
