// FILE: Frontend/src/hooks/useOverviewData.ts
import { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/api";
import { DateRange } from "react-day-picker";
import { subDays, startOfToday, formatISO, subYears } from "date-fns";

// Interface for the data we expect from the backend
export interface DailyChartData {
  date: string;
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
}

/**
 * Calculates start and end dates from a preset string.
 */
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

export const useOverviewData = (
  userId: string | null,
  adAccountId: string | null | undefined,
  isConnected: boolean,
  platformsLoaded: boolean,
  dateRange: string,
  customRange?: DateRange
) => {
  console.log("🔍 useOverviewData called with:", {
    userId,
    adAccountId,
    isConnected,
    platformsLoaded,
    dateRange,
    customRange,
  });

  const [chartData, setChartData] = useState<DailyChartData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverviewData = useCallback(async () => {
    console.log("🔍 fetchOverviewData callback triggered");
    console.log("🔍 Conditions check:", {
      platformsLoaded,
      isConnected,
      adAccountId,
      userId,
      dateRange,
      customRangeComplete: customRange?.from && customRange?.to,
    });

    // Don't fetch if not connected or still loading platform info
    if (!platformsLoaded) {
      console.log("❌ Platforms not loaded yet");
      return;
    }

    if (!isConnected) {
      console.log("❌ Platform not connected");
      return;
    }

    if (!adAccountId) {
      console.log("❌ No ad account ID");
      return;
    }

    if (!userId) {
      console.log("❌ No user ID");
      return;
    }

    // Don't fetch if custom range is selected but not yet complete
    if (dateRange === "custom" && (!customRange?.from || !customRange?.to)) {
      console.log("❌ Custom range incomplete");
      setChartData([]);
      return;
    }

    console.log("✅ All conditions met, fetching data...");
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
      console.log("📊 Fetching overview chart data with params:", {
        ad_account_id: adAccountId,
        ...dateParams,
        group_by: "date",
      });

      const response = await apiClient.post(`/aggregate/meta`, {
        ad_account_id: adAccountId,
        start_date: dateParams.start_date,
        end_date: dateParams.end_date,
        group_by: "date",
      });

      console.log("✅ Response received:", response.data);
      console.log("✅ Data length:", response.data?.length || 0);

      setChartData(response.data || []);
    } catch (e: any) {
      console.error("❌ Overview data error:", e);
      console.error("❌ Error response:", e.response?.data);
      setError(e.response?.data?.detail || "Failed to fetch chart data");
    } finally {
      setLoading(false);
    }
  }, [
    userId,
    adAccountId,
    isConnected,
    platformsLoaded,
    dateRange,
    customRange,
  ]);

  // Re-fetch data whenever params change
  useEffect(() => {
    console.log("🔄 useEffect triggered, calling fetchOverviewData");
    fetchOverviewData();
  }, [fetchOverviewData]);

  return { chartData, loading, error, refresh: fetchOverviewData };
};
