import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EconomicCalendar from "@/pages/EconomicCalendar";

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
  getEconomicCalendarList: vi.fn(),
}));

vi.mock("@/services/api/trades", () => ({
  listTrades: apiMocks.listTrades,
}));

vi.mock("@/services/api/economic-calendar", () => ({
  getEconomicCalendarList: apiMocks.getEconomicCalendarList,
}));

vi.mock("@/components/ui/select", async () => {
  const ReactModule = await import("react");

  type Option = {
    value: string;
    label: React.ReactNode;
  };

  const SelectItem = ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  );

  function collectOptions(children: React.ReactNode): Option[] {
    const options: Option[] = [];

    ReactModule.Children.forEach(children, (child) => {
      if (!ReactModule.isValidElement(child)) {
        return;
      }

      if (child.type === SelectItem) {
        options.push({
          value: child.props.value,
          label: child.props.children,
        });
        return;
      }

      options.push(...collectOptions(child.props.children));
    });

    return options;
  }

  return {
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value: string;
      onValueChange?: (value: string) => void;
      children: React.ReactNode;
    }) => {
      const options = collectOptions(children);

      return (
        <select data-testid="mock-select" value={value} onChange={(event) => onValueChange?.(event.target.value)}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    },
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectValue: () => null,
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectItem,
  };
});

function buildEvent(
  dateKey: string,
  overrides: Partial<{
    id: string;
    providerEventId: string;
    title: string;
    country: string;
    currency: string;
    impactLevel: "high" | "medium" | "low" | "holiday";
    eventTimeUtc: string;
    previousValue: string | null;
    forecastValue: string | null;
    actualValue: string | null;
    revisedValue: string | null;
    status: "upcoming" | "pending_release" | "released" | "revised" | "passed" | "holiday";
    category: "inflation" | "labor" | "growth" | "central-bank" | "activity" | "housing" | "energy" | "sentiment" | "holiday" | "other";
    sourceProvider: string;
    lastUpdatedAt: string;
    createdAt: string;
    updatedAt: string;
    relevance: null;
  }> = {},
) {
  return {
    id: overrides.id ?? `event-${dateKey}`,
    providerEventId: overrides.providerEventId ?? `provider-${dateKey}`,
    title: overrides.title ?? `Core CPI y/y ${dateKey}`,
    country: overrides.country ?? "United States",
    currency: overrides.currency ?? "USD",
    impactLevel: overrides.impactLevel ?? "high",
    eventTimeUtc: overrides.eventTimeUtc ?? `${dateKey}T12:30:00.000Z`,
    previousValue: overrides.previousValue ?? "0.4%",
    forecastValue: overrides.forecastValue ?? "0.1%",
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

function buildResponseFromItems(
  items: ReturnType<typeof buildEvent>[],
  range: { startDate: string; endDate: string },
) {
  return {
    fetchedAtUtc: "2026-03-25T08:00:00.000Z",
    providerStatus: "live",
    cacheStatus: "miss",
    range,
    filters: {
      range: "today",
      currencies: [],
      impacts: [],
      instrument: null,
      relevantOnly: false,
    },
    items,
  };
}

function buildResponse(dateKey: string) {
  return buildResponseFromItems([buildEvent(dateKey)], {
    startDate: dateKey,
    endDate: dateKey,
  });
}

function renderPage(options?: {
  initialEntries?: string[];
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
      <MemoryRouter initialEntries={options?.initialEntries}>
        <EconomicCalendar />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("EconomicCalendar page", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-03-25T08:00:00.000Z"));
    window.localStorage.clear();
    apiMocks.listTrades.mockReset();
    apiMocks.getEconomicCalendarList.mockReset();

    apiMocks.listTrades.mockResolvedValue({
      items: [
        { id: "trade-1", pair: "XAUUSD" },
      ],
    });

    apiMocks.getEconomicCalendarList.mockImplementation(async ({ dateFrom }) => {
      const selectedDate = dateFrom
        ? new Date(`${dateFrom}T00:00:00.000Z`)
        : new Date("2026-03-25T00:00:00.000Z");
      selectedDate.setUTCDate(selectedDate.getUTCDate() + 1);
      return buildResponse(selectedDate.toISOString().slice(0, 10));
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defaults to today with the range toolbar visible", async () => {
    renderPage();

    await screen.findByText("Economic Calendar");
    await screen.findAllByText("7:30 PM");

    expect(screen.getAllByText("Today").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Previous period")).toBeInTheDocument();
    expect(screen.getByLabelText("Next period")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Phnom Penh (GMT+7)")).toBeInTheDocument();
    expect(screen.getByText("Upcoming Event")).toBeInTheDocument();
    expect(apiMocks.getEconomicCalendarList).toHaveBeenCalledWith(expect.objectContaining({ live: true }));
  });

  it("uses the stored timezone and updates event display when changed", async () => {
    window.localStorage.setItem("economic-calendar:timezone", "Asia/Bangkok");

    renderPage({
      initialEntries: ["/economic-calendar?rangeMode=custom&rangeStart=2026-03-25&rangeEnd=2026-03-25"],
    });

    await screen.findByText("Economic Calendar");
    await screen.findAllByText("7:30 PM");
    expect(screen.getByDisplayValue("Bangkok (GMT+7)")).toBeInTheDocument();

    const selects = screen.getAllByTestId("mock-select");
    fireEvent.change(selects[0] as HTMLSelectElement, { target: { value: "America/New_York" } });

    await waitFor(() => {
      expect(screen.getAllByText("8:30 AM").length).toBeGreaterThan(0);
    });

    expect(screen.getByDisplayValue("New York (GMT-4)")).toBeInTheDocument();
    expect(window.localStorage.getItem("economic-calendar:timezone")).toBe("America/New_York");
  });

  it("shifts a custom range forward and updates the queried window", async () => {
    renderPage({
      initialEntries: ["/economic-calendar?rangeMode=custom&rangeStart=2026-03-25&rangeEnd=2026-03-25"],
    });

    await screen.findAllByText("Core CPI y/y 2026-03-25");

    fireEvent.click(screen.getByLabelText("Next period"));

    await screen.findAllByText("Core CPI y/y 2026-03-26");

    expect(screen.getByLabelText("Edit custom range")).toBeInTheDocument();
    expect(screen.getByText("Thu, Mar 26")).toBeInTheDocument();
    expect(apiMocks.getEconomicCalendarList).toHaveBeenLastCalledWith(expect.objectContaining({
      dateFrom: "2026-03-25",
      dateTo: "2026-03-27",
      live: false,
    }));
  });

  it("supports historical custom ranges without enabling live polling", async () => {
    renderPage({
      initialEntries: ["/economic-calendar?rangeMode=custom&rangeStart=2026-03-20&rangeEnd=2026-03-20"],
    });

    await screen.findAllByText("Core CPI y/y 2026-03-20");

    expect(screen.getByLabelText("Edit custom range")).toBeInTheDocument();
    expect(screen.getAllByText(/Mar 20/).length).toBeGreaterThan(0);
    expect(apiMocks.getEconomicCalendarList).toHaveBeenCalledWith(expect.objectContaining({
      dateFrom: "2026-03-19",
      dateTo: "2026-03-21",
      live: false,
    }));
  });

  it("falls forward to the next day's events when today's upcoming slate is exhausted", async () => {
    apiMocks.getEconomicCalendarList.mockResolvedValue(buildResponseFromItems([
      buildEvent("2026-03-25", {
        id: "event-past",
        providerEventId: "provider-past",
        title: "Retail Sales 2026-03-25",
        eventTimeUtc: "2026-03-25T06:00:00.000Z",
        actualValue: "0.2%",
        status: "passed",
      }),
      buildEvent("2026-03-26", {
        id: "event-next-day",
        providerEventId: "provider-next-day",
        title: "GDP q/q 2026-03-26",
        eventTimeUtc: "2026-03-26T01:00:00.000Z",
      }),
    ], {
      startDate: "2026-03-25",
      endDate: "2026-03-26",
    }));

    renderPage();

    await screen.findAllByText("GDP q/q 2026-03-26");

    expect(screen.queryAllByText("Retail Sales 2026-03-25")).toHaveLength(0);
    expect(apiMocks.getEconomicCalendarList).toHaveBeenLastCalledWith(expect.objectContaining({
      dateTo: "2026-04-01",
      live: true,
    }));
  });

  it("switches to past mode and disables live polling", async () => {
    apiMocks.getEconomicCalendarList.mockResolvedValue(buildResponseFromItems([
      buildEvent("2026-03-25", {
        id: "event-past",
        providerEventId: "provider-past",
        title: "Past CPI",
        eventTimeUtc: "2026-03-25T06:00:00.000Z",
        actualValue: "3.1%",
        status: "passed",
      }),
      buildEvent("2026-03-25", {
        id: "event-future",
        providerEventId: "provider-future",
        title: "Future GDP",
        eventTimeUtc: "2026-03-25T12:30:00.000Z",
      }),
    ], {
      startDate: "2026-03-25",
      endDate: "2026-03-25",
    }));

    renderPage();

    await screen.findAllByText("Future GDP");

    fireEvent.click(screen.getByRole("tab", { name: "Past" }));

    await screen.findAllByText("Past CPI");

    expect(screen.getAllByText("Future GDP")).toHaveLength(1);
    await waitFor(() => {
      expect(apiMocks.getEconomicCalendarList).toHaveBeenLastCalledWith(expect.objectContaining({ live: false }));
    });
  });
});
