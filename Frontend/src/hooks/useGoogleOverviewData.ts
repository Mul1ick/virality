// FILE: Frontend/src/hooks/useGoogleOverviewData.ts
import { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/api";
import { DateRange } from "react-day-picker";
import { subDays, startOfToday, formatISO } from "date-fns";

export interface GoogleAggregatedData {
  totalSpend: number;
  totalClicks: number;
  totalImpressions: number;
  totalConversions: number;
  avgCTR: number;
  avgCPC: number;
  avgCPM: number;
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

export const useGoogleOverviewData = (
  userId: string | null,
  customerId: string | null | undefined,
  isConnected: boolean,
  platformsLoaded: boolean,
  dateRange: string,
  customRange?: DateRange
) => {
  const [aggregatedData, setAggregatedData] = useState<GoogleAggregatedData>({
    totalSpend: 0,
    totalClicks: 0,
    totalImpressions: 0,
    totalConversions: 0,
    avgCTR: 0,
    avgCPC: 0,
    avgCPM: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGoogleData = useCallback(async () => {
    if (!platformsLoaded || !isConnected || !customerId || !userId) {
      console.log("⏸️ [Google Overview] Skipping fetch");
      return;
    }

    if (dateRange === "custom" && (!customRange?.from || !customRange?.to)) {
      console.log("⏸️ [Google Overview] Custom range incomplete");
      setAggregatedData({
        totalSpend: 0,
        totalClicks: 0,
        totalImpressions: 0,
        totalConversions: 0,
        avgCTR: 0,
        avgCPC: 0,
        avgCPM: 0,
      });
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
      console.log("📊 [Google Overview] Fetching data:", dateParams);

      const response = await apiClient.post(`/aggregate/google`, {
        customer_id: customerId,
        start_date: dateParams.start_date,
        end_date: dateParams.end_date,
        group_by: null, // Get totals
      });

      setAggregatedData(
        response.data || {
          totalSpend: 0,
          totalClicks: 0,
          totalImpressions: 0,
          totalConversions: 0,
          avgCTR: 0,
          avgCPC: 0,
          avgCPM: 0,
        }
      );

      console.log("✅ [Google Overview] Data loaded:", response.data);
    } catch (e: any) {
      console.error("❌ [Google Overview] Error:", e);
      setError(e.response?.data?.detail || "Failed to fetch Google data");
    } finally {
      setLoading(false);
    }
  }, [
    userId,
    customerId,
    isConnected,
    platformsLoaded,
    dateRange,
    customRange,
  ]);

  useEffect(() => {
    fetchGoogleData();
  }, [fetchGoogleData]);

  return { aggregatedData, loading, error, refresh: fetchGoogleData };
};
