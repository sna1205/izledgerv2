import { CalendarX2 } from "lucide-react";
import type { EconomicCalendarEvent } from "@/types";
import { EmptyState } from "@/components/EmptyState";
import { EconomicCalendarDayGroup } from "@/features/economic-calendar/components/EconomicCalendarDayGroup";
import { groupEconomicCalendarEventsByDayAndTime } from "@/features/economic-calendar/utils";

interface EconomicCalendarTimelineProps {
  events: EconomicCalendarEvent[];
  instrumentUniverse?: string[];
  timeZone?: string;
  emptyTitle: string;
  emptyDescription: string;
}

export function EconomicCalendarTimeline({
  events,
  instrumentUniverse = [],
  timeZone,
  emptyTitle,
  emptyDescription,
}: EconomicCalendarTimelineProps) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={CalendarX2}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  const groups = groupEconomicCalendarEventsByDayAndTime(events, timeZone);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <EconomicCalendarDayGroup
          key={group.dateKey}
          dateKey={group.dateKey}
          label={group.label}
          timeGroups={group.timeGroups}
          instrumentUniverse={instrumentUniverse}
          timeZone={timeZone}
        />
      ))}
    </div>
  );
}
