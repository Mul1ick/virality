// FILE: Frontend/src/hooks/useShopifyOverviewData.ts
import { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/api";
import { DateRange } from "react-day-picker";
import { subDays, startOfToday, formatISO, subYears } from "date-fns";

export interface ShopifyDailyChartData {
  date: string;
  totalRevenue: number;
  orderCount: number;
  avgOrderValue: number;
  totalItems?: number;
}

const getDatesFromPreset = (dateRange: string) => {
  const today = startOfToday();
  let startDate: Date;

  switch (dateRange) {
    case "today":
      startDate = today;
      break;
    case "7days":
      startDate = subDays(today, 6);
      break;
    case "90days":
      startDate = subDays(today, 89);
      break;
    case "lifetime":
      startDate = subYears(today, 2);
      break;
    case "30days":
    default:
      startDate = subDays(today, 29);
      break;
  }

  return {
    start_date: formatISO(startDate, { representation: "date" }),
    end_date: formatISO(today, { representation: "date" }),
  };
};

const toNumber = (value: any): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value) || 0;
  return 0;
};

export const useShopifyOverviewData = (
  userId: string | null,
  isConnected: boolean,
  platformsLoaded: boolean,
  dateRange: string,
  customRange?: DateRange
) => {
  const [chartData, setChartData] = useState<ShopifyDailyChartData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchShopifyData = useCallback(async () => {
    // Same guards as Meta hook
    if (!platformsLoaded || !isConnected || !userId) {
      console.log("⏸️ [Shopify] Not ready to fetch");
      return;
    }

    // Don't fetch if custom range is incomplete
    if (dateRange === "custom" && (!customRange?.from || !customRange?.to)) {
      console.log("⏸️ [Shopify] Custom range incomplete");
      setChartData([]);
      return;
    }

    setLoading(true);
    setError(null);

    let dateParams: { start_date: string; end_date: string };

    if (dateRange === "custom" && customRange?.from && customRange?.to) {
      dateParams = {
        start_date: formatISO(customRange.from, { representation: "date" }),
        end_date: formatISO(customRange.to, { representation: "date" }),
      };
    } else {
      dateParams = getDatesFromPreset(dateRange);
    }

    try {
      console.log("📊 [Shopify] Fetching chart data:", dateParams);

      // Call aggregation endpoint - SAME PATTERN AS META
      const response = await apiClient.post(`/aggregate/shopify`, {
        start_date: dateParams.start_date,
        end_date: dateParams.end_date,
        group_by: "date", // Returns array of daily data
      });

      console.log("📊 [Shopify] Raw response:", response.data);

      // Backend should return array when group_by="date"
      const rawData = Array.isArray(response.data) ? response.data : [];

      // Transform and ensure all values are numbers
      const transformedData: ShopifyDailyChartData[] = rawData.map(
        (day: any) => ({
          date: day.date,
          totalRevenue: toNumber(day.totalRevenue),
          orderCount: toNumber(day.orderCount),
          avgOrderValue: toNumber(day.avgOrderValue),
          totalItems: toNumber(day.totalItems),
        })
      );

      console.log(`✅ [Shopify] Got ${transformedData.length} days of data`);
      setChartData(transformedData);
      setError(null);
    } catch (e: any) {
      console.error("❌ [Shopify] Error:", e);
      console.error("❌ [Shopify] Error response:", e.response?.data);

      // More specific error messages
      if (e.response?.status === 404) {
        setError("Shopify connection not found. Please reconnect.");
      } else if (e.response?.status === 500) {
        setError("Server error. Check if daily insights exist in database.");
      } else {
        setError(e.response?.data?.detail || "Failed to fetch Shopify data");
      }

      setChartData([]);
    } finally {
      setLoading(false);
    }
  }, [userId, isConnected, platformsLoaded, dateRange, customRange]);

  // Re-fetch data whenever params change (SAME AS META)
  useEffect(() => {
    fetchShopifyData();
  }, [fetchShopifyData]);

  return {
    chartData,
    loading,
    error,
    refresh: fetchShopifyData,
  };
};
