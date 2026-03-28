import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HighImpactNewsToast } from "@/features/economic-calendar/components/HighImpactNewsToast";
import type { EconomicCalendarEvent } from "@/types";

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

describe("HighImpactNewsToast", () => {
  it("shows timezone-aware event timing and supports actions", () => {
    const onDismiss = vi.fn();
    const onViewEvent = vi.fn();

    render(
      <HighImpactNewsToast
        event={buildEvent()}
        timeZone="Asia/Phnom_Penh"
        relevanceLabel="Relevant to XAUUSD"
        contextLabel="Inflation risk may increase volatility."
        now={new Date("2026-03-25T12:00:00.000Z")}
        onDismiss={onDismiss}
        onViewEvent={onViewEvent}
      />,
    );

    expect(screen.getByText("High-impact news coming up")).toBeInTheDocument();
    expect(screen.getByText("7:30 PM", { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/Relevant to XAUUSD/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View event" }));
    fireEvent.click(screen.getByLabelText("Dismiss high-impact news alert"));

    expect(onViewEvent).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
