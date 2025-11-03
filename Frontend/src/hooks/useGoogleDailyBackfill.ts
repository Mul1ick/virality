// FILE: Frontend/src/hooks/useGoogleDailyBackfill.ts
import { useState } from "react";
import apiClient from "@/lib/api";

export const useGoogleDailyBackfill = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const backfillDailyData = async (
    userId: string,
    customerId: string,
    managerId?: string,
    daysBack: number = 90 // Default 90 days
  ) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      console.log(`📊 [Google Backfill] Starting ${daysBack} day backfill...`);

      const response = await apiClient.post(
        `/google/daily-insights/backfill/${userId}`,
        {
          customer_id: customerId,
          manager_id: managerId,
          days_back: daysBack,
        },
        { timeout: 120000 } // 2 minute timeout for large backfills
      );

      console.log("✅ [Google Backfill] Success:", response.data);
      setSuccess(true);
      return response.data;
    } catch (e: any) {
      console.error("❌ [Google Backfill] Error:", e);
      setError(e.response?.data?.detail || "Failed to backfill daily data");
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { backfillDailyData, loading, error, success };
};
