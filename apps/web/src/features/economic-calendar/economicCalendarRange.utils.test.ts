import { describe, expect, it } from "vitest";
import type { EconomicCalendarEvent } from "@/types";
import {
  createEconomicCalendarCustomRangeState,
  createEconomicCalendarPresetRangeState,
  filterEconomicCalendarEventsForRange,
  formatRangeLabel,
  getEconomicCalendarQueryRange,
  getRangeFromPreset,
  shiftRangeBackward,
  shiftRangeForward,
  shouldEnableLiveUpdatesForRange,
} from "@/features/economic-calendar/economicCalendarRange.utils";

function buildEvent(overrides: Partial<EconomicCalendarEvent> = {}): EconomicCalendarEvent {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    providerEventId: overrides.providerEventId ?? crypto.randomUUID(),
    title: overrides.title ?? "CPI y/y",
    country: overrides.country ?? "United States",
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
  };
}

describe("economic calendar range utilities", () => {
  const now = new Date("2026-03-25T08:00:00.000Z");
  const timeZone = "Asia/Bangkok";

  it("builds the expected preset ranges", () => {
    expect(getRangeFromPreset("today", { now, timeZone })).toEqual({
      startDate: "2026-03-25",
      endDate: "2026-03-25",
    });
    expect(getRangeFromPreset("tomorrow", { now, timeZone })).toEqual({
      startDate: "2026-03-26",
      endDate: "2026-03-26",
    });
    expect(getRangeFromPreset("this_week", { now, timeZone })).toEqual({
      startDate: "2026-03-23",
      endDate: "2026-03-29",
    });
    expect(getRangeFromPreset("next_week", { now, timeZone })).toEqual({
      startDate: "2026-03-30",
      endDate: "2026-04-05",
    });
  });

  it("shifts preset and custom ranges logically", () => {
    const today = createEconomicCalendarPresetRangeState("today", { now, timeZone });
    const tomorrow = shiftRangeForward(today);
    const yesterday = shiftRangeBackward(today);
    const custom = createEconomicCalendarCustomRangeState("2026-03-10", "2026-03-12", timeZone);

    expect(tomorrow).toMatchObject({
      mode: "preset",
      preset: "tomorrow",
      startDate: "2026-03-26",
      endDate: "2026-03-26",
    });
    expect(yesterday).toMatchObject({
      mode: "preset",
      preset: "yesterday",
      startDate: "2026-03-24",
      endDate: "2026-03-24",
    });
    expect(shiftRangeForward(custom)).toMatchObject({
      mode: "custom",
      startDate: "2026-03-13",
      endDate: "2026-03-15",
    });
  });

  it("formats labels and buffered query windows cleanly", () => {
    const state = createEconomicCalendarCustomRangeState("2026-03-25", "2026-03-31", timeZone);

    expect(formatRangeLabel(state)).toBe("Mar 25 - 31, 2026");
    expect(getEconomicCalendarQueryRange(state)).toEqual({
      dateFrom: "2026-03-24",
      dateTo: "2026-04-01",
    });
  });

  it("filters events by the selected local-date range", () => {
    const events = [
      buildEvent({ id: "late-25", eventTimeUtc: "2026-03-25T23:30:00.000Z" }),
      buildEvent({ id: "early-26", eventTimeUtc: "2026-03-26T01:00:00.000Z" }),
    ];
    const state = createEconomicCalendarCustomRangeState("2026-03-26", "2026-03-26", "America/New_York");

    expect(filterEconomicCalendarEventsForRange(events, state, "America/New_York").map((event) => event.id)).toEqual([]);
    expect(filterEconomicCalendarEventsForRange(events, state, timeZone).map((event) => event.id)).toEqual([
      "late-25",
      "early-26",
    ]);
  });

  it("only enables live updates when the selected range includes today in the chosen timezone", () => {
    const today = createEconomicCalendarPresetRangeState("today", { now, timeZone });
    const historical = createEconomicCalendarCustomRangeState("2026-03-20", "2026-03-20", timeZone);
    const future = createEconomicCalendarPresetRangeState("next_week", { now, timeZone });

    expect(shouldEnableLiveUpdatesForRange(today, now)).toBe(true);
    expect(shouldEnableLiveUpdatesForRange(historical, now)).toBe(false);
    expect(shouldEnableLiveUpdatesForRange(future, now)).toBe(false);
  });
});
