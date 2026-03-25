import { Globe2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { EconomicCalendarEvent } from "@/types";
import { EmptyState } from "@/components/EmptyState";
import { EconomicCalendarEventCard } from "@/features/economic-calendar/components/EconomicCalendarEventCard";
import { buildEconomicCalendarDateSearch } from "@/features/economic-calendar/economicCalendarDateNavigation.service";
import { isEconomicEventForLocalDay, readEconomicCalendarTimeZonePreference } from "@/features/economic-calendar/utils";

interface EconomicCalendarContextPanelProps {
  title: string;
  description: string;
  events: EconomicCalendarEvent[];
  tradeDate: string;
  instrument: string;
  timeZone?: string;
}

export function EconomicCalendarContextPanel({
  title,
  description,
  events,
  tradeDate,
  instrument,
  timeZone,
}: EconomicCalendarContextPanelProps) {
  const resolvedTimeZone = timeZone ?? readEconomicCalendarTimeZonePreference();
  const dayEvents = events.filter((event) => isEconomicEventForLocalDay(event, tradeDate, resolvedTimeZone));
  const importantEvents = dayEvents.filter((event) => event.impactLevel === "high" || event.impactLevel === "medium");

  return (
    <div className="space-y-3 rounded-[1.5rem] border border-border/70 bg-background/75 p-4 shadow-sm dark:bg-white/[0.02]">
      <div>
        <p className="text-label">Macro Context</p>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <Link
          to={`/economic-calendar${buildEconomicCalendarDateSearch(tradeDate, resolvedTimeZone)}`}
          className="mt-2 inline-flex text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          Open calendar for this date
        </Link>
      </div>

      {importantEvents.length === 0 ? (
        <EmptyState
          icon={Globe2}
          title="No major events for this session"
          description="No medium or high-impact events were found in the provider window for this trade date."
          className="py-8"
        />
      ) : (
        <div className="space-y-3">
          {importantEvents.map((event) => (
            <EconomicCalendarEventCard
              key={event.id}
              event={event}
              instrumentUniverse={[instrument]}
              timeZone={timeZone}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
}
