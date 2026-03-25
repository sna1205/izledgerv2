import type { EconomicCalendarEvent } from "@/types";
import { EconomicCalendarNextEventPreview } from "@/features/economic-calendar/components/EconomicCalendarNextEventPreview";

interface EconomicCalendarHighImpactStripProps {
  event: EconomicCalendarEvent | null;
  now?: Date;
  timeZone?: string;
}

export function EconomicCalendarHighImpactStrip({
  event,
  now,
  timeZone,
}: EconomicCalendarHighImpactStripProps) {
  return (
    <EconomicCalendarNextEventPreview
      event={event}
      now={now}
      timeZone={timeZone}
    />
  );
}
