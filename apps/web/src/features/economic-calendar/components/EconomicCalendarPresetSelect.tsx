import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/utils/class-names";
import {
  getEconomicCalendarPresetLabel,
  type EconomicCalendarRangePreset,
} from "@/features/economic-calendar/economicCalendarRange.utils";

const PRESET_OPTIONS: EconomicCalendarRangePreset[] = [
  "today",
  "tomorrow",
  "yesterday",
  "this_week",
  "next_week",
  "last_week",
  "last_7_days",
  "next_7_days",
];

interface EconomicCalendarPresetSelectProps {
  value: EconomicCalendarRangePreset | null;
  onValueChange: (value: EconomicCalendarRangePreset) => void;
  className?: string;
}

export function EconomicCalendarPresetSelect({
  value,
  onValueChange,
  className,
}: EconomicCalendarPresetSelectProps) {
  return (
    <Select value={value ?? ""} onValueChange={(nextValue) => onValueChange(nextValue as EconomicCalendarRangePreset)}>
      <SelectTrigger
        aria-label="Preset range"
        className={cn(
          "h-7 w-full min-w-0 rounded-md border-border/15 bg-transparent px-2.5 text-[11px] text-muted-foreground shadow-none sm:min-w-[84px]",
          className,
        )}
      >
        <span className="truncate">Preset</span>
      </SelectTrigger>
      <SelectContent>
        {PRESET_OPTIONS.map((preset) => (
          <SelectItem key={preset} value={preset}>
            {getEconomicCalendarPresetLabel(preset)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
