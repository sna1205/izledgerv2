import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/services/api/client";
import Analytics from "@/pages/Analytics";
import Dashboard from "@/pages/Dashboard";
import { TooltipProvider } from "@/components/ui/tooltip";

vi.mock("@/features/auth/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      username: "trader",
    },
  }),
}));

const apiMocks = vi.hoisted(() => ({
  listAccounts: vi.fn(),
  listTrades: vi.fn(),
  getDashboardSummary: vi.fn(),
  getAnalyticsBreakdowns: vi.fn(),
  getAnalyticsCalendar: vi.fn(),
}));

vi.mock("@/services/api/accounts", () => ({
  listAccounts: apiMocks.listAccounts,
}));

vi.mock("@/services/api/analytics", () => ({
  getDashboardSummary: apiMocks.getDashboardSummary,
  getAnalyticsBreakdowns: apiMocks.getAnalyticsBreakdowns,
  getAnalyticsCalendar: apiMocks.getAnalyticsCalendar,
}));

vi.mock("@/services/api/trades", () => ({
  listTrades: apiMocks.listTrades,
}));

vi.mock("@/features/accounts/components/AccountFilterSelect", () => ({
  AccountFilterSelect: () => <div data-testid="account-filter">Account Filter</div>,
}));

vi.mock("@/components/StatCard", () => ({
  StatCard: ({ label, value }: { label: string; value: string }) => <div>{`${label}: ${value}`}</div>,
}));

vi.mock("@/features/trades/components/ProfitDisplay", () => ({
  ProfitDisplay: ({ value }: { value: number }) => <span>{value >= 0 ? `+$${value.toFixed(2)}` : `-$${Math.abs(value).toFixed(2)}`}</span>,
}));

vi.mock("@/features/trades/components/ResultBadge", () => ({
  ResultBadge: ({ result }: { result: string }) => <span>{result}</span>,
}));

vi.mock("@/components/SetupTag", () => ({
  SetupTag: ({ label }: { label: string }) => <span>{label}</span>,
}));

vi.mock("@/components/ui/chart", () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="chart-container">{children}</div>,
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));

vi.mock("recharts", () => ({
  AreaChart: () => <div />,
  Area: () => null,
  BarChart: () => <div />,
  Bar: () => null,
  CartesianGrid: () => null,
  Cell: () => null,
  PolarAngleAxis: () => null,
  PolarGrid: () => null,
  Pie: () => null,
  PieChart: () => <div />,
  Radar: () => null,
  RadarChart: () => <div />,
  ReferenceLine: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Treemap: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

vi.mock("@/components/ui/tabs", async () => {
  const ReactModule = await import("react");

  const TabsContext = ReactModule.createContext<{
    value: string;
    setValue: (value: string) => void;
  }>({
    value: "",
    setValue: () => undefined,
  });

  return {
    Tabs: ({
      value,
      defaultValue,
      onValueChange,
      children,
    }: {
      value?: string;
      defaultValue?: string;
      onValueChange?: (value: string) => void;
      children: React.ReactNode;
    }) => {
      const [internalValue, setInternalValue] = ReactModule.useState(value ?? defaultValue ?? "");
      const currentValue = value ?? internalValue;

      return (
        <TabsContext.Provider
          value={{
            value: currentValue,
            setValue: (nextValue) => {
              if (value === undefined) {
                setInternalValue(nextValue);
              }

              onValueChange?.(nextValue);
            },
          }}
        >
          {children}
        </TabsContext.Provider>
      );
    },
    TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TabsTrigger: ({ value, children }: { value: string; children: React.ReactNode }) => {
      const context = ReactModule.useContext(TabsContext);

      return (
        <button type="button" onClick={() => context.setValue(value)}>
          {children}
        </button>
      );
    },
    TabsContent: ({ value, children }: { value: string; children: React.ReactNode }) => {
      const context = ReactModule.useContext(TabsContext);
      return context.value === value ? <div>{children}</div> : null;
    },
  };
});

function renderPage(page: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MemoryRouter>{page}</MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

beforeEach(() => {
  apiMocks.listAccounts.mockReset();
  apiMocks.getDashboardSummary.mockReset();
  apiMocks.listTrades.mockReset();
  apiMocks.getAnalyticsBreakdowns.mockReset();
  apiMocks.getAnalyticsCalendar.mockReset();

  apiMocks.listAccounts.mockResolvedValue({
    items: [
      {
        id: "account-1",
        name: "Primary",
        broker: "Manual",
        type: "Personal",
        balance: 1000,
        currency: "USD",
        createdAt: "2026-03-21T10:00:00.000Z",
        updatedAt: "2026-03-21T10:00:00.000Z",
        isDefault: true,
        isArchived: false,
      },
    ],
  });

  apiMocks.listTrades.mockResolvedValue({
    items: [],
    pagination: {
      page: 1,
      pageSize: 500,
      total: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  });
});

describe("dashboard rendering", () => {
  it("renders clean empty states for zero trades", async () => {
    apiMocks.getDashboardSummary.mockResolvedValue({
      summary: {
        todayTrades: 0,
        totalTrades: 0,
        winRate: 0,
        totalProfit: 0,
      },
      recentTrades: [],
      equityCurve: [],
    });

    renderPage(<Dashboard />);

    await screen.findByRole("heading", { name: "Equity" });

    expect(screen.getByText("Win Rate: 0.0%")).toBeInTheDocument();
    expect(screen.getByText("Total PnL: $0.00")).toBeInTheDocument();
    expect(screen.getByText("Add a trade to see equity.")).toBeInTheDocument();
    expect(screen.getByText("No recent trades yet")).toBeInTheDocument();
  });

  it("normalizes malformed dashboard payloads without rendering crashes", async () => {
    apiMocks.getDashboardSummary.mockResolvedValue({
      summary: {
        todayTrades: null,
        totalTrades: "1",
        winRate: "88.5%",
        totalProfit: null,
      },
      recentTrades: [
        {
          id: null,
          date: "not-a-date",
          pair: null,
          direction: null,
          setup: null,
          result: "Maybe",
          profit: null,
        },
      ],
      equityCurve: [
        {},
        {
          tradeNumber: "1",
          date: "2026-03-16",
          pair: null,
          profit: "125.5",
          equity: "125.5",
        },
      ],
    });

    renderPage(<Dashboard />);

    await screen.findByRole("heading", { name: "Equity" });

    expect(screen.getByText("+$125.50")).toBeInTheDocument();
    expect(screen.getByText("Unknown Pair")).toBeInTheDocument();
    expect(screen.getAllByText("--").length).toBeGreaterThan(0);
    expect(screen.queryByText("Invalid Date")).not.toBeInTheDocument();
  });

  it("shows a loading state while the dashboard response is slow", async () => {
    const deferred = createDeferred<unknown>();
    apiMocks.getDashboardSummary.mockReturnValue(deferred.promise);

    renderPage(<Dashboard />);

    expect(screen.getByTestId("dashboard-skeleton")).toBeInTheDocument();

    deferred.resolve({
      summary: {
        todayTrades: 0,
        totalTrades: 0,
        winRate: 0,
        totalProfit: 0,
      },
      recentTrades: [],
      equityCurve: [],
    });

    await screen.findByRole("heading", { name: "Equity" });
  });

  it("shows an outage state and recovers after retry", async () => {
    apiMocks.getDashboardSummary
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({
        summary: {
          todayTrades: 1,
          totalTrades: 2,
          winRate: 50,
          totalProfit: 125,
        },
        recentTrades: [],
        equityCurve: [],
      });

    renderPage(<Dashboard />);

    await screen.findByText("Dashboard unavailable");
    expect(screen.getByText("We could not reach the server. Check your connection and try again.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Equity" })).toBeInTheDocument();
    });
  });
});

describe("analytics rendering", () => {
  it("renders the empty analytics state for zero trades", async () => {
    apiMocks.getAnalyticsBreakdowns.mockResolvedValue({
      summary: {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        totalProfit: 0,
        totalGross: 0,
        totalLoss: 0,
        winRate: 0,
        avgRR: 0,
      },
      winLoss: [],
      setupPerformance: [],
      sessionPerformance: [],
      emotionPerformance: [],
      pairPerformance: [],
      accountPerformance: [],
    });
    apiMocks.getAnalyticsCalendar.mockResolvedValue({
      month: "2026-03",
      days: [],
      weeks: [],
    });

    renderPage(<Analytics />);

    await screen.findByRole("heading", { name: "No trades yet" });
    expect(screen.getByRole("button", { name: "Add Trade" })).toBeInTheDocument();
  });

  it("renders analytics from detailed trades when the summary payload is empty", async () => {
    apiMocks.getAnalyticsBreakdowns.mockResolvedValue({
      summary: {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        totalProfit: 0,
        totalGross: 0,
        totalLoss: 0,
        winRate: 0,
        avgRR: 0,
      },
      winLoss: [],
      setupPerformance: [],
      sessionPerformance: [],
      emotionPerformance: [],
      pairPerformance: [],
      accountPerformance: [],
    });
    apiMocks.getAnalyticsCalendar.mockResolvedValue({
      month: "2026-03",
      days: [],
      weeks: [],
      summary: {
        totalTrades: 0,
        totalProfit: 0,
        winRate: 0,
      },
    });
    apiMocks.listTrades.mockResolvedValue({
      items: [
        {
          id: "trade-1",
          date: "2026-03-15",
          pair: "XAUUSD",
          accountId: "account-1",
          direction: "Buy",
          entry: 3000,
          stopLoss: 2980,
          takeProfit: 3040,
          profit: 150,
          result: "Win",
          setupId: null,
          setup: "Breakout",
          session: "London",
          emotion: "Focused",
          notes: "",
          screenshots: [],
          createdAt: "2026-03-15T10:00:00.000Z",
          updatedAt: "2026-03-15T10:00:00.000Z",
        },
        {
          id: "trade-2",
          date: "2026-03-16",
          pair: "EURUSD",
          accountId: "account-1",
          direction: "Sell",
          entry: 1.09,
          stopLoss: 1.1,
          takeProfit: 1.07,
          profit: -60,
          result: "Loss",
          setupId: null,
          setup: "Reversal",
          session: "New York",
          emotion: "Calm",
          notes: "",
          screenshots: [],
          createdAt: "2026-03-16T10:00:00.000Z",
          updatedAt: "2026-03-16T10:00:00.000Z",
        },
      ],
      pagination: {
        page: 1,
        pageSize: 500,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    renderPage(<Analytics />);

    await screen.findByText("Performance Score");
    expect(screen.getByText("2 trades tracked")).toBeInTheDocument();
    expect(screen.getByText("+$90.00 net")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "No trades yet" })).not.toBeInTheDocument();
  });

  it("loads all detailed-trade pages so all-account breakdown tabs display complete data", async () => {
    apiMocks.getAnalyticsBreakdowns.mockResolvedValue({
      summary: {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        totalProfit: 0,
        totalGross: 0,
        totalLoss: 0,
        winRate: 0,
        avgRR: 0,
      },
      winLoss: [],
      setupPerformance: [],
      sessionPerformance: [],
      emotionPerformance: [],
      pairPerformance: [],
      accountPerformance: [],
    });
    apiMocks.getAnalyticsCalendar.mockResolvedValue({
      month: "2026-03",
      days: [],
      weeks: [],
      summary: {
        totalTrades: 0,
        totalProfit: 0,
        winRate: 0,
      },
    });
    apiMocks.listTrades.mockImplementation(async (params?: { page?: number; pageSize?: number; accountId?: string }) => {
      if ((params?.page ?? 1) === 1) {
        return {
          items: [
            {
              id: "trade-1",
              date: "2026-03-15",
              pair: "XAUUSD",
              accountId: "account-1",
              direction: "Buy",
              entry: 3000,
              stopLoss: 2980,
              takeProfit: 3040,
              profit: 150,
              result: "Win",
              setupId: null,
              setup: "CRT",
              session: "London",
              emotion: "Focused",
              notes: "",
              screenshots: [],
              createdAt: "2026-03-15T10:00:00.000Z",
              updatedAt: "2026-03-15T10:00:00.000Z",
            },
          ],
          pagination: {
            page: 1,
            pageSize: 100,
            total: 2,
            totalPages: 2,
            hasNextPage: true,
            hasPreviousPage: false,
          },
        };
      }

      return {
        items: [
          {
            id: "trade-2",
            date: "2026-03-16",
            pair: "EURUSD",
            accountId: "account-1",
            direction: "Sell",
            entry: 1.09,
            stopLoss: 1.1,
            takeProfit: 1.07,
            profit: -60,
            result: "Loss",
            setupId: null,
            setup: "FVG",
            session: "New York",
            emotion: "Calm",
            notes: "",
            screenshots: [],
            createdAt: "2026-03-16T10:00:00.000Z",
            updatedAt: "2026-03-16T10:00:00.000Z",
          },
        ],
        pagination: {
          page: 2,
          pageSize: 100,
          total: 2,
          totalPages: 2,
          hasNextPage: false,
          hasPreviousPage: true,
        },
      };
    });

    renderPage(<Analytics />);

    await screen.findByText("Performance Score");
    fireEvent.click(screen.getByRole("button", { name: "Breakdown" }));
    fireEvent.click(screen.getByRole("button", { name: "Pairs" }));

    expect(await screen.findByText("XAUUSD")).toBeInTheDocument();
    expect(screen.getByText("EURUSD")).toBeInTheDocument();
    expect(apiMocks.listTrades).toHaveBeenNthCalledWith(1, expect.objectContaining({
      accountId: undefined,
      page: 1,
      pageSize: 100,
      sortBy: "date",
      sortOrder: "asc",
    }));
    expect(apiMocks.listTrades).toHaveBeenNthCalledWith(2, expect.objectContaining({
      accountId: undefined,
      page: 2,
      pageSize: 100,
      sortBy: "date",
      sortOrder: "asc",
    }));
  });

  it("keeps breakdown drawers reactive while detailed trades are still loading", async () => {
    const detailedTradesDeferred = createDeferred<{
      items: Array<Record<string, unknown>>;
      pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
      };
    }>();

    apiMocks.getAnalyticsBreakdowns.mockResolvedValue({
      summary: {
        totalTrades: 2,
        wins: 1,
        losses: 1,
        totalProfit: 70,
        totalGross: 120,
        totalLoss: -50,
        winRate: 50,
        avgRR: 1.8,
      },
      winLoss: [],
      setupPerformance: [
        {
          key: "CRT",
          label: "CRT",
          trades: 2,
          wins: 1,
          winRate: 50,
          profit: 70,
          averageProfit: 35,
        },
      ],
      sessionPerformance: [],
      emotionPerformance: [],
      pairPerformance: [],
      accountPerformance: [],
    });
    apiMocks.getAnalyticsCalendar.mockResolvedValue({
      month: "2026-03",
      days: [],
      weeks: [],
      summary: {
        totalTrades: 0,
        totalProfit: 0,
        winRate: 0,
      },
    });
    apiMocks.listTrades.mockReturnValue(detailedTradesDeferred.promise);

    renderPage(<Analytics />);

    await screen.findByText("Performance Score");

    fireEvent.click(screen.getByRole("button", { name: "Breakdown" }));
    fireEvent.click(await screen.findByText("CRT"));

    expect(await screen.findByRole("heading", { name: "CRT" })).toBeInTheDocument();
    expect(screen.getByText("2 trades")).toBeInTheDocument();
    expect(screen.queryByText("No trades")).not.toBeInTheDocument();

    detailedTradesDeferred.resolve({
      items: [
        {
          id: "trade-crt-1",
          date: "2026-03-18",
          pair: "XAUUSD",
          accountId: "account-1",
          direction: "Buy",
          entry: 3000,
          stopLoss: 2985,
          takeProfit: 3045,
          profit: 120,
          result: "Win",
          setupId: null,
          setup: "CRT",
          session: "London",
          emotion: "Focused",
          notes: "",
          screenshots: [],
          createdAt: "2026-03-18T10:00:00.000Z",
          updatedAt: "2026-03-18T10:00:00.000Z",
        },
        {
          id: "trade-crt-2",
          date: "2026-03-19",
          pair: "EURUSD",
          accountId: "account-1",
          direction: "Sell",
          entry: 1.09,
          stopLoss: 1.1,
          takeProfit: 1.07,
          profit: -50,
          result: "Loss",
          setupId: null,
          setup: "CRT",
          session: "New York",
          emotion: "Calm",
          notes: "",
          screenshots: [],
          createdAt: "2026-03-19T10:00:00.000Z",
          updatedAt: "2026-03-19T10:00:00.000Z",
        },
      ],
      pagination: {
        page: 1,
        pageSize: 500,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    expect(await screen.findByText("XAUUSD")).toBeInTheDocument();
    expect(screen.getByText("EURUSD")).toBeInTheDocument();
  });

  it("does not show the no-trades chart state when summary data exists but detailed trades are empty", async () => {
    apiMocks.getAnalyticsBreakdowns.mockResolvedValue({
      summary: {
        totalTrades: 4,
        wins: 3,
        losses: 1,
        totalProfit: 22877,
        totalGross: 24000,
        totalLoss: -1123,
        winRate: 75,
        avgRR: 1.91,
      },
      winLoss: [],
      setupPerformance: [],
      sessionPerformance: [],
      emotionPerformance: [],
      pairPerformance: [],
      accountPerformance: [],
    });
    apiMocks.getAnalyticsCalendar.mockResolvedValue({
      month: "2026-03",
      summary: {
        totalTrades: 4,
        totalProfit: 22877,
        winRate: 75,
      },
      days: [
        {
          date: "2026-03-14",
          inCurrentMonth: true,
          totalProfit: 9800,
          tradeCount: 2,
          wins: 2,
          winRate: 100,
          grossProfit: 9800,
          grossLoss: 0,
        },
        {
          date: "2026-03-18",
          inCurrentMonth: true,
          totalProfit: 13077,
          tradeCount: 2,
          wins: 1,
          winRate: 50,
          grossProfit: 14200,
          grossLoss: -1123,
        },
      ],
      weeks: [],
    });
    apiMocks.listTrades.mockResolvedValue({
      items: [],
      pagination: {
        page: 1,
        pageSize: 500,
        total: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    renderPage(<Analytics />);

    await screen.findByText("Performance Score");
    expect(screen.getByText("4 trades tracked")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "No trades yet" })).not.toBeInTheDocument();
    expect(screen.queryByText("Trend data is still syncing.")).not.toBeInTheDocument();
  });

  it("normalizes partial analytics data and invalid month payloads gracefully", async () => {
    apiMocks.getAnalyticsBreakdowns.mockResolvedValue({
      summary: {
        totalTrades: "1",
        wins: 1,
        losses: null,
        totalProfit: null,
        totalGross: undefined,
        totalLoss: null,
        winRate: "88.5%",
        avgRR: null,
      },
      winLoss: [
        {
          key: null,
          name: null,
          value: "abc",
          percentage: "101%",
        },
      ],
      setupPerformance: [{}],
      sessionPerformance: null,
      emotionPerformance: [
        {
          key: "emotion-1",
          label: null,
          trades: "2",
          wins: 1,
          winRate: "120%",
          profit: "-50",
          averageProfit: null,
        },
      ],
      pairPerformance: [],
      accountPerformance: [{}],
    });
    apiMocks.getAnalyticsCalendar.mockResolvedValue({
      month: "bad-month",
      days: [
        {
          date: "not-a-date",
          inCurrentMonth: null,
          totalProfit: null,
          tradeCount: null,
          wins: null,
          winRate: "oops",
          grossProfit: null,
          grossLoss: null,
        },
      ],
      weeks: [
        {
          days: [{}],
          summary: {
            tradeCount: "oops",
            totalProfit: null,
            winRate: "150%",
          },
        },
      ],
    });

    renderPage(<Analytics />);

    await screen.findByText("Performance Score");
    expect(screen.getByText("Net PnL")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Breakdown" }));

    await screen.findByText("Unknown");

    fireEvent.click(screen.getByRole("button", { name: "Calendar" }));

    await screen.findByRole("heading", { name: "March 2026" });
    expect(screen.getAllByText("$0.00").length).toBeGreaterThan(0);
    expect(screen.queryByText("Invalid Date")).not.toBeInTheDocument();
  });

  it("shows a loading state while analytics requests are slow", async () => {
    const breakdownsDeferred = createDeferred<unknown>();
    const calendarDeferred = createDeferred<unknown>();
    apiMocks.getAnalyticsBreakdowns.mockReturnValue(breakdownsDeferred.promise);
    apiMocks.getAnalyticsCalendar.mockReturnValue(calendarDeferred.promise);

    renderPage(<Analytics />);

    expect(screen.getByTestId("analytics-skeleton")).toBeInTheDocument();

    breakdownsDeferred.resolve({
      summary: {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        totalProfit: 0,
        totalGross: 0,
        totalLoss: 0,
        winRate: 0,
        avgRR: 0,
      },
      winLoss: [],
      setupPerformance: [],
      sessionPerformance: [],
      emotionPerformance: [],
      pairPerformance: [],
      accountPerformance: [],
    });
    calendarDeferred.resolve({
      month: "2026-03",
      days: [],
      weeks: [],
    });

    await screen.findByRole("heading", { name: "No trades yet" });
  });

  it("shows an error state when analytics endpoints return 500", async () => {
    apiMocks.getAnalyticsBreakdowns.mockRejectedValue(new ApiError("Server failed.", 500, "HTTP_ERROR"));
    apiMocks.getAnalyticsCalendar.mockRejectedValue(new ApiError("Server failed.", 500, "HTTP_ERROR"));

    renderPage(<Analytics />);

    await screen.findByText("Analytics unavailable");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
