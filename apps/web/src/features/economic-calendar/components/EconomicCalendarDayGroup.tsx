import type { EconomicCalendarEvent } from "@/types";
import { EconomicCalendarTimeGroup } from "@/features/economic-calendar/components/EconomicCalendarTimeGroup";

interface EconomicCalendarDayGroupProps {
  dateKey: string;
  label: string;
  timeGroups: Array<{
    timeLabel: string;
    events: EconomicCalendarEvent[];
  }>;
  instrumentUniverse?: string[];
  timeZone?: string;
}

export function EconomicCalendarDayGroup({
  dateKey,
  label,
  timeGroups,
  instrumentUniverse = [],
  timeZone,
}: EconomicCalendarDayGroupProps) {
  return (
    <section key={dateKey} className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </div>
        <div className="h-px flex-1 bg-border/50" />
      </div>
      <div className="space-y-1">
        {timeGroups.map((timeGroup) => (
          <EconomicCalendarTimeGroup
            key={`${dateKey}-${timeGroup.timeLabel}`}
            events={timeGroup.events}
            instrumentUniverse={instrumentUniverse}
            timeZone={timeZone}
          />
        ))}
      </div>
    </section>
  );
}
