import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { PageErrorState } from "@/components/PageErrorState";
import { DataBadge } from "@/components/DataBadge";
import { useAuth } from "@/features/auth/auth-context";
import { EconomicCalendarEventCard } from "@/features/economic-calendar/components/EconomicCalendarEventCard";
import { getDashboardImportantEvents } from "@/services/api/economic-calendar";
import { privateQueryKey } from "@/services/query-client";
import {
  formatEconomicCalendarTimeZoneLabel,
  readEconomicCalendarTimeZonePreference,
} from "@/features/economic-calendar/utils";

interface TodayImportantEventsWidgetProps {
  instrumentUniverse?: string[];
}

export function TodayImportantEventsWidget({
  instrumentUniverse = [],
}: TodayImportantEventsWidgetProps) {
  const { user } = useAuth();
  const timeZone = readEconomicCalendarTimeZonePreference();
  const eventsQuery = useQuery({
    queryKey: privateQueryKey(user.id, "economic-calendar", "dashboard-important", {
      instruments: instrumentUniverse.join("|"),
      live: true,
    }),
    queryFn: () => getDashboardImportantEvents({
      range: "today",
      instrument: instrumentUniverse[0],
      live: true,
    }),
  });
  const importantTodayEvents = useMemo(() => eventsQuery.data?.items ?? [], [eventsQuery.data?.items]);
  const nextEvent = eventsQuery.data?.nextImportantEvent ?? null;

  if (eventsQuery.isError) {
    return (
      <PageErrorState
        title="Calendar unavailable"
        description="Today’s events could not be loaded."
        onRetry={() => void eventsQuery.refetch()}
        isRetrying={eventsQuery.isFetching}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-medium text-foreground">Today’s Events</h3>
          <p className="mt-1 text-xs text-muted-foreground">{formatEconomicCalendarTimeZoneLabel(timeZone)}</p>
        </div>
        <div className="flex items-center gap-2">
          {nextEvent ? <DataBadge tone="warning">Next: {nextEvent.currency}</DataBadge> : null}
          <Link to="/economic-calendar" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Open calendar
          </Link>
        </div>
      </div>

      {eventsQuery.isLoading && !eventsQuery.data ? (
        <div className="surface-muted p-4 text-sm text-muted-foreground">Loading events...</div>
      ) : importantTodayEvents.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No major events today"
          description="No medium or high-impact releases are scheduled."
          className="py-10"
        />
      ) : (
        <div className="space-y-3">
          {importantTodayEvents.slice(0, 3).map((event) => (
            <EconomicCalendarEventCard
              key={event.id}
              event={event}
              instrumentUniverse={instrumentUniverse}
              timeZone={timeZone}
              compact
            />
          ))}
          {importantTodayEvents.length > 3 ? (
            <div className="surface-muted flex items-center justify-between px-4 py-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {importantTodayEvents.length - 3}
                {" "}
                more later today
              </div>
              <Link to="/economic-calendar" className="font-medium text-foreground">
                View all
              </Link>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
