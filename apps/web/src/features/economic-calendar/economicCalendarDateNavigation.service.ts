import type { EconomicCalendarRangePreset, EconomicCalendarRangeState } from "@/features/economic-calendar/economicCalendarRange.utils";
import {
  createEconomicCalendarCustomRangeState,
  createEconomicCalendarPresetRangeState,
  isValidEconomicCalendarDateKey,
} from "@/features/economic-calendar/economicCalendarRange.utils";
import {
  DEFAULT_ECONOMIC_CALENDAR_VIEW_MODE,
  isEconomicCalendarViewMode,
  type EconomicCalendarViewMode,
} from "@/features/economic-calendar/economicCalendarViewMode.utils";

const VIEW_MODE_PARAM = "mode";
const RANGE_MODE_PARAM = "rangeMode";
const RANGE_PRESET_PARAM = "rangePreset";
const RANGE_START_PARAM = "rangeStart";
const RANGE_END_PARAM = "rangeEnd";

const RANGE_PRESETS = new Set<EconomicCalendarRangePreset>([
  "yesterday",
  "today",
  "tomorrow",
  "last_week",
  "this_week",
  "next_week",
  "last_7_days",
  "next_7_days",
]);
const WEEK_RANGE_PRESETS = new Set<EconomicCalendarRangePreset>([
  "last_week",
  "this_week",
  "next_week",
]);

export function readEconomicCalendarRangeStateFromSearch(input: {
  searchParams: URLSearchParams;
  timeZone: string;
  now?: Date;
}) {
  const mode = input.searchParams.get(RANGE_MODE_PARAM);
  const preset = input.searchParams.get(RANGE_PRESET_PARAM);
  const startDate = input.searchParams.get(RANGE_START_PARAM);
  const endDate = input.searchParams.get(RANGE_END_PARAM);

  if (mode === "custom" && isValidEconomicCalendarDateKey(startDate) && isValidEconomicCalendarDateKey(endDate)) {
    return createEconomicCalendarCustomRangeState(startDate, endDate, input.timeZone);
  }

  if (preset && RANGE_PRESETS.has(preset as EconomicCalendarRangePreset)) {
    return createEconomicCalendarPresetRangeState(preset as EconomicCalendarRangePreset, {
      now: input.now,
      timeZone: input.timeZone,
    });
  }

  return createEconomicCalendarPresetRangeState("today", {
    now: input.now,
    timeZone: input.timeZone,
  });
}

export function readEconomicCalendarViewModeFromSearch(searchParams: URLSearchParams) {
  const mode = searchParams.get(VIEW_MODE_PARAM);
  const rangeMode = searchParams.get(RANGE_MODE_PARAM);
  const preset = searchParams.get(RANGE_PRESET_PARAM);
  const startDate = searchParams.get(RANGE_START_PARAM);
  const endDate = searchParams.get(RANGE_END_PARAM);

  if (isEconomicCalendarViewMode(mode)) {
    return mode;
  }

  if (rangeMode === "custom" && isValidEconomicCalendarDateKey(startDate) && isValidEconomicCalendarDateKey(endDate)) {
    return "custom";
  }

  if (preset && WEEK_RANGE_PRESETS.has(preset as EconomicCalendarRangePreset)) {
    return "week";
  }

  return DEFAULT_ECONOMIC_CALENDAR_VIEW_MODE;
}

export function writeEconomicCalendarRangeStateToSearch(
  currentSearchParams: URLSearchParams,
  state: EconomicCalendarRangeState,
) {
  const nextParams = new URLSearchParams(currentSearchParams);

  nextParams.delete(RANGE_MODE_PARAM);
  nextParams.delete(RANGE_PRESET_PARAM);
  nextParams.delete(RANGE_START_PARAM);
  nextParams.delete(RANGE_END_PARAM);

  if (state.mode === "custom") {
    nextParams.set(RANGE_MODE_PARAM, "custom");
    nextParams.set(RANGE_START_PARAM, state.startDate);
    nextParams.set(RANGE_END_PARAM, state.endDate);
    return nextParams;
  }

  if (state.preset) {
    nextParams.set(RANGE_PRESET_PARAM, state.preset);
  }

  return nextParams;
}

export function writeEconomicCalendarViewModeToSearch(
  currentSearchParams: URLSearchParams,
  mode: EconomicCalendarViewMode,
) {
  const nextParams = new URLSearchParams(currentSearchParams);

  if (mode === DEFAULT_ECONOMIC_CALENDAR_VIEW_MODE) {
    nextParams.delete(VIEW_MODE_PARAM);
    return nextParams;
  }

  nextParams.set(VIEW_MODE_PARAM, mode);
  return nextParams;
}

export function buildEconomicCalendarRangeSearch(state: EconomicCalendarRangeState) {
  const params = writeEconomicCalendarRangeStateToSearch(new URLSearchParams(), state);
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export function buildEconomicCalendarDateSearch(dateKey: string, timeZone: string) {
  return buildEconomicCalendarRangeSearch(createEconomicCalendarCustomRangeState(dateKey, dateKey, timeZone));
}
