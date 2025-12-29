// FILE: Frontend/src/components/dashboard/DashboardSidebar.tsx
import { cn } from "@/lib/utils";
import { TrendingUp, Facebook, Search, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  activeSubTab?: string;
  onSubTabChange?: (subTab: string) => void;
}

export const DashboardSidebar = ({
  activeTab,
  onTabChange,
  activeSubTab,
  onSubTabChange,
}: DashboardSidebarProps) => {
  const mainTabs = [
    {
      id: "overview",
      label: "Overview",
      icon: TrendingUp,
    },
    {
      id: "meta",
      label: "Meta",
      icon: Facebook,
    },
    {
      id: "google",
      label: "Google",
      icon: Search,
    },
    {
      id: "shopify",
      label: "Shopify",
      icon: ShoppingCart,
    },
  ];

  const overviewSubTabs = [
    { id: "meta", label: "Meta Performance", icon: Facebook },
    { id: "google", label: "Google Performance", icon: Search },
    { id: "shopify", label: "Shopify Performance", icon: ShoppingCart },
  ];

  return (
    <aside className="w-64 h-full bg-card/30 border-r border-border/50 backdrop-blur-xl overflow-y-auto mt-2">
      {/* Main Navigation */}
      <nav className="p-4 space-y-2">
        {mainTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <div key={tab.id}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 px-4 py-3 h-auto transition-all duration-300",
                  isActive
                    ? "bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 shadow-lg shadow-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                )}
                onClick={() => onTabChange(tab.id)}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-lg transition-all duration-300",
                    isActive
                      ? "bg-primary/20 text-primary"
                      : "bg-muted/20 text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="font-medium">{tab.label}</span>
              </Button>

              {/* Sub-tabs for Overview */}
              {tab.id === "overview" && isActive && onSubTabChange && (
                <div className="ml-4 mt-2 space-y-1 pl-4 border-l-2 border-primary/20">
                  {overviewSubTabs.map((subTab) => {
                    const SubIcon = subTab.icon;
                    const isSubActive = activeSubTab === subTab.id;

                    return (
                      <Button
                        key={subTab.id}
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "w-full justify-start gap-2 px-3 py-2 text-sm transition-all duration-200",
                          isSubActive
                            ? "bg-primary/10 text-primary hover:bg-primary/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-card/30"
                        )}
                        onClick={() => onSubTabChange(subTab.id)}
                      >
                        <SubIcon className="h-3.5 w-3.5" />
                        <span>{subTab.label}</span>
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
};
