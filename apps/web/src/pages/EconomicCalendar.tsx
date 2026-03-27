import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate, useSearchParams } from "react-router-dom";
import { PageErrorState } from "@/components/PageErrorState";
import { FEATURES } from "@/config/features";
import { PageShell } from "@/layouts/PageShell";
import { useAuth } from "@/features/auth/auth-context";
import { useUnauthorizedSessionGuard } from "@/features/auth/use-unauthorized-session-guard";
import { EconomicCalendarHeader } from "@/features/economic-calendar/components/EconomicCalendarHeader";
import { EconomicCalendarTimeline } from "@/features/economic-calendar/components/EconomicCalendarTimeline";
import { EconomicCalendarUtilityPanel } from "@/features/economic-calendar/components/EconomicCalendarUtilityPanel";
import {
  readEconomicCalendarRangeStateFromSearch,
  readEconomicCalendarViewModeFromSearch,
  writeEconomicCalendarRangeStateToSearch,
  writeEconomicCalendarViewModeToSearch,
} from "@/features/economic-calendar/economicCalendarDateNavigation.service";
import {
  createEconomicCalendarCustomRangeState,
  createEconomicCalendarPresetRangeState,
  formatRangeLabel,
  getEconomicCalendarQueryRange,
  isEconomicCalendarDateInRange,
  shiftEconomicCalendarDateKey,
  shiftRangeBackward,
  shiftRangeForward,
  type EconomicCalendarRangePreset,
} from "@/features/economic-calendar/economicCalendarRange.utils";
import {
  filterEconomicCalendarEventsForViewMode,
  shouldEnableLiveUpdatesForViewMode,
  type EconomicCalendarViewMode,
} from "@/features/economic-calendar/economicCalendarViewMode.utils";
import { getEconomicCalendarList } from "@/services/api/economic-calendar";
import { listTrades } from "@/services/api/trades";
import { privateQueryKey } from "@/services/query-client";
import { withMinimumDelay } from "@/utils/loading";
import { getPageErrorState } from "@/utils/page-errors";
import EconomicCalendarComingSoonPage from "@/pages/EconomicCalendarComingSoonPage";
import {
  getEconomicEventRelevanceList,
  getLocalDateKey,
  getNextImportantEconomicEvent,
  readEconomicCalendarTimeZonePreference,
  type EconomicCalendarImpactFilter,
  writeEconomicCalendarTimeZonePreference,
} from "@/features/economic-calendar/utils";

const RECENT_INSTRUMENT_LIMIT = 24;

function EconomicCalendarLivePage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currencyFilter, setCurrencyFilter] = useState<string>("all");
  const [impactFilter, setImpactFilter] = useState<EconomicCalendarImpactFilter>("all");
  const [relevantOnly, setRelevantOnly] = useState(false);
  const [timeZone, setTimeZone] = useState(() => readEconomicCalendarTimeZonePreference());
  const [now, setNow] = useState(() => new Date());

  const recentTradesQuery = useQuery({
    queryKey: privateQueryKey(user.id, "economic-calendar", "recent-instruments"),
    queryFn: async () => {
      const response = await listTrades({
        page: 1,
        pageSize: RECENT_INSTRUMENT_LIMIT,
        sortBy: "date",
        sortOrder: "desc",
      });

      return response.items;
    },
  });

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 30_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    writeEconomicCalendarTimeZonePreference(timeZone);
  }, [timeZone]);

  const viewMode = useMemo(() => readEconomicCalendarViewModeFromSearch(searchParams), [searchParams]);
  const rangeState = useMemo(() => readEconomicCalendarRangeStateFromSearch({
    searchParams,
    now,
    timeZone,
  }), [now, searchParams, timeZone]);
  const queryRange = useMemo(() => {
    const baseRange = getEconomicCalendarQueryRange(rangeState);
    const todayKey = getLocalDateKey(now, timeZone);

    if (viewMode !== "upcoming" || !isEconomicCalendarDateInRange(todayKey, rangeState)) {
      return baseRange;
    }

    return {
      dateFrom: baseRange.dateFrom,
      dateTo: [baseRange.dateTo, shiftEconomicCalendarDateKey(todayKey, 7)].sort().at(-1) ?? baseRange.dateTo,
    };
  }, [now, rangeState, timeZone, viewMode]);
  const liveEnabled = useMemo(() => shouldEnableLiveUpdatesForViewMode(viewMode), [viewMode]);
  const instrumentUniverse = useMemo(() => (
    Array.from(new Set((recentTradesQuery.data ?? []).map((trade) => trade.pair))).slice(0, 8)
  ), [recentTradesQuery.data]);
  const primaryInstrument = instrumentUniverse[0];

  const updateCalendarState = (nextState: {
    range?: typeof rangeState;
    viewMode?: EconomicCalendarViewMode;
  }) => {
    const nextParams = writeEconomicCalendarRangeStateToSearch(
      new URLSearchParams(searchParams),
      nextState.range ?? rangeState,
    );

    setSearchParams(writeEconomicCalendarViewModeToSearch(nextParams, nextState.viewMode ?? viewMode));
  };

  const updateViewMode = (nextViewMode: EconomicCalendarViewMode) => {
    if (nextViewMode === "week") {
      updateCalendarState({
        viewMode: nextViewMode,
        range: createEconomicCalendarPresetRangeState("this_week", { now, timeZone }),
      });
      return;
    }

    if (nextViewMode === "upcoming" || nextViewMode === "past") {
      updateCalendarState({
        viewMode: nextViewMode,
        range: createEconomicCalendarPresetRangeState("today", { now, timeZone }),
      });
      return;
    }

    updateCalendarState({
      viewMode: nextViewMode,
      range: rangeState.mode === "custom"
        ? rangeState
        : createEconomicCalendarCustomRangeState(rangeState.startDate, rangeState.endDate, timeZone),
    });
  };

  const eventsQuery = useQuery({
    queryKey: privateQueryKey(user.id, "economic-calendar", "list", {
      selectedStartDate: rangeState.startDate,
      selectedEndDate: rangeState.endDate,
      queryStartDate: queryRange.dateFrom,
      queryEndDate: queryRange.dateTo,
      rangeMode: rangeState.mode,
      rangePreset: rangeState.preset,
      timeZone,
      currencyFilter,
      impactFilter,
      primaryInstrument,
      live: liveEnabled,
    }),
    queryFn: () => withMinimumDelay(() => getEconomicCalendarList({
      dateFrom: queryRange.dateFrom,
      dateTo: queryRange.dateTo,
      currencies: currencyFilter === "all" ? [] : [currencyFilter],
      impacts: impactFilter === "all" ? [] : [impactFilter],
      live: liveEnabled,
    })),
  });
  const filteredEvents = useMemo(() => (
    relevantOnly
      ? (eventsQuery.data?.items ?? []).filter((event) => getEconomicEventRelevanceList(event, instrumentUniverse, 1).length > 0)
      : (eventsQuery.data?.items ?? [])
  ), [eventsQuery.data?.items, instrumentUniverse, relevantOnly]);

  const visibleEvents = useMemo(() => {
    return filterEconomicCalendarEventsForViewMode(filteredEvents, {
      mode: viewMode,
      range: rangeState,
      now,
      timeZone,
    });
  }, [filteredEvents, now, rangeState, timeZone, viewMode]);
  const currencyOptions = useMemo(() => (
    Array.from(new Set(visibleEvents.map((event) => event.currency))).sort()
  ), [visibleEvents]);
  const nextImportantEvent = useMemo(() => {
    const upcomingEvents = filterEconomicCalendarEventsForViewMode(filteredEvents, {
      mode: "upcoming",
      range: rangeState,
      now,
      timeZone,
    });

    return getNextImportantEconomicEvent(upcomingEvents, now);
  }, [filteredEvents, now, rangeState, timeZone]);
  const emptyDescription = viewMode === "upcoming"
    ? `No upcoming macro events matched ${formatRangeLabel(rangeState)} with the current filters.`
    : `No macro events matched ${formatRangeLabel(rangeState)} with the current filters.`;

  useUnauthorizedSessionGuard(eventsQuery.error, recentTradesQuery.error);

  if (eventsQuery.isError) {
    const errorState = getPageErrorState(eventsQuery.error, {
      unavailableTitle: "Economic calendar unavailable",
      unavailableDescription: "The calendar feed is temporarily unavailable. Please try again in a moment.",
      unauthorizedDescription: "Your session expired or could not be verified. Redirecting to login.",
      timeoutTitle: "Economic calendar timed out",
      timeoutDescription: "Loading the calendar took too long. Please try again.",
    });

    return (
      <PageErrorState
        title={errorState.title}
        description={errorState.description}
        layout="page"
        size="wide"
        onRetry={errorState.allowRetry ? () => void eventsQuery.refetch() : undefined}
        isRetrying={eventsQuery.isFetching}
      />
    );
  }

  return (
    <PageShell size="wide">
      <EconomicCalendarHeader
        viewMode={viewMode}
        onViewModeChange={updateViewMode}
        timeZone={timeZone}
        onTimeZoneChange={setTimeZone}
        range={rangeState}
        onShiftBackward={() => updateCalendarState({ range: shiftRangeBackward(rangeState) })}
        onShiftForward={() => updateCalendarState({ range: shiftRangeForward(rangeState) })}
        onToday={() => updateCalendarState({ range: createEconomicCalendarPresetRangeState("today", { now, timeZone }) })}
        onPresetChange={(preset: EconomicCalendarRangePreset) => updateCalendarState({ range: createEconomicCalendarPresetRangeState(preset, {
          now,
          timeZone,
        }) })}
        onCustomRangeChange={({ startDate, endDate }) => updateCalendarState({
          range: createEconomicCalendarCustomRangeState(startDate, endDate, timeZone),
          viewMode: "custom",
        })}
        currencyFilter={currencyFilter}
        onCurrencyFilterChange={setCurrencyFilter}
        currencyOptions={currencyOptions}
        impactFilter={impactFilter}
        onImpactFilterChange={setImpactFilter}
        relevantOnly={relevantOnly}
        onRelevantOnlyChange={setRelevantOnly}
        relevanceDisabled={!primaryInstrument}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.95fr)_minmax(300px,1fr)] lg:items-start">
        <div className="order-2 space-y-4 lg:order-1">
          {eventsQuery.isLoading && !eventsQuery.data ? (
            <div className="border-b border-border/35 pb-4 text-sm text-muted-foreground">
              Loading events for the selected period...
            </div>
          ) : (
            <EconomicCalendarTimeline
              events={visibleEvents}
              instrumentUniverse={instrumentUniverse}
              timeZone={timeZone}
              emptyTitle="No events for this range"
              emptyDescription={emptyDescription}
            />
          )}
        </div>

        <div className="order-1 lg:order-2">
          <EconomicCalendarUtilityPanel
            nextImportantEvent={nextImportantEvent}
            now={now}
            timeZone={timeZone}
          />
        </div>
      </div>
    </PageShell>
  );
}

export default function EconomicCalendar() {
  if (FEATURES.economicCalendar === "hidden") {
    return <Navigate to="/dashboard" replace />;
  }

  if (FEATURES.economicCalendar === "development") {
    return <EconomicCalendarComingSoonPage />;
  }

  return <EconomicCalendarLivePage />;
}
