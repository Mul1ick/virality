// FILE: Frontend/src/components/dashboard/DashboardHeader.tsx
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
import { Menu, User, Settings, LogOut, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DateRange } from "react-day-picker";
import { useState, useEffect } from "react";

interface DashboardHeaderProps {
  dateRange: string;
  onDateRangeChange: (range: string) => void;
  customRange?: DateRange;
  onCustomRangeChange?: (range: DateRange | undefined) => void;
  onToggleSidebar?: () => void;
}

export const DashboardHeader = ({
  dateRange,
  onDateRangeChange,
  customRange,
  onCustomRangeChange,
  onToggleSidebar,
}: DashboardHeaderProps) => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("U");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const email = localStorage.getItem("user_email");
    if (email) {
      setUserEmail(email);
      const initial = email.charAt(0).toUpperCase();
      setUserName(initial);
    }
  }, []);

  const handleSignOut = () => {
    localStorage.clear();
    navigate("/signin");
  };

  return (
    <header className="border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-50 shadow-lg shadow-black/5">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 pointer-events-none"></div>

      <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-4 relative">
        <div className="flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Hamburger - mobile only */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9 shrink-0"
              onClick={onToggleSidebar}
              aria-label="Toggle navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="relative hidden sm:block">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl blur-md"></div>
              <div className="relative flex items-center justify-center h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg">
                <Zap className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-gradient">
                Analytics Dashboard
              </h1>
              <p className="text-sm text-muted-foreground hidden sm:block">
                Unified metrics across Meta, Google & Shopify
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:block">
              <DateRangeSelector
                date={dateRange}
                onChange={onDateRangeChange}
                customRange={customRange}
                onCustomRangeChange={onCustomRangeChange}
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-9 w-9 sm:h-11 sm:w-11 rounded-full p-0 hover:bg-card/50 transition-colors border border-transparent hover:border-border/50"
                >
                  <Avatar className="h-9 w-9 sm:h-11 sm:w-11 border-2 border-border/50">
                    <AvatarFallback className="bg-card text-foreground font-bold text-base sm:text-lg">
                      {userName}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 bg-card border-border/50 backdrop-blur-xl"
                align="end"
                forceMount
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-foreground">
                      {userEmail || "User"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      Dashboard User
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/50" />
                <DropdownMenuItem
                  onClick={() => navigate("/profile")}
                  className="cursor-pointer hover:bg-primary/10"
                >
                  <User className="mr-2 h-4 w-4 text-primary" />
                  <span>Profile & Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("/profile")}
                  className="cursor-pointer hover:bg-primary/10"
                >
                  <Settings className="mr-2 h-4 w-4 text-secondary" />
                  <span>Connect Platforms</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/50" />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-destructive hover:bg-destructive/10 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Date Range Selector - below header content */}
        <div className="sm:hidden mt-3">
          <DateRangeSelector
            date={dateRange}
            onChange={onDateRangeChange}
            customRange={customRange}
            onCustomRangeChange={onCustomRangeChange}
          />
        </div>
      </div>
    </header>
  );
};
