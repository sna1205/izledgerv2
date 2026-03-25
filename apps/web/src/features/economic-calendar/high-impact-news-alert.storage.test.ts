import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EconomicCalendarEvent } from "@/types";
import {
  dismissHighImpactNewsAlert,
  markHighImpactNewsAlertShown,
  shouldSuppressHighImpactNewsAlert,
} from "@/features/economic-calendar/high-impact-news-alert.storage";

const buildEvent = (overrides: Partial<EconomicCalendarEvent> = {}): EconomicCalendarEvent => ({
  id: overrides.id ?? "event-1",
  providerEventId: overrides.providerEventId ?? "provider-1",
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

describe("high impact news alert storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.useRealTimers();
  });

  it("suppresses the same event once it has been shown in-session", () => {
    const event = buildEvent();
    const now = new Date("2026-03-25T12:00:00.000Z");

    expect(shouldSuppressHighImpactNewsAlert(event, now)).toBe(false);
    markHighImpactNewsAlertShown(event, now);
    expect(shouldSuppressHighImpactNewsAlert(event, now)).toBe(true);
  });

  it("suppresses a recently shown event across refreshes", () => {
    const event = buildEvent();
    const now = new Date("2026-03-25T12:00:00.000Z");
    markHighImpactNewsAlertShown(event, now);
    window.sessionStorage.clear();

    expect(shouldSuppressHighImpactNewsAlert(event, new Date("2026-03-25T12:05:00.000Z"))).toBe(true);
  });

  it("keeps dismissed events suppressed until they pass and clears stale data afterwards", () => {
    const event = buildEvent({ eventTimeUtc: "2026-03-25T12:30:00.000Z" });
    dismissHighImpactNewsAlert(event, new Date("2026-03-25T12:00:00.000Z"));
    window.sessionStorage.clear();

    expect(shouldSuppressHighImpactNewsAlert(event, new Date("2026-03-25T12:10:00.000Z"))).toBe(true);
    expect(shouldSuppressHighImpactNewsAlert(event, new Date("2026-03-25T12:40:00.000Z"))).toBe(true);
    expect(window.localStorage.getItem("izledger:high-impact-news-alert:cooldowns")).not.toContain(event.id);
  });
});
