import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KPICard } from "@/components/dashboard/KPICard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { CampaignTable } from "@/components/dashboard/CampaignTable";
import { CreativeGallery } from "@/components/dashboard/CreativeGallery";
import { DateRangeSelector } from "@/components/dashboard/DateRangeSelector";
import { BarChart3, TrendingUp } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Unified metrics across Meta & Google
                </p>
              </div>
            </div>
            <DateRangeSelector />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="creatives">Creatives</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
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
            <TrendChart />
          </TabsContent>

          <TabsContent value="campaigns">
            <CampaignTable />
          </TabsContent>

          <TabsContent value="creatives">
            <CreativeGallery />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
