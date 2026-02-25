import React, { useState, useEffect } from "react";
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
import axios from "axios";
import apiClient from "@/lib/api";
import { useIsMobile } from "@/hooks/use-mobile";

interface ChartDataPoint {
  date: string;
  clicks: number;
  impressions: number;
  spend: string;
  conversions: string;
  ctr: string;
  cpc: string;
}

interface GoogleTrendChartProps {
  customerId: string;
  userId: string;
}

const GoogleTrendChart: React.FC<GoogleTrendChartProps> = ({
  customerId,
  userId,
}) => {
  const isMobile = useIsMobile();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrendData();
  }, [customerId]);

  const fetchTrendData = async (): Promise<void> => {
    try {
      setLoading(true);

      // Calculate dates
      const endDate = new Date().toISOString().split("T")[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      // Call aggregation endpoint with date grouping
      const response = await apiClient.post(
        `/aggregate/google`, // ✅ Correct path
        {
          start_date: startDate,
          end_date: endDate,
          ad_account_id: customerId,
          group_by: "date",
        }
      );

      // Transform data for chart
      const transformed: ChartDataPoint[] = response.data.map((item: any) => ({
        date: item.date,
        clicks: parseInt(item.totalClicks || 0),
        impressions: parseInt(item.totalImpressions || 0),
        spend: parseFloat(item.totalSpend || 0).toFixed(2),
        conversions: parseFloat(item.totalConversions || 0).toFixed(1),
        ctr: parseFloat(item.avgCTR || 0).toFixed(2),
        cpc: parseFloat(item.avgCPC || 0).toFixed(2),
      }));

      // Sort by date
      transformed.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      setChartData(transformed);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching trend data:", err);
      setError(err.response?.data?.detail || "Failed to load trend data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg">
        <p className="font-bold">Error</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-3 rounded-lg">
        <p className="text-sm">No trend data available for the last 30 days.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-foreground">Google Ads Performance Trends</h3>
        <p className="text-muted-foreground text-sm">Last 30 days</p>
      </div>

      <ResponsiveContainer width="100%" height={isMobile ? 250 : 400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />

          <Line
            yAxisId="left"
            type="monotone"
            dataKey="clicks"
            stroke="#8884d8"
            name="Clicks"
            strokeWidth={2}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="impressions"
            stroke="#82ca9d"
            name="Impressions"
            strokeWidth={2}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="spend"
            stroke="#ff7300"
            name="Spend ($)"
            strokeWidth={2}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="conversions"
            stroke="#ff0000"
            name="Conversions"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6">
        <div className="bg-blue-500/10 border border-blue-500/20 p-3 sm:p-4 rounded-lg">
          <p className="text-xs sm:text-sm text-muted-foreground">Total Clicks</p>
          <p className="text-lg sm:text-2xl font-bold text-blue-400">
            {chartData.reduce((sum, d) => sum + d.clicks, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 p-3 sm:p-4 rounded-lg">
          <p className="text-xs sm:text-sm text-muted-foreground">Total Impressions</p>
          <p className="text-lg sm:text-2xl font-bold text-green-400">
            {chartData
              .reduce((sum, d) => sum + d.impressions, 0)
              .toLocaleString()}
          </p>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/20 p-3 sm:p-4 rounded-lg">
          <p className="text-xs sm:text-sm text-muted-foreground">Total Spend</p>
          <p className="text-lg sm:text-2xl font-bold text-orange-400">
            $
            {chartData
              .reduce((sum, d) => sum + parseFloat(d.spend), 0)
              .toFixed(2)}
          </p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 p-3 sm:p-4 rounded-lg">
          <p className="text-xs sm:text-sm text-muted-foreground">Total Conversions</p>
          <p className="text-lg sm:text-2xl font-bold text-red-400">
            {chartData
              .reduce((sum, d) => sum + parseFloat(d.conversions), 0)
              .toFixed(1)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default GoogleTrendChart;
