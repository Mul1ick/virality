import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateRangeSelectorProps {
  date: string;
  onChange: (value: string) => void;
}

export const DateRangeSelector = ({
  date,
  onChange,
}: DateRangeSelectorProps) => {
  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-5 w-5 text-muted-foreground" />
      <Select value={date} onValueChange={onChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="7days">Last 7 days</SelectItem>
          <SelectItem value="30days">Last 30 days</SelectItem>
          <SelectItem value="90days">Last 90 days</SelectItem>
          <SelectItem value="lifetime">Lifetime</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
