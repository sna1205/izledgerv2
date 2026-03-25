import { describe, expect, it } from "vitest";
import type { EconomicCalendarEvent } from "@/types";
import {
  getLiveWatchCandidates,
  getNextEconomicCalendarLiveCheckDelayMs,
} from "@/features/economic-calendar/economic-calendar-live.selector";

function buildEvent(overrides: Partial<EconomicCalendarEvent> = {}): EconomicCalendarEvent {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    providerEventId: overrides.providerEventId ?? crypto.randomUUID(),
    title: overrides.title ?? "Core CPI y/y",
    country: overrides.country ?? "USD",
    currency: overrides.currency ?? "USD",
    impactLevel: overrides.impactLevel ?? "high",
    eventTimeUtc: overrides.eventTimeUtc ?? "2026-03-25T12:10:00.000Z",
    previousValue: overrides.previousValue ?? "3.0%",
    forecastValue: overrides.forecastValue ?? "3.1%",
    actualValue: overrides.actualValue ?? null,
    revisedValue: overrides.revisedValue ?? null,
    status: overrides.status ?? "upcoming",
    category: overrides.category ?? "inflation",
    sourceProvider: overrides.sourceProvider ?? "fair-economy",
    lastUpdatedAt: overrides.lastUpdatedAt ?? "2026-03-25T12:00:00.000Z",
    createdAt: overrides.createdAt ?? "2026-03-25T12:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-03-25T12:00:00.000Z",
    relevance: overrides.relevance ?? null,
  };
}

describe("economic calendar live selector", () => {
  it("selects only meaningful high and medium impact watch candidates", () => {
    const now = new Date("2026-03-25T12:00:00.000Z");
    const candidates = getLiveWatchCandidates([
      buildEvent({ id: "high-live", eventTimeUtc: "2026-03-25T12:01:00.000Z", impactLevel: "high" }),
      buildEvent({ id: "medium-watch", eventTimeUtc: "2026-03-25T12:12:00.000Z", impactLevel: "medium", currency: "EUR", country: "EUR" }),
      buildEvent({ id: "low-ignore", eventTimeUtc: "2026-03-25T12:03:00.000Z", impactLevel: "low" }),
      buildEvent({ id: "far-ignore", eventTimeUtc: "2026-03-25T13:00:00.000Z", impactLevel: "high" }),
    ], now, ["XAUUSD"]);

    expect(candidates.map((candidate) => candidate.event.id)).toEqual(["high-live", "medium-watch"]);
    expect(candidates[0]?.mode).toBe("live");
    expect(candidates[1]?.mode).toBe("watch");
  });

  it("prefers relevant high-impact candidates and drops expired cooldown events", () => {
    const now = new Date("2026-03-25T12:40:00.000Z");
    const candidates = getLiveWatchCandidates([
      buildEvent({
        id: "released-relevant",
        title: "CPI y/y",
        eventTimeUtc: "2026-03-25T12:30:00.000Z",
        actualValue: "3.2%",
        status: "released",
        lastUpdatedAt: "2026-03-25T12:35:00.000Z",
      }),
      buildEvent({
        id: "expired-past",
        title: "Consumer Confidence",
        eventTimeUtc: "2026-03-25T11:30:00.000Z",
        status: "passed",
      }),
    ], now, ["XAUUSD"]);

    expect(candidates.map((candidate) => candidate.event.id)).toEqual(["released-relevant"]);
    expect(candidates[0]?.mode).toBe("cooldown");
  });

  it("returns a bounded next local check delay before the next watch window", () => {
    const delayMs = getNextEconomicCalendarLiveCheckDelayMs([
      buildEvent({
        id: "next-watch",
        eventTimeUtc: "2026-03-25T12:20:00.000Z",
        impactLevel: "high",
      }),
    ], new Date("2026-03-25T12:00:00.000Z"));

    expect(delayMs).toBeGreaterThanOrEqual(15_000);
    expect(delayMs).toBeLessThanOrEqual(60_000);
  });
});
