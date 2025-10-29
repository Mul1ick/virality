import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DateRangeSelector } from "@/components/dashboard/DateRangeSelector";
import { BarChart3, User, Settings, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DateRange } from "react-day-picker";
import { useState, useEffect } from "react";

interface DashboardHeaderProps {
  dateRange: string;
  onDateRangeChange: (range: string) => void;
  customRange?: DateRange;
  onCustomRangeChange?: (range: DateRange | undefined) => void;
}

export const DashboardHeader = ({
  dateRange,
  onDateRangeChange,
  customRange,
  onCustomRangeChange,
}: DashboardHeaderProps) => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("U");
  const [userEmail, setUserEmail] = useState("");

  // Get user info from localStorage on mount
  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    if (userId) {
      setUserEmail(userId);
      // Generate initials from email (first letter before @)
      const initial = userId.charAt(0).toUpperCase();
      setUserName(initial);
    }
  }, []);

  const handleSignOut = () => {
    localStorage.clear();
    navigate("/signin");
  };

  return (
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
                Unified metrics across Meta, Google & Shopify
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <DateRangeSelector
              date={dateRange}
              onChange={onDateRangeChange}
              customRange={customRange}
              onCustomRangeChange={onCustomRangeChange}
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full"
                >
                  <Avatar className="h-10 w-10 border-2 border-primary/20">
                    <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                      {userName}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {userEmail || "User"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      Dashboard User
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile & Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Connect Platforms</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};
