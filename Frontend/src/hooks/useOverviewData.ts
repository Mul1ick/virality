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
  // Add other aggregated metrics if your backend provides them
}

/**
 * Calculates start and end dates from a preset string.
 * @param dateRange - The preset string (e.g., "7days", "30days").
 * @returns An object with { start_date, end_date } in "YYYY-MM-DD" format.
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
      startDate = subYears(today, 2); // Fetch 2 years of data for "lifetime"
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
  const [chartData, setChartData] = useState<DailyChartData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverviewData = useCallback(async () => {
    // Don't fetch if not connected or still loading platform info
    if (!platformsLoaded || !isConnected || !adAccountId || !userId) {
      return;
    }

    // Don't fetch if custom range is selected but not yet complete
    if (dateRange === "custom" && (!customRange?.from || !customRange?.to)) {
      setChartData([]); // Clear data if custom range is incomplete
      return;
    }

    setLoading(true);
    setError(null);

    let dateParams: { start_date: string; end_date: string };

    if (dateRange === "custom" && customRange?.from && customRange?.to) {
      // Use custom range
      dateParams = {
        start_date: formatISO(customRange.from, { representation: "date" }),
        end_date: formatISO(customRange.to, { representation: "date" }),
      };
    } else {
      // Use preset
      dateParams = getDatesFromPreset(dateRange);
    }

    try {
      console.log("📊 Fetching overview chart data with params:", dateParams);
      // Use the POST endpoint which accepts date ranges and group_by
      const response = await apiClient.post(`/aggregate/meta`, {
        ad_account_id: adAccountId,
        start_date: dateParams.start_date,
        end_date: dateParams.end_date,
        group_by: "date", // <-- This is the key change
      });

      setChartData(response.data || []);
    } catch (e: any) {
      console.error("❌ Overview data error:", e);
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
    fetchOverviewData();
  }, [fetchOverviewData]);

  return { chartData, loading, error, refresh: fetchOverviewData };
};