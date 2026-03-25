import { describe, expect, it } from "vitest";
import type { EconomicCalendarEvent } from "@/types";
import { selectHighImpactNewsAlertCandidate } from "@/features/economic-calendar/high-impact-news-alert.selector";

const buildEvent = (overrides: Partial<EconomicCalendarEvent>): EconomicCalendarEvent => ({
  id: overrides.id ?? crypto.randomUUID(),
  providerEventId: overrides.providerEventId ?? crypto.randomUUID(),
  title: overrides.title ?? "Core CPI y/y",
  country: overrides.country ?? "USD",
  currency: overrides.currency ?? "USD",
  impactLevel: overrides.impactLevel ?? "high",
  eventTimeUtc: overrides.eventTimeUtc ?? "2026-03-25T12:30:00.000Z",
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

describe("high impact news alert selector", () => {
  it("selects the nearest relevant upcoming high-impact event", () => {
    const now = new Date("2026-03-25T12:00:00.000Z");
    const candidate = selectHighImpactNewsAlertCandidate({
      now,
      instruments: ["XAUUSD"],
      events: [
        buildEvent({ id: "later", title: "FOMC Statement", eventTimeUtc: "2026-03-25T12:50:00.000Z", category: "central-bank" }),
        buildEvent({ id: "near", title: "CPI y/y", eventTimeUtc: "2026-03-25T12:20:00.000Z", category: "inflation" }),
      ],
    });

    expect(candidate?.event.id).toBe("near");
    expect(candidate?.minutesUntil).toBe(20);
  });

  it("does not select low or passed events", () => {
    const now = new Date("2026-03-25T12:00:00.000Z");
    const candidate = selectHighImpactNewsAlertCandidate({
      now,
      instruments: ["XAUUSD"],
      events: [
        buildEvent({ id: "low", impactLevel: "low", eventTimeUtc: "2026-03-25T12:20:00.000Z" }),
        buildEvent({ id: "passed", eventTimeUtc: "2026-03-25T11:20:00.000Z" }),
      ],
    });

    expect(candidate).toBeNull();
  });

  it("shows a generic high-impact alert when no recent instruments exist", () => {
    expect(selectHighImpactNewsAlertCandidate({
      now: new Date("2026-03-25T12:00:00.000Z"),
      instruments: [],
      events: [buildEvent({ id: "one", currency: "NZD", country: "NZD" })],
    })?.event.id).toBe("one");

    expect(selectHighImpactNewsAlertCandidate({
      now: new Date("2026-03-25T12:00:00.000Z"),
      instruments: ["EURUSD"],
      events: [buildEvent({ id: "bad", eventTimeUtc: "not-a-date" })],
    })).toBeNull();
  });

  it("prefers more relevant events over equally upcoming generic ones", () => {
    const candidate = selectHighImpactNewsAlertCandidate({
      now: new Date("2026-03-25T12:00:00.000Z"),
      instruments: ["XAUUSD"],
      events: [
        buildEvent({
          id: "generic",
          title: "RBNZ Rate Statement",
          eventTimeUtc: "2026-03-25T12:30:00.000Z",
          currency: "NZD",
          country: "NZD",
          category: "central-bank",
        }),
        buildEvent({
          id: "relevant",
          title: "CPI y/y",
          eventTimeUtc: "2026-03-25T12:32:00.000Z",
          currency: "USD",
          country: "USD",
          category: "inflation",
        }),
      ],
    });

    expect(candidate?.event.id).toBe("relevant");
  });
});
