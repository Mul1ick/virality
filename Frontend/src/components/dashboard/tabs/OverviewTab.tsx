// components/dashboard/tabs/OverviewTab.tsx
import { KPICard } from "@/components/dashboard/KPICard";
import { TrendChart } from "@/components/dashboard/TrendChart";

interface OverviewTabProps {
  dateRange: string;
}

export const OverviewTab = ({ dateRange }: OverviewTabProps) => {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Ad Spend"
          value="$18,450"
          change={12.5}
          changeLabel="vs. last period"
          format="currency"
        />
        <KPICard
          title="Total Revenue"
          value="$52,300"
          change={18.3}
          changeLabel="vs. last period"
          format="currency"
        />
        <KPICard
          title="Blended ROAS"
          value="2.84x"
          change={4.2}
          changeLabel="vs. last period"
          format="number"
        />
        <KPICard
          title="Blended CPA"
          value="$28.50"
          change={-8.1}
          changeLabel="vs. last period"
          format="currency"
        />
      </div>

      {/* Trend Chart */}
      <TrendChart dateRange={dateRange} />
    </div>
  );
};
