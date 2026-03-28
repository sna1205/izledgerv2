import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { EconomicCalendarNextEventPreview } from "@/features/economic-calendar/components/EconomicCalendarNextEventPreview";
import type { EconomicCalendarEvent } from "@/types";

const buildEvent = (overrides: Partial<EconomicCalendarEvent> = {}): EconomicCalendarEvent => ({
  id: overrides.id ?? "event-1",
  providerEventId: overrides.providerEventId ?? "provider-1",
  title: overrides.title ?? "CPI y/y",
  country: overrides.country ?? "United States",
  currency: overrides.currency ?? "USD",
  impactLevel: overrides.impactLevel ?? "high",
  eventTimeUtc: overrides.eventTimeUtc ?? "2026-03-25T07:00:00.000Z",
  previousValue: overrides.previousValue ?? "3.0%",
  forecastValue: overrides.forecastValue ?? "3.1%",
  actualValue: overrides.actualValue ?? null,
  revisedValue: overrides.revisedValue ?? null,
  status: overrides.status ?? "upcoming",
  category: overrides.category ?? "inflation",
  sourceProvider: overrides.sourceProvider ?? "fair-economy",
  lastUpdatedAt: overrides.lastUpdatedAt ?? "2026-03-25T06:00:00.000Z",
  createdAt: overrides.createdAt ?? "2026-03-25T06:00:00.000Z",
  updatedAt: overrides.updatedAt ?? "2026-03-25T06:00:00.000Z",
  relevance: overrides.relevance ?? null,
});

describe("EconomicCalendarNextEventPreview", () => {
  it("renders a compact upcoming-event widget with impact and countdown", () => {
    render(
      <MemoryRouter>
        <EconomicCalendarNextEventPreview
          event={buildEvent()}
          now={new Date("2026-03-25T06:08:00.000Z")}
          timeZone="Asia/Bangkok"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Upcoming Event")).toBeInTheDocument();
    expect(screen.getByText("CPI y/y")).toBeInTheDocument();
    expect(screen.getByText("2:00 PM")).toBeInTheDocument();
    expect(screen.getByText("USD")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("in 52m")).toBeInTheDocument();
  });
});
