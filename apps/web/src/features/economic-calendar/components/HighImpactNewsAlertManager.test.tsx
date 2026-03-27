import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HighImpactNewsAlertManager } from "@/features/economic-calendar/components/HighImpactNewsAlertManager";
import type { HighImpactNewsAlertCandidate } from "@/features/economic-calendar/high-impact-news-alert.selector";
import type { EconomicCalendarEvent } from "@/types";

vi.mock("@/features/auth/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      username: "trader",
    },
  }),
}));

const serviceMocks = vi.hoisted(() => ({
  listTrades: vi.fn(),
  getEconomicCalendarList: vi.fn(),
}));

vi.mock("@/services/api/trades", () => ({
  listTrades: serviceMocks.listTrades,
}));

vi.mock("@/services/api/economic-calendar", () => ({
  getEconomicCalendarList: serviceMocks.getEconomicCalendarList,
}));

function buildEvent(overrides: Partial<EconomicCalendarEvent> = {}): EconomicCalendarEvent {
  return {
    id: overrides.id ?? "event-1",
    providerEventId: overrides.providerEventId ?? "provider-1",
    title: overrides.title ?? "CPI y/y",
    country: overrides.country ?? "USD",
    currency: overrides.currency ?? "USD",
    impactLevel: overrides.impactLevel ?? "high",
    eventTimeUtc: overrides.eventTimeUtc ?? "2099-03-25T12:30:00.000Z",
    previousValue: overrides.previousValue ?? null,
    forecastValue: overrides.forecastValue ?? null,
    actualValue: overrides.actualValue ?? null,
    revisedValue: overrides.revisedValue ?? null,
    status: overrides.status ?? "upcoming",
    category: overrides.category ?? "inflation",
    sourceProvider: overrides.sourceProvider ?? "fair-economy",
    lastUpdatedAt: overrides.lastUpdatedAt ?? "2099-03-25T08:00:00.000Z",
    createdAt: overrides.createdAt ?? "2099-03-25T08:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2099-03-25T08:00:00.000Z",
    relevance: overrides.relevance ?? null,
  };
}

function renderManagerWithCandidate(candidateOverride: HighImpactNewsAlertCandidate | null) {
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
        <HighImpactNewsAlertManager
          bootDelayMs={0}
          autoHideMs={60_000}
          candidateOverride={candidateOverride}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("HighImpactNewsAlertManager", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    serviceMocks.listTrades.mockReset();
    serviceMocks.getEconomicCalendarList.mockReset();

    serviceMocks.listTrades.mockResolvedValue({
      items: [{ id: "trade-1", pair: "XAUUSD" }],
    });
    serviceMocks.getEconomicCalendarList.mockResolvedValue({
      items: [],
    });
  });

  it("shows one toast for the nearest relevant high-impact event and suppresses repeats", async () => {
    const candidate = {
      event: buildEvent(),
      minutesUntil: 30,
      relevanceMatches: [],
    } satisfies HighImpactNewsAlertCandidate;

    renderManagerWithCandidate(candidate);
    expect(await screen.findByText("High-impact news coming up")).toBeInTheDocument();
    expect(screen.getByText("CPI y/y")).toBeInTheDocument();

    renderManagerWithCandidate(candidate);
    expect(await screen.findByText("High-impact news coming up")).toBeInTheDocument();
    expect(screen.getAllByText("High-impact news coming up")).toHaveLength(1);
  });

  it("does not show a toast when only passed events exist", async () => {
    renderManagerWithCandidate(null);
    await new Promise((resolve) => {
      window.setTimeout(resolve, 20);
    });

    expect(screen.queryByText("High-impact news coming up")).not.toBeInTheDocument();
  });

  it("shows a generic high-impact alert when the user has no recent instruments yet", async () => {
    renderManagerWithCandidate({
      event: buildEvent({
        title: "RBNZ Rate Statement",
        country: "NZD",
        currency: "NZD",
        category: "central-bank",
      }),
      minutesUntil: 30,
      relevanceMatches: [],
    });
    expect(await screen.findByText("High-impact news coming up")).toBeInTheDocument();
    expect(screen.getByText("RBNZ Rate Statement")).toBeInTheDocument();
  });

  it("shows a toast for upcoming high-impact events even when they are not tied to recent instruments", async () => {
    renderManagerWithCandidate({
      event: buildEvent({
        title: "BOC Rate Statement",
        country: "CAD",
        currency: "CAD",
        category: "central-bank",
      }),
      minutesUntil: 30,
      relevanceMatches: [],
    });
    expect(await screen.findByText("High-impact news coming up")).toBeInTheDocument();
    expect(screen.getByText("BOC Rate Statement")).toBeInTheDocument();
  });
});
