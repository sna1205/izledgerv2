import type { EconomicCalendarEvent } from "@/types";
import { EconomicCalendarEventRow } from "@/features/economic-calendar/components/EconomicCalendarEventRow";

interface EconomicCalendarTimeGroupProps {
  events: EconomicCalendarEvent[];
  instrumentUniverse?: string[];
  timeZone?: string;
}

export function EconomicCalendarTimeGroup({
  events,
  instrumentUniverse = [],
  timeZone,
}: EconomicCalendarTimeGroupProps) {
  return (
    <div className="min-w-0 space-y-1.5">
      {events.map((event) => (
        <div key={event.id}>
          <EconomicCalendarEventRow
            event={event}
            instrumentUniverse={instrumentUniverse}
            timeZone={timeZone}
          />
        </div>
      ))}
    </div>
  );
}
