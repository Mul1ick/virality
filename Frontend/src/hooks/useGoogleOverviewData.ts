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

export interface GoogleDailyChartData {
  date: string;
  totalSpend: number;
  totalClicks: number;
  totalImpressions: number;
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

const toNumber = (value: any): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value) || 0;
  return 0;
};

const microsToActual = (micros: any): number => {
  return toNumber(micros) / 1_000_000;
};

export const useGoogleOverviewData = (
  userId: string | null,
  customerId: string | null | undefined,
  managerId: string | null | undefined,
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
  const [chartData, setChartData] = useState<GoogleDailyChartData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

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
      console.log("📊 [Google Overview] Fetching data:", dateParams);

      const chartResponse = await apiClient.post(`/aggregate/google`, {
        ad_account_id: customerId,
        start_date: dateParams.start_date,
        end_date: dateParams.end_date,
        group_by: "date",
      });

      console.log("📊 [Google Overview] Raw response:", chartResponse.data);

      const rawData = Array.isArray(chartResponse.data)
        ? chartResponse.data
        : [];

      const transformedData = rawData.map((day: any) => {
        const spend =
          day.totalSpend !== undefined
            ? toNumber(day.totalSpend)
            : microsToActual(day.cost_micros || day.total_cost_micros);

        const clicks =
          day.totalClicks !== undefined
            ? toNumber(day.totalClicks)
            : toNumber(day.clicks || day.total_clicks);

        const impressions =
          day.totalImpressions !== undefined
            ? toNumber(day.totalImpressions)
            : toNumber(day.impressions || day.total_impressions);

        const conversions =
          day.totalConversions !== undefined
            ? toNumber(day.totalConversions)
            : toNumber(day.conversions || day.total_conversions);

        return {
          date: day.date || day.date_start,
          totalSpend: spend,
          totalClicks: clicks,
          totalImpressions: impressions,
          totalConversions: conversions,
        };
      });

      console.log("📊 [Google Overview] Transformed data:", transformedData);

      setChartData(transformedData);

      const totals = transformedData.reduce(
        (acc, day) => ({
          totalSpend: acc.totalSpend + (day.totalSpend || 0),
          totalClicks: acc.totalClicks + (day.totalClicks || 0),
          totalImpressions: acc.totalImpressions + (day.totalImpressions || 0),
          totalConversions: acc.totalConversions + (day.totalConversions || 0),
        }),
        {
          totalSpend: 0,
          totalClicks: 0,
          totalImpressions: 0,
          totalConversions: 0,
        }
      );

      setAggregatedData({
        ...totals,
        avgCTR:
          totals.totalImpressions > 0
            ? (totals.totalClicks / totals.totalImpressions) * 100
            : 0,
        avgCPC:
          totals.totalClicks > 0 ? totals.totalSpend / totals.totalClicks : 0,
        avgCPM:
          totals.totalImpressions > 0
            ? (totals.totalSpend / totals.totalImpressions) * 1000
            : 0,
      });

      console.log("✅ [Google Overview] Data loaded:", {
        chartPoints: transformedData.length,
        totals,
      });
    } catch (e: any) {
      console.error("❌ [Google Overview] Error:", e);
      console.error("❌ [Google Overview] Error details:", e.response?.data);
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

  // Auto-sync on first connection
  const checkAndSync = useCallback(async () => {
    if (!userId || !customerId || !isConnected || !platformsLoaded) {
      console.log("⏸️ [Google Sync] Not ready");
      return;
    }

    // Check if we have any data in MongoDB
    try {
      const testParams = getDatesFromPreset("30days");
      const testFetch = await apiClient.post(`/aggregate/google`, {
        ad_account_id: customerId,
        start_date: testParams.start_date,
        end_date: testParams.end_date,
        group_by: "date",
      });

      const testData = Array.isArray(testFetch.data) ? testFetch.data : [];

      // If we have data, skip sync
      if (testData.length > 0) {
        console.log("📦 [Google Sync] Data exists, loading...");
        setSyncComplete(true);
        await fetchGoogleData();
        return;
      }

      // No data found - trigger full sync
      console.log("🔄 [Google Sync] No data found, starting initial sync...");
      setSyncing(true);
      setSyncError(null);

      const syncResponse = await apiClient.post(
        `/google/sync/${userId}`,
        {
          customer_id: customerId,
          manager_id: managerId || undefined,
          days_back: 90, // Default 90 days
        },
        { timeout: 300000 } // 5 minute timeout
      );

      console.log("✅ [Google Sync] Complete:", syncResponse.data);
      setSyncComplete(true);

      // Now fetch the data
      await fetchGoogleData();
    } catch (e: any) {
      console.error("❌ [Google Sync] Failed:", e);
      setSyncError(
        e.response?.data?.detail || "Sync failed. Please try again."
      );
    } finally {
      setSyncing(false);
    }
  }, [
    userId,
    customerId,
    managerId,
    isConnected,
    platformsLoaded,
    fetchGoogleData,
  ]);

  // Initial check and sync on mount
  useEffect(() => {
    if (platformsLoaded && isConnected && userId && customerId) {
      checkAndSync();
    }
  }, [userId, customerId, isConnected, platformsLoaded]);

  // Refetch when date range changes (but only if sync is complete)
  useEffect(() => {
    if (syncComplete && !syncing) {
      fetchGoogleData();
    }
  }, [dateRange, customRange, syncComplete, syncing]);

  return {
    aggregatedData,
    chartData,
    loading,
    error,
    syncing,
    syncComplete,
    syncError,
    refresh: fetchGoogleData,
    checkAndSync,
  };
};
