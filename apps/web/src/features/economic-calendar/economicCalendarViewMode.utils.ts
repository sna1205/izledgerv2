import { parseISO } from "date-fns";
import type { EconomicCalendarEvent } from "@/types";
import {
  getLocalDateKey,
} from "@/features/economic-calendar/utils";
import {
  filterEconomicCalendarEventsForRange,
  isEconomicCalendarDateInRange,
  shiftEconomicCalendarDateKey,
  type EconomicCalendarRangeState,
} from "@/features/economic-calendar/economicCalendarRange.utils";

export type EconomicCalendarViewMode = "upcoming" | "past" | "week" | "custom";

export const DEFAULT_ECONOMIC_CALENDAR_VIEW_MODE: EconomicCalendarViewMode = "upcoming";

const ECONOMIC_CALENDAR_VIEW_MODES = new Set<EconomicCalendarViewMode>([
  "upcoming",
  "past",
  "week",
  "custom",
]);

function getEconomicEventTimestamp(event: EconomicCalendarEvent) {
  return parseISO(event.eventTimeUtc).getTime();
}

function sortEconomicCalendarEventsChronologically(events: EconomicCalendarEvent[]) {
  return [...events].sort((left, right) => getEconomicEventTimestamp(left) - getEconomicEventTimestamp(right));
}

export function isEconomicCalendarViewMode(value: string | null | undefined): value is EconomicCalendarViewMode {
  return typeof value === "string" && ECONOMIC_CALENDAR_VIEW_MODES.has(value as EconomicCalendarViewMode);
}

export function getEconomicCalendarViewModeLabel(mode: EconomicCalendarViewMode) {
  if (mode === "past") return "Past";
  if (mode === "week") return "Week";
  if (mode === "custom") return "Custom";
  return "Upcoming";
}

export function shouldEnableLiveUpdatesForViewMode(mode: EconomicCalendarViewMode) {
  return mode === "upcoming";
}

export function filterEconomicCalendarEventsForViewMode(
  events: EconomicCalendarEvent[],
  input: {
    mode: EconomicCalendarViewMode;
    range: Pick<EconomicCalendarRangeState, "startDate" | "endDate">;
    now?: Date;
    timeZone?: string;
  },
) {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const rangeEvents = filterEconomicCalendarEventsForRange(events, input.range, input.timeZone);

  if (input.mode === "past") {
    return sortEconomicCalendarEventsChronologically(
      rangeEvents.filter((event) => getEconomicEventTimestamp(event) < nowMs),
    );
  }

  if (input.mode !== "upcoming") {
    return sortEconomicCalendarEventsChronologically(rangeEvents);
  }

  const upcomingRangeEvents = sortEconomicCalendarEventsChronologically(
    rangeEvents.filter((event) => getEconomicEventTimestamp(event) >= nowMs),
  );

  if (upcomingRangeEvents.length > 0) {
    return upcomingRangeEvents;
  }

  const todayKey = getLocalDateKey(now, input.timeZone);

  if (!isEconomicCalendarDateInRange(todayKey, input.range)) {
    return [];
  }

  const futureEvents = sortEconomicCalendarEventsChronologically(
    events.filter((event) => getEconomicEventTimestamp(event) >= nowMs),
  );

  const tomorrowKey = shiftEconomicCalendarDateKey(todayKey, 1);
  const tomorrowEvents = futureEvents.filter((event) => getLocalDateKey(event.eventTimeUtc, input.timeZone) === tomorrowKey);

  if (tomorrowEvents.length > 0) {
    return tomorrowEvents;
  }

  const nextFutureDateKey = Array.from(new Set(
    futureEvents
      .map((event) => getLocalDateKey(event.eventTimeUtc, input.timeZone))
      .filter((dateKey) => dateKey > todayKey),
  )).sort()[0] ?? null;

  if (!nextFutureDateKey) {
    return [];
  }

  return futureEvents.filter((event) => getLocalDateKey(event.eventTimeUtc, input.timeZone) === nextFutureDateKey);
}
