import type { EconomicCalendarEvent, EconomicEventImpact, EconomicEventStatus } from "./types/domain.js";

export type EconomicCalendarLiveMode = "normal" | "watch" | "live" | "cooldown";
export type EconomicCalendarActualComparison = "above_forecast" | "below_forecast" | "inline";

export const ECONOMIC_CALENDAR_WATCH_START_MINUTES = 15;
export const ECONOMIC_CALENDAR_PENDING_RELEASE_LEAD_MINUTES = 2;
export const ECONOMIC_CALENDAR_LIVE_WINDOW_MINUTES = 10;
export const ECONOMIC_CALENDAR_PENDING_RELEASE_MAX_MINUTES = 45;
export const ECONOMIC_CALENDAR_COOLDOWN_MINUTES = 20;

export const ECONOMIC_CALENDAR_WATCH_POLL_INTERVAL_MS = 30_000;
export const ECONOMIC_CALENDAR_LIVE_POLL_INTERVAL_MS = 15_000;
export const ECONOMIC_CALENDAR_COOLDOWN_POLL_INTERVAL_MS = 45_000;
export const ECONOMIC_CALENDAR_LIVE_MAX_CANDIDATES = 3;

function toTimeMs(value: string) {
  const timeMs = new Date(value).getTime();
  return Number.isFinite(timeMs) ? timeMs : null;
}

export function isEconomicCalendarLiveEligibleImpact(impactLevel: EconomicEventImpact) {
  return impactLevel === "high" || impactLevel === "medium";
}

export function deriveEconomicEventStatus(input: {
  impactLevel: EconomicEventImpact;
  eventTimeUtc: string;
  actualValue: string | null;
  revisedValue: string | null;
  now?: Date;
}): EconomicEventStatus {
  if (input.impactLevel === "holiday") {
    return "holiday";
  }

  if (input.revisedValue) {
    return "revised";
  }

  if (input.actualValue) {
    return "released";
  }

  const eventTimeMs = toTimeMs(input.eventTimeUtc);

  if (eventTimeMs === null) {
    return "passed";
  }

  const nowMs = (input.now ?? new Date()).getTime();
  const diffMs = eventTimeMs - nowMs;

  if (diffMs > ECONOMIC_CALENDAR_PENDING_RELEASE_LEAD_MINUTES * 60_000) {
    return "upcoming";
  }

  if (diffMs >= -ECONOMIC_CALENDAR_PENDING_RELEASE_MAX_MINUTES * 60_000) {
    return "pending_release";
  }

  return "passed";
}

export function getEconomicCalendarLiveMode(input: {
  impactLevel: EconomicEventImpact;
  eventTimeUtc: string;
  actualValue: string | null;
  revisedValue: string | null;
  lastUpdatedAt?: string | null;
  now?: Date;
}): EconomicCalendarLiveMode {
  if (!isEconomicCalendarLiveEligibleImpact(input.impactLevel)) {
    return "normal";
  }

  const eventTimeMs = toTimeMs(input.eventTimeUtc);

  if (eventTimeMs === null) {
    return "normal";
  }

  const nowMs = (input.now ?? new Date()).getTime();
  const diffMs = eventTimeMs - nowMs;

  if (input.actualValue || input.revisedValue) {
    const updateTimeMs = input.lastUpdatedAt ? toTimeMs(input.lastUpdatedAt) : null;
    const cooldownAnchorMs = updateTimeMs ?? eventTimeMs;

    if (nowMs - cooldownAnchorMs <= ECONOMIC_CALENDAR_COOLDOWN_MINUTES * 60_000) {
      return "cooldown";
    }

    return "normal";
  }

  if (diffMs > ECONOMIC_CALENDAR_WATCH_START_MINUTES * 60_000) {
    return "normal";
  }

  if (diffMs > ECONOMIC_CALENDAR_PENDING_RELEASE_LEAD_MINUTES * 60_000) {
    return "watch";
  }

  if (diffMs >= -ECONOMIC_CALENDAR_LIVE_WINDOW_MINUTES * 60_000) {
    return "live";
  }

  if (diffMs >= -ECONOMIC_CALENDAR_PENDING_RELEASE_MAX_MINUTES * 60_000) {
    return "cooldown";
  }

  return "normal";
}

function parseEconomicComparableValue(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!normalized || /[<>]/.test(normalized)) {
    return null;
  }

  const match = normalized.replace(/,/g, "").match(/[-+]?\d+(?:\.\d+)?/);

  if (!match) {
    return null;
  }

  const parsed = Number(match[0]);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  let multiplier = 1;

  if (/[kK]\b/.test(normalized)) {
    multiplier = 1_000;
  } else if (/[mM]\b/.test(normalized)) {
    multiplier = 1_000_000;
  } else if (/[bB]\b/.test(normalized)) {
    multiplier = 1_000_000_000;
  }

  return parsed * multiplier;
}

export function compareEconomicActualToForecast(actualValue: string | null, forecastValue: string | null) {
  const actual = parseEconomicComparableValue(actualValue);
  const forecast = parseEconomicComparableValue(forecastValue);

  if (actual === null || forecast === null) {
    return null;
  }

  if (Math.abs(actual - forecast) < Number.EPSILON) {
    return "inline" satisfies EconomicCalendarActualComparison;
  }

  return actual > forecast ? "above_forecast" : "below_forecast";
}

export function getEconomicCalendarLivePollIntervalMs(mode: EconomicCalendarLiveMode) {
  if (mode === "live") {
    return ECONOMIC_CALENDAR_LIVE_POLL_INTERVAL_MS;
  }

  if (mode === "watch") {
    return ECONOMIC_CALENDAR_WATCH_POLL_INTERVAL_MS;
  }

  if (mode === "cooldown") {
    return ECONOMIC_CALENDAR_COOLDOWN_POLL_INTERVAL_MS;
  }

  return null;
}

export function getEconomicEventLiveMode(event: Pick<
  EconomicCalendarEvent,
  "impactLevel" | "eventTimeUtc" | "actualValue" | "revisedValue" | "lastUpdatedAt"
>, now?: Date) {
  return getEconomicCalendarLiveMode({
    impactLevel: event.impactLevel,
    eventTimeUtc: event.eventTimeUtc,
    actualValue: event.actualValue,
    revisedValue: event.revisedValue,
    lastUpdatedAt: event.lastUpdatedAt,
    now,
  });
}
