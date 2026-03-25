import { Button } from "@/components/ui/button";
import { cn } from "@/utils/class-names";
import {
  getEconomicCalendarViewModeLabel,
  type EconomicCalendarViewMode,
} from "@/features/economic-calendar/economicCalendarViewMode.utils";

interface EconomicCalendarModeSwitchProps {
  value: EconomicCalendarViewMode;
  onValueChange: (value: EconomicCalendarViewMode) => void;
}

export function EconomicCalendarModeSwitch({
  value,
  onValueChange,
}: EconomicCalendarModeSwitchProps) {
  const modeOptions: EconomicCalendarViewMode[] = value === "custom"
    ? ["upcoming", "past", "week", "custom"]
    : ["upcoming", "past", "week"];

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-lg border border-border/18 bg-background/65 p-0.5"
      aria-label="Calendar view mode"
      role="tablist"
    >
      {modeOptions.map((mode) => (
        <Button
          key={mode}
          type="button"
          variant="ghost"
          size="sm"
          role="tab"
          aria-selected={value === mode}
          className={cn(
            "h-7 rounded-md px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground",
            value === mode && "bg-foreground text-background hover:bg-foreground hover:text-background",
          )}
          onClick={() => onValueChange(mode)}
        >
          {getEconomicCalendarViewModeLabel(mode)}
        </Button>
      ))}
    </div>
  );
}
