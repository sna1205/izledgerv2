import type { EconomicCalendarEvent } from "@/types";
import { EconomicCalendarHighImpactStrip } from "@/features/economic-calendar/components/EconomicCalendarHighImpactStrip";

interface EconomicCalendarUtilityPanelProps {
  nextImportantEvent: EconomicCalendarEvent | null;
  now: Date;
  timeZone: string;
}

export function EconomicCalendarUtilityPanel({
  nextImportantEvent,
  now,
  timeZone,
}: EconomicCalendarUtilityPanelProps) {
  return (
    <aside className="lg:sticky lg:top-6">
      <EconomicCalendarHighImpactStrip
        event={nextImportantEvent}
        now={now}
        timeZone={timeZone}
      />
    </aside>
  );
}
