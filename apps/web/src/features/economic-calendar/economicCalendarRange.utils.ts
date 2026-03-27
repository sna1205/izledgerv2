import { parseISO } from "date-fns";
import type { EconomicCalendarEvent } from "@/types";
import { getLocalDateKey } from "@/features/economic-calendar/utils";

export type EconomicCalendarRangeMode = "preset" | "custom";
export type EconomicCalendarRangePreset =
  | "yesterday"
  | "today"
  | "tomorrow"
  | "last_week"
  | "this_week"
  | "next_week"
  | "last_7_days"
  | "next_7_days";

export type EconomicCalendarRangeState = {
  mode: EconomicCalendarRangeMode;
  preset: EconomicCalendarRangePreset | null;
  startDate: string;
  endDate: string;
  timeZone: string;
};

export const MAX_ECONOMIC_CALENDAR_RANGE_DAYS = 31;
const UTC_DAY_MS = 24 * 60 * 60 * 1000;

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function fromDateKey(dateKey: string) {
  return parseISO(`${dateKey}T00:00:00.000Z`);
}

function shiftUtcDate(date: Date, amount: number) {
  return new Date(date.getTime() + (amount * UTC_DAY_MS));
}

function differenceUtcCalendarDays(left: Date, right: Date) {
  return Math.round((left.getTime() - right.getTime()) / UTC_DAY_MS);
}

function getUtcWeekStart(date: Date, weekStartsOn = 1) {
  const delta = (date.getUTCDay() - weekStartsOn + 7) % 7;
  return shiftUtcDate(date, -delta);
}

function formatUtcDate(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", {
    ...options,
    timeZone: "UTC",
  }).format(date);
}

export function isValidEconomicCalendarDateKey(value: string | null | undefined) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = fromDateKey(value);
  return Number.isFinite(parsed.getTime()) && toDateKey(parsed) === value;
}

export function shiftEconomicCalendarDateKey(dateKey: string, amount: number) {
  return toDateKey(shiftUtcDate(fromDateKey(dateKey), amount));
}

export function clampEconomicCalendarRange(startDate: string, endDate: string) {
  const normalizedStart = startDate <= endDate ? startDate : endDate;
  const normalizedEnd = startDate <= endDate ? endDate : startDate;
  const spanDays = differenceUtcCalendarDays(fromDateKey(normalizedEnd), fromDateKey(normalizedStart)) + 1;

  if (spanDays <= MAX_ECONOMIC_CALENDAR_RANGE_DAYS) {
    return {
      startDate: normalizedStart,
      endDate: normalizedEnd,
    };
  }

  return {
    startDate: normalizedStart,
    endDate: shiftEconomicCalendarDateKey(normalizedStart, MAX_ECONOMIC_CALENDAR_RANGE_DAYS - 1),
  };
}

export function getRangeFromPreset(
  preset: EconomicCalendarRangePreset,
  options: { now?: Date; timeZone: string },
) {
  const todayKey = getLocalDateKey(options.now ?? new Date(), options.timeZone);
  const today = fromDateKey(todayKey);

  if (preset === "yesterday") {
    const dateKey = shiftEconomicCalendarDateKey(todayKey, -1);
    return { startDate: dateKey, endDate: dateKey };
  }

  if (preset === "today") {
    return { startDate: todayKey, endDate: todayKey };
  }

  if (preset === "tomorrow") {
    const dateKey = shiftEconomicCalendarDateKey(todayKey, 1);
    return { startDate: dateKey, endDate: dateKey };
  }

  if (preset === "last_week") {
    const weekStart = shiftUtcDate(getUtcWeekStart(today, 1), -7);
    const weekEnd = shiftUtcDate(weekStart, 6);
    return { startDate: toDateKey(weekStart), endDate: toDateKey(weekEnd) };
  }

  if (preset === "this_week") {
    const weekStart = getUtcWeekStart(today, 1);
    const weekEnd = shiftUtcDate(weekStart, 6);
    return { startDate: toDateKey(weekStart), endDate: toDateKey(weekEnd) };
  }

  if (preset === "next_week") {
    const weekStart = shiftUtcDate(getUtcWeekStart(today, 1), 7);
    const weekEnd = shiftUtcDate(weekStart, 6);
    return { startDate: toDateKey(weekStart), endDate: toDateKey(weekEnd) };
  }

  if (preset === "last_7_days") {
    return { startDate: shiftEconomicCalendarDateKey(todayKey, -6), endDate: todayKey };
  }

  return { startDate: todayKey, endDate: shiftEconomicCalendarDateKey(todayKey, 6) };
}

export function createEconomicCalendarRangeState(input: {
  mode: EconomicCalendarRangeMode;
  preset?: EconomicCalendarRangePreset | null;
  startDate: string;
  endDate: string;
  timeZone: string;
}) {
  const clamped = clampEconomicCalendarRange(input.startDate, input.endDate);

  return {
    mode: input.mode,
    preset: input.mode === "preset" ? input.preset ?? "today" : null,
    startDate: clamped.startDate,
    endDate: clamped.endDate,
    timeZone: input.timeZone,
  } satisfies EconomicCalendarRangeState;
}

export function createEconomicCalendarPresetRangeState(
  preset: EconomicCalendarRangePreset,
  options: { now?: Date; timeZone: string },
) {
  const range = getRangeFromPreset(preset, options);

  return createEconomicCalendarRangeState({
    mode: "preset",
    preset,
    startDate: range.startDate,
    endDate: range.endDate,
    timeZone: options.timeZone,
  });
}

export function createEconomicCalendarCustomRangeState(
  startDate: string,
  endDate: string,
  timeZone: string,
) {
  return createEconomicCalendarRangeState({
    mode: "custom",
    startDate,
    endDate,
    timeZone,
  });
}

function shiftEconomicCalendarRangeState(
  state: EconomicCalendarRangeState,
  direction: -1 | 1,
) {
  const rangeLengthDays = differenceUtcCalendarDays(fromDateKey(state.endDate), fromDateKey(state.startDate)) + 1;
  const presetTransitions: Partial<Record<EconomicCalendarRangePreset, Partial<Record<"-1" | "1", EconomicCalendarRangePreset>>>> = {
    yesterday: { 1: "today" },
    today: { "-1": "yesterday", 1: "tomorrow" },
    tomorrow: { "-1": "today" },
    last_week: { 1: "this_week" },
    this_week: { "-1": "last_week", 1: "next_week" },
    next_week: { "-1": "this_week" },
  };

  if (state.mode === "preset" && state.preset) {
    const nextPreset = presetTransitions[state.preset]?.[String(direction) as "-1" | "1"];

    if (nextPreset) {
      return createEconomicCalendarRangeState({
        mode: "preset",
        preset: nextPreset,
        startDate: shiftEconomicCalendarDateKey(state.startDate, rangeLengthDays * direction),
        endDate: shiftEconomicCalendarDateKey(state.endDate, rangeLengthDays * direction),
        timeZone: state.timeZone,
      });
    }
  }

  return createEconomicCalendarCustomRangeState(
    shiftEconomicCalendarDateKey(state.startDate, rangeLengthDays * direction),
    shiftEconomicCalendarDateKey(state.endDate, rangeLengthDays * direction),
    state.timeZone,
  );
}

export function shiftRangeBackward(state: EconomicCalendarRangeState) {
  return shiftEconomicCalendarRangeState(state, -1);
}

export function shiftRangeForward(state: EconomicCalendarRangeState) {
  return shiftEconomicCalendarRangeState(state, 1);
}

export function formatRangeLabel(state: Pick<EconomicCalendarRangeState, "startDate" | "endDate">) {
  const start = fromDateKey(state.startDate);
  const end = fromDateKey(state.endDate);
  const startYear = formatUtcDate(start, { year: "numeric" });
  const endYear = formatUtcDate(end, { year: "numeric" });
  const startMonth = formatUtcDate(start, { month: "short" });
  const endMonth = formatUtcDate(end, { month: "short" });
  const startMonthDay = formatUtcDate(start, { month: "short", day: "numeric" });
  const endMonthDay = formatUtcDate(end, { month: "short", day: "numeric" });
  const endDay = formatUtcDate(end, { day: "numeric" });

  if (state.startDate === state.endDate) {
    return formatUtcDate(start, { weekday: "short", month: "short", day: "numeric" });
  }

  if (startYear === endYear) {
    if (startMonth === endMonth) {
      return `${startMonthDay} - ${endDay}, ${endYear}`;
    }

    return `${startMonthDay} - ${endMonthDay}, ${endYear}`;
  }

  return `${startMonthDay}, ${startYear} - ${endMonthDay}, ${endYear}`;
}

export function getEconomicCalendarPresetLabel(preset: EconomicCalendarRangePreset) {
  if (preset === "yesterday") return "Yesterday";
  if (preset === "today") return "Today";
  if (preset === "tomorrow") return "Tomorrow";
  if (preset === "last_week") return "Last Week";
  if (preset === "this_week") return "This Week";
  if (preset === "next_week") return "Next Week";
  if (preset === "last_7_days") return "Last 7 Days";
  return "Next 7 Days";
}

export function getEconomicCalendarQueryRange(state: Pick<EconomicCalendarRangeState, "startDate" | "endDate">) {
  return {
    dateFrom: shiftEconomicCalendarDateKey(state.startDate, -1),
    dateTo: shiftEconomicCalendarDateKey(state.endDate, 1),
  };
}

export function isEconomicCalendarDateInRange(
  dateKey: string,
  state: Pick<EconomicCalendarRangeState, "startDate" | "endDate">,
) {
  return dateKey >= state.startDate && dateKey <= state.endDate;
}

export function filterEconomicCalendarEventsForRange(
  events: EconomicCalendarEvent[],
  state: Pick<EconomicCalendarRangeState, "startDate" | "endDate">,
  timeZone?: string,
) {
  return events.filter((event) => isEconomicCalendarDateInRange(getLocalDateKey(event.eventTimeUtc, timeZone), state));
}

export function isHistoricalOnlyRange(
  state: Pick<EconomicCalendarRangeState, "startDate" | "endDate" | "timeZone">,
  now = new Date(),
) {
  const todayKey = getLocalDateKey(now, state.timeZone);
  return state.endDate < todayKey;
}

export function shouldEnableLiveUpdatesForRange(
  state: Pick<EconomicCalendarRangeState, "startDate" | "endDate" | "timeZone">,
  now = new Date(),
) {
  const todayKey = getLocalDateKey(now, state.timeZone);
  return isEconomicCalendarDateInRange(todayKey, state);
}
