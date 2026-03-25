import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EconomicCalendarEventDetail from "@/pages/EconomicCalendarEventDetail";
import { ApiError } from "@/services/api/client";
import type { EconomicCalendarEvent } from "@/types";

vi.mock("@/config/features", () => ({
  FEATURES: {
    economicCalendar: "live",
  },
}));

vi.mock("@/features/auth/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      username: "trader",
    },
  }),
}));

vi.mock("@/utils/loading", () => ({
  withMinimumDelay: async <T,>(operation: Promise<T> | (() => Promise<T>)) => {
    return typeof operation === "function" ? operation() : operation;
  },
}));

const apiMocks = vi.hoisted(() => ({
  listTrades: vi.fn(),
  getEconomicCalendarEventDetail: vi.fn(),
}));

vi.mock("@/services/api/trades", () => ({
  listTrades: apiMocks.listTrades,
}));

vi.mock("@/services/api/economic-calendar", () => ({
  getEconomicCalendarEventDetail: apiMocks.getEconomicCalendarEventDetail,
}));

function buildEvent(overrides: Partial<EconomicCalendarEvent> = {}): EconomicCalendarEvent {
  return {
    id: overrides.id ?? "event-1",
    providerEventId: overrides.providerEventId ?? "provider-1",
    title: overrides.title ?? "Core CPI y/y",
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

function renderPage(options?: {
  state?: unknown;
}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[{
        pathname: "/economic-calendar/event-1",
        state: options?.state,
      }]}
      >
        <Routes>
          <Route path="/economic-calendar/:eventId" element={<EconomicCalendarEventDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("EconomicCalendarEventDetail page", () => {
  beforeEach(() => {
    window.localStorage.clear();
    apiMocks.listTrades.mockReset();
    apiMocks.getEconomicCalendarEventDetail.mockReset();

    apiMocks.listTrades.mockResolvedValue({
      items: [
        { id: "trade-1", pair: "XAUUSD" },
      ],
    });

    apiMocks.getEconomicCalendarEventDetail.mockResolvedValue({
      fetchedAtUtc: "2026-03-25T08:00:00.000Z",
      providerStatus: "live",
      cacheStatus: "miss",
      event: buildEvent(),
      navigation: {
        previousEventId: null,
        nextEventId: null,
      },
      sameTimeEvents: [],
      sameSessionEvents: [],
    });
  });

  it("renders trader-focused event content for matched templates", async () => {
    renderPage();

    await screen.findByText("Core CPI y/y");
    expect(screen.getByText("Trader Breakdown")).toBeInTheDocument();
    expect(screen.getByText("What is this")).toBeInTheDocument();
    expect(screen.getByText("Why it matters")).toBeInTheDocument();
    expect(screen.getByText("How it impacts")).toBeInTheDocument();
    expect(screen.getByText("Market behavior")).toBeInTheDocument();
    expect(screen.getByText("Affected instruments")).toBeInTheDocument();
    expect(screen.getAllByText("Inflation excluding food and energy prices.").length).toBeGreaterThan(0);
    expect(screen.getByText("Central banks focus heavily on core inflation.")).toBeInTheDocument();
    expect(screen.getByText(/Higher → currency strengthens/)).toBeInTheDocument();
    expect(screen.getByText("Very strong reaction, often bigger than CPI.")).toBeInTheDocument();
    expect(screen.getAllByText("XAUUSD").length).toBeGreaterThan(0);
  });

  it("uses routed event state when the provider window no longer has the event", async () => {
    apiMocks.getEconomicCalendarEventDetail.mockRejectedValue(
      new ApiError("The requested economic calendar event could not be found.", 404, "ECONOMIC_CALENDAR_EVENT_NOT_FOUND"),
    );

    renderPage({
      state: {
        event: buildEvent(),
      },
    });

    await screen.findByText("Core CPI y/y");
    expect(screen.queryByText("Event not found")).not.toBeInTheDocument();
    expect(screen.getByText("Trader Breakdown")).toBeInTheDocument();
    expect(screen.getByText("Central banks focus heavily on core inflation.")).toBeInTheDocument();
  });
});
