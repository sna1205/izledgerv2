import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TodayImportantEventsWidget } from "@/features/economic-calendar/components/TodayImportantEventsWidget";

vi.mock("@/features/auth/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      username: "trader",
    },
  }),
}));

const economicCalendarMocks = vi.hoisted(() => ({
  getDashboardImportantEvents: vi.fn(),
}));

vi.mock("@/services/api/economic-calendar", () => ({
  getDashboardImportantEvents: economicCalendarMocks.getDashboardImportantEvents,
}));

function renderWidget() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TodayImportantEventsWidget instrumentUniverse={["XAUUSD"]} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("TodayImportantEventsWidget", () => {
  beforeEach(() => {
    economicCalendarMocks.getDashboardImportantEvents.mockReset();
    window.localStorage.clear();
  });

  it("renders today’s important events", async () => {
    economicCalendarMocks.getDashboardImportantEvents.mockResolvedValue({
      fetchedAtUtc: new Date().toISOString(),
      providerStatus: "live",
      cacheStatus: "miss",
      nextImportantEvent: {
        id: "event-1",
        providerEventId: "provider-1",
        title: "CPI y/y",
        country: "USD",
        currency: "USD",
        impactLevel: "high",
        eventTimeUtc: "2026-03-25T23:30:00.000Z",
        previousValue: "3.0%",
        forecastValue: "3.1%",
        actualValue: null,
        revisedValue: null,
        status: "upcoming",
        category: "inflation",
        sourceProvider: "fair-economy",
        lastUpdatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        relevance: null,
      },
      items: [
        {
          id: "event-1",
          providerEventId: "provider-1",
          title: "CPI y/y",
          country: "USD",
          currency: "USD",
          impactLevel: "high",
          eventTimeUtc: "2026-03-25T23:30:00.000Z",
          previousValue: "3.0%",
          forecastValue: "3.1%",
          actualValue: null,
          revisedValue: null,
          status: "upcoming",
          category: "inflation",
          sourceProvider: "fair-economy",
          lastUpdatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          relevance: null,
        },
      ],
    });

    renderWidget();

    await screen.findByText("Today’s Important Events");
    expect(screen.getByText("Phnom Penh (GMT+7)")).toBeInTheDocument();
    expect(screen.getByText("CPI y/y")).toBeInTheDocument();
    expect(screen.getByText("6:30 AM")).toBeInTheDocument();
    expect(screen.getByText("Open calendar")).toBeInTheDocument();
  });

  it("uses the saved timezone preference for the widget label and event times", async () => {
    window.localStorage.setItem("economic-calendar:timezone", "America/New_York");

    economicCalendarMocks.getDashboardImportantEvents.mockResolvedValue({
      fetchedAtUtc: new Date().toISOString(),
      providerStatus: "live",
      cacheStatus: "miss",
      nextImportantEvent: {
        id: "event-1",
        providerEventId: "provider-1",
        title: "CPI y/y",
        country: "USD",
        currency: "USD",
        impactLevel: "high",
        eventTimeUtc: "2026-03-25T23:30:00.000Z",
        previousValue: "3.0%",
        forecastValue: "3.1%",
        actualValue: null,
        revisedValue: null,
        status: "upcoming",
        category: "inflation",
        sourceProvider: "fair-economy",
        lastUpdatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        relevance: null,
      },
      items: [
        {
          id: "event-1",
          providerEventId: "provider-1",
          title: "CPI y/y",
          country: "USD",
          currency: "USD",
          impactLevel: "high",
          eventTimeUtc: "2026-03-25T23:30:00.000Z",
          previousValue: "3.0%",
          forecastValue: "3.1%",
          actualValue: null,
          revisedValue: null,
          status: "upcoming",
          category: "inflation",
          sourceProvider: "fair-economy",
          lastUpdatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          relevance: null,
        },
      ],
    });

    renderWidget();

    await screen.findByText("Today’s Important Events");
    expect(screen.getByText("New York (GMT-4)")).toBeInTheDocument();
    expect(screen.getByText("7:30 PM")).toBeInTheDocument();
  });

  it("renders a clean empty state when nothing important is scheduled", async () => {
    economicCalendarMocks.getDashboardImportantEvents.mockResolvedValue({
      fetchedAtUtc: new Date().toISOString(),
      providerStatus: "live",
      cacheStatus: "miss",
      nextImportantEvent: null,
      items: [],
    });

    renderWidget();

    await screen.findByText("No important events today");
  });

  it("renders an error state when the feed fails", async () => {
    economicCalendarMocks.getDashboardImportantEvents.mockRejectedValue(new Error("boom"));

    renderWidget();

    await waitFor(() => {
      expect(screen.getByText("Calendar unavailable")).toBeInTheDocument();
    });
  });
});
