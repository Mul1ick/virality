import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export interface DemographicData {
  age: string;
  gender: string;
  impressions: number;
  spend: number;
  reach: number;
  clicks: number;
}

interface MetaDemographicsChartProps {
  data: DemographicData[];
  isLoading: boolean;
  metric?: "reach" | "impressions" | "clicks" | "spend";
}

export const MetaDemographicsChart = ({
  data,
  isLoading,
  metric = "reach", // Default metric
}: MetaDemographicsChartProps) => {
  
  // 1. Process Data: Group by Age, Pivot Gender to keys
  const chartData = useMemo(() => {
    const grouped: Record<string, any> = {};

    data.forEach((item) => {
      const age = item.age;
      if (!grouped[age]) {
        grouped[age] = { age }; // Initialize group
      }
      // Map gender values to keys (e.g., male: 1200)
      // Normalize gender string just in case
      const genderKey = item.gender?.toLowerCase() || "unknown";
      grouped[age][genderKey] = item[metric]; 
    });

    // Convert object back to array and sort by Age
    return Object.values(grouped).sort((a: any, b: any) => 
      a.age.localeCompare(b.age)
    );
  }, [data, metric]);

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      compactDisplay: "short",
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card className="p-6 h-[400px] flex items-center justify-center border-none shadow-none">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[350px] flex items-center justify-center text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
        No demographic data available for this item.
      </div>
    );
  }

  return (
    <Card className="p-0 border-none shadow-none">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Age & Gender Breakdown</h3>
          <p className="text-sm text-muted-foreground capitalize">
            Metric: {metric}
          </p>
        </div>
      </div>

      <div className="h-[280px] sm:h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="age" stroke="hsl(var(--muted-foreground))" />
            <YAxis tickFormatter={formatNumber} stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
              contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
              formatter={(value: number) => [new Intl.NumberFormat("en-US").format(value), ""]}
            />
            <Legend />
            
            {/* Female Bar (Purple/Pink) */}
            <Bar 
              dataKey="female" 
              name="Women" 
              stackId="a" 
              fill="#d946ef"  
              radius={[0, 0, 4, 4]} 
            />
            
            {/* Male Bar (Blue) */}
            <Bar 
              dataKey="male" 
              name="Men" 
              stackId="a" 
              fill="#3b82f6" 
              radius={[4, 4, 0, 0]} 
            />
            
            {/* Unknown Bar (Gray) */}
            <Bar 
              dataKey="unknown" 
              name="Unknown" 
              stackId="a" 
              fill="#94a3b8" 
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};