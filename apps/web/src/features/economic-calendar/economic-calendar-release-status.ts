import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { compareEconomicActualToForecast } from "@izledger/shared";
import type { EconomicCalendarActualComparison } from "@izledger/shared";
import type { EconomicCalendarEvent, EconomicEventStatus } from "@/types";

export function getEconomicStatusLabel(status: EconomicEventStatus) {
  if (status === "pending_release") return "Pending";
  if (status === "released") return "Released";
  if (status === "revised") return "Revised";
  if (status === "passed") return "Passed";
  if (status === "holiday") return "Holiday";
  return "Upcoming";
}

export function getEconomicPendingValueLabel(event: EconomicCalendarEvent, now = new Date()) {
  if (event.actualValue) {
    return event.actualValue;
  }

  const eventTimeMs = parseISO(event.eventTimeUtc).getTime();

  if (!Number.isFinite(eventTimeMs)) {
    return "\u2014";
  }

  return eventTimeMs > now.getTime() ? "Pending" : "Awaiting update";
}

export function getEconomicReleaseWaitingCopy(event: EconomicCalendarEvent, now = new Date()) {
  if (event.actualValue || event.revisedValue) {
    return null;
  }

  const eventTimeMs = parseISO(event.eventTimeUtc).getTime();

  if (!Number.isFinite(eventTimeMs)) {
    return "Awaiting provider update";
  }

  return eventTimeMs > now.getTime()
    ? "Awaiting release"
    : "Awaiting provider update";
}

export function isEconomicEventRecentlyUpdated(event: EconomicCalendarEvent, now = new Date(), windowMs = 90_000) {
  if (!event.actualValue && !event.revisedValue) {
    return false;
  }

  const updatedMs = parseISO(event.lastUpdatedAt || event.updatedAt).getTime();

  if (!Number.isFinite(updatedMs)) {
    return false;
  }

  return now.getTime() - updatedMs <= windowMs;
}

export function getEconomicEventUpdatedLabel(event: EconomicCalendarEvent, now = new Date()) {
  if (!event.actualValue && !event.revisedValue) {
    return null;
  }

  const updatedAt = event.lastUpdatedAt || event.updatedAt;
  const updatedMs = parseISO(updatedAt).getTime();

  if (!Number.isFinite(updatedMs)) {
    return null;
  }

  if (now.getTime() - updatedMs <= 90_000) {
    return "Updated just now";
  }

  if (now.getTime() - updatedMs <= 60 * 60_000) {
    return `Updated ${formatDistanceToNowStrict(parseISO(updatedAt), { addSuffix: true })}`;
  }

  return null;
}

export function getEconomicForecastComparison(event: EconomicCalendarEvent) {
  return compareEconomicActualToForecast(event.actualValue, event.forecastValue);
}

export function getEconomicForecastComparisonCopy(comparison: EconomicCalendarActualComparison | null) {
  if (comparison === "above_forecast") {
    return "Actual came in above forecast";
  }

  if (comparison === "below_forecast") {
    return "Actual came in below forecast";
  }

  if (comparison === "inline") {
    return "Actual matched expectations";
  }

  return null;
}
