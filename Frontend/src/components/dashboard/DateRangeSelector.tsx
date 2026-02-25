import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { useIsMobile } from "@/hooks/use-mobile";

interface DateRangeSelectorProps {
  date: string;
  onChange: (value: string) => void;
  customRange?: DateRange;
  onCustomRangeChange?: (range: DateRange | undefined) => void;
}

export const DateRangeSelector = ({
  date,
  onChange,
  customRange,
  onCustomRangeChange,
}: DateRangeSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | undefined>(
    customRange,
  );
  const [key, setKey] = useState(0); // Force re-render of calendar
  const isMobile = useIsMobile();

  // When opening the popover, clear temp range if not already on custom
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && date !== "custom") {
      setTempRange(undefined); // Clear previous selection
      setKey((prev) => prev + 1); // Force calendar to re-render
    } else if (open && date === "custom") {
      setTempRange(customRange); // Restore custom range when reopening
    }
  };

  // Sync tempRange when customRange changes externally
  useEffect(() => {
    if (date === "custom") {
      setTempRange(customRange);
    }
  }, [customRange, date]);

  const handleCustomRangeSelect = (range: DateRange | undefined) => {
    setTempRange(range);

    // Only apply when both dates are selected
    if (range?.from && range?.to) {
      onCustomRangeChange?.(range);
      onChange("custom");
      setIsOpen(false);
    }
  };

  const getDisplayText = () => {
    if (date === "custom" && customRange?.from && customRange?.to) {
      return `${format(customRange.from, "MMM d")} - ${format(
        customRange.to,
        "MMM d, yyyy",
      )}`;
    }

    const presets = {
      today: "Today",
      "7days": "Last 7 days",
      "30days": "Last 30 days",
      "90days": "Last 90 days",
      lifetime: "Lifetime",
    };

    return presets[date as keyof typeof presets] || "Select period";
  };

  const handlePresetClick = (preset: string) => {
    onChange(preset);
    setTempRange(undefined);
    setIsOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full sm:w-[280px] justify-start text-left font-normal"
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            {getDisplayText()}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[calc(100vw-2rem)] sm:w-auto p-0"
          align="start"
        >
          <div className="flex flex-col sm:flex-row">
            {/* Preset Options */}
            <div className="border-b sm:border-b-0 sm:border-r p-3 space-y-1 min-w-0 sm:min-w-[140px]">
              <div className="text-xs font-semibold mb-2 px-2 text-muted-foreground uppercase">
                Quick Select
              </div>
              <div className="flex flex-wrap sm:flex-col gap-1">
                <Button
                  variant={date === "today" ? "secondary" : "ghost"}
                  className="justify-start text-sm h-9 flex-1 sm:flex-none sm:w-full"
                  onClick={() => handlePresetClick("today")}
                >
                  Today
                </Button>
                <Button
                  variant={date === "7days" ? "secondary" : "ghost"}
                  className="justify-start text-sm h-9 flex-1 sm:flex-none sm:w-full"
                  onClick={() => handlePresetClick("7days")}
                >
                  Last 7 days
                </Button>
                <Button
                  variant={date === "30days" ? "secondary" : "ghost"}
                  className="justify-start text-sm h-9 flex-1 sm:flex-none sm:w-full"
                  onClick={() => handlePresetClick("30days")}
                >
                  Last 30 days
                </Button>
                <Button
                  variant={date === "90days" ? "secondary" : "ghost"}
                  className="justify-start text-sm h-9 flex-1 sm:flex-none sm:w-full"
                  onClick={() => handlePresetClick("90days")}
                >
                  Last 90 days
                </Button>
                <Button
                  variant={date === "lifetime" ? "secondary" : "ghost"}
                  className="justify-start text-sm h-9 flex-1 sm:flex-none sm:w-full"
                  onClick={() => handlePresetClick("lifetime")}
                >
                  Lifetime
                </Button>
              </div>
            </div>

            {/* Calendar */}
            <div className="p-3 overflow-x-auto">
              <div className="text-xs font-semibold mb-3 text-muted-foreground uppercase">
                Custom Range
              </div>
              <Calendar
                key={key}
                mode="range"
                defaultMonth={tempRange?.from || new Date()}
                selected={tempRange}
                onSelect={handleCustomRangeSelect}
                numberOfMonths={isMobile ? 1 : 2}
                disabled={(date) => date > new Date()}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
