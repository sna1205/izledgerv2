import { describe, expect, it } from "vitest";
import type { EconomicCalendarEvent } from "@/types";
import {
  filterEconomicCalendarEvents,
  formatEconomicCompactCountdown,
  formatEconomicCalendarTimeZoneLabel,
  formatEconomicEventTime,
  getEconomicCalendarTimeZoneOptions,
  getEconomicCurrencyBadgeClassName,
  getEconomicEventRelevance,
  getTradeEventWarning,
  groupEconomicCalendarEventsByDay,
  readEconomicCalendarTimeZonePreference,
  writeEconomicCalendarTimeZonePreference,
} from "@/features/economic-calendar/utils";

const buildEvent = (overrides: Partial<EconomicCalendarEvent>): EconomicCalendarEvent => ({
  id: overrides.id ?? crypto.randomUUID(),
  providerEventId: overrides.providerEventId ?? crypto.randomUUID(),
  title: overrides.title ?? "Core CPI y/y",
  country: overrides.country ?? "USD",
  currency: overrides.currency ?? "USD",
  impactLevel: overrides.impactLevel ?? "high",
  eventTimeUtc: overrides.eventTimeUtc ?? "2026-03-25T23:30:00.000Z",
  previousValue: overrides.previousValue ?? "3.0%",
  forecastValue: overrides.forecastValue ?? "3.1%",
  actualValue: overrides.actualValue ?? null,
  revisedValue: overrides.revisedValue ?? null,
  status: overrides.status ?? "upcoming",
  category: overrides.category ?? "inflation",
  sourceProvider: overrides.sourceProvider ?? "fair-economy",
  lastUpdatedAt: overrides.lastUpdatedAt ?? "2026-03-25T08:00:00.000Z",
  createdAt: overrides.createdAt ?? "2026-03-25T08:00:00.000Z",
  updatedAt: overrides.updatedAt ?? "2026-03-25T08:00:00.000Z",
  relevance: overrides.relevance ?? null,
});

describe("economic calendar utilities", () => {
  it("formats trading timezone labels cleanly", () => {
    expect(formatEconomicCalendarTimeZoneLabel("Asia/Bangkok")).toBe("Bangkok (GMT+7)");
  });

  it("formats event times in the requested timezone", () => {
    const label = formatEconomicEventTime(buildEvent({ eventTimeUtc: "2026-03-25T23:30:00.000Z" }), "Asia/Bangkok");
    expect(label).toBe("6:30 AM");
  });

  it("formats compact countdown copy for upcoming events", () => {
    const label = formatEconomicCompactCountdown(
      buildEvent({ eventTimeUtc: "2026-03-25T12:19:00.000Z" }),
      new Date("2026-03-25T12:00:00.000Z"),
    );

    expect(label).toBe("in 19m");
  });

  it("assigns distinct badge colors for different currencies", () => {
    expect(getEconomicCurrencyBadgeClassName("EUR")).toContain("indigo");
    expect(getEconomicCurrencyBadgeClassName("CHF")).toContain("amber");
    expect(getEconomicCurrencyBadgeClassName("USD")).toContain("sky");
  });

  it("groups events by the selected timezone day", () => {
    const groups = groupEconomicCalendarEventsByDay([
      buildEvent({ id: "late", eventTimeUtc: "2026-03-25T23:30:00.000Z" }),
      buildEvent({ id: "earlier", eventTimeUtc: "2026-03-25T09:00:00.000Z" }),
    ], "Asia/Bangkok");

    expect(groups[0]?.label).toBe("Wednesday, Mar 25");
    expect(groups[1]?.label).toBe("Thursday, Mar 26");
  });

  it("filters by local day, week, currency, and impact", () => {
    const events = [
      buildEvent({ id: "one", eventTimeUtc: "2026-03-25T23:30:00.000Z", currency: "USD", impactLevel: "high" }),
      buildEvent({ id: "two", eventTimeUtc: "2026-03-27T02:00:00.000Z", currency: "EUR", impactLevel: "medium" }),
      buildEvent({ id: "three", eventTimeUtc: "2026-03-29T02:00:00.000Z", currency: "USD", impactLevel: "low" }),
    ];

    const today = filterEconomicCalendarEvents(events, {
      range: "today",
      currency: "USD",
      impact: "high",
      now: new Date("2026-03-25T20:00:00.000Z"),
      timeZone: "Asia/Bangkok",
    });

    const week = filterEconomicCalendarEvents(events, {
      range: "week",
      now: new Date("2026-03-25T20:00:00.000Z"),
      timeZone: "Asia/Bangkok",
    });

    expect(today.map((event) => event.id)).toEqual(["one"]);
    expect(week.map((event) => event.id)).toEqual(["one", "two", "three"]);
  });

  it("maps relevance for gold and forex instruments", () => {
    const goldEvent = getEconomicEventRelevance(buildEvent({ title: "FOMC Statement", currency: "USD" }), "XAUUSD");
    const euroDollarEvent = getEconomicEventRelevance(buildEvent({ title: "Retail Sales", currency: "EUR" }), "EURUSD");

    expect(goldEvent?.badge).toBe("Gold Macro");
    expect(goldEvent?.reason).toContain("gold");
    expect(euroDollarEvent?.badge).toBe("EUR Base");
  });

  it("returns the nearest relevant high-impact warning window", () => {
    const warning = getTradeEventWarning({
      events: [
        buildEvent({ id: "far", eventTimeUtc: "2026-03-25T12:45:00.000Z", title: "GDP q/q", category: "growth" }),
        buildEvent({ id: "near", eventTimeUtc: "2026-03-25T12:10:00.000Z", title: "CPI y/y", category: "inflation" }),
      ],
      instrument: "XAUUSD",
      now: new Date("2026-03-25T12:00:00.000Z"),
    });

    expect(warning?.event.id).toBe("near");
    expect(warning?.thresholdMinutes).toBe(15);
    expect(warning?.direction).toBe("upcoming");
  });

  it("persists and exposes the selected timezone preference", () => {
    window.localStorage.clear();

    writeEconomicCalendarTimeZonePreference("Europe/London");

    expect(readEconomicCalendarTimeZonePreference()).toBe("Europe/London");
    expect(getEconomicCalendarTimeZoneOptions("Europe/London").some((option) => option.value === "Europe/London")).toBe(true);
  });
});
