import { Globe2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/utils/class-names";
import { getEconomicCalendarTimeZoneOptions } from "@/features/economic-calendar/utils";

interface EconomicCalendarTimezoneSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function EconomicCalendarTimezoneSelect({
  value,
  onValueChange,
  className,
}: EconomicCalendarTimezoneSelectProps) {
  const options = getEconomicCalendarTimeZoneOptions(value);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="hidden text-muted-foreground sm:flex">
        <Globe2 className="h-4 w-4" />
      </div>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          aria-label="Timezone"
          className="h-8 min-w-[168px] rounded-full border-border/25 bg-background/45 px-3 text-xs text-muted-foreground shadow-none"
        >
          <SelectValue placeholder="Timezone" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
