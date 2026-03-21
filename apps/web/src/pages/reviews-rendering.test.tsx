import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Reviews from "@/pages/Reviews";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      username: "trader",
    },
  }),
}));

vi.mock("@/lib/loading", () => ({
  withMinimumDelay: async <T,>(operation: Promise<T> | (() => Promise<T>)) => {
    return typeof operation === "function" ? operation() : operation;
  },
}));

const apiMocks = vi.hoisted(() => ({
  listReviews: vi.fn(),
  createReview: vi.fn(),
  updateReview: vi.fn(),
  deleteReview: vi.fn(),
  getTrade: vi.fn(),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/api/reviews", () => ({
  listReviews: apiMocks.listReviews,
  createReview: apiMocks.createReview,
  updateReview: apiMocks.updateReview,
  deleteReview: apiMocks.deleteReview,
}));

vi.mock("@/lib/api/trades", () => ({
  getTrade: apiMocks.getTrade,
}));

vi.mock("@/components/ui/sonner", () => ({
  toast: apiMocks.toast,
  Toaster: () => null,
}));

vi.mock("@/components/TradeReviewDialog", () => ({
  TradeReviewDialog: () => null,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div>{children}</div> : null),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  AlertDialogAction: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
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
    Select: ({ value, onValueChange, children }: { value: string; onValueChange?: (value: string) => void; children: React.ReactNode }) => {
      const options = collectOptions(children);

      return (
        <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
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

vi.mock("@/components/ui/tabs", async () => {
  const ReactModule = await import("react");

  const TabsContext = ReactModule.createContext<{
    value: string;
    onValueChange?: (value: string) => void;
  }>({ value: "" });

  return {
    Tabs: ({ value, onValueChange, children }: { value: string; onValueChange?: (value: string) => void; children: React.ReactNode }) => (
      <TabsContext.Provider value={{ value, onValueChange }}>{children}</TabsContext.Provider>
    ),
    TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TabsTrigger: ({ value, children }: { value: string; children: React.ReactNode }) => {
      const context = ReactModule.useContext(TabsContext);
      return (
        <button type="button" onClick={() => context.onValueChange?.(value)}>
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

async function renderPage() {
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
        <Reviews />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const trade = {
  id: "trade-1",
  date: "2026-03-21",
  pair: "EURUSD",
  accountId: "account-1",
  direction: "Buy" as const,
  entry: 1.1,
  stopLoss: 1.09,
  takeProfit: 1.12,
  profit: 150,
  result: "Win" as const,
  setup: "Breakout",
  session: "New York" as const,
  emotion: "Focused" as const,
  notes: "Held the plan.",
  screenshots: [],
  createdAt: "2026-03-10T10:00:00.000Z",
  updatedAt: "2026-03-10T11:00:00.000Z",
};

const dailyReviews = [
  {
    id: "review-daily-current",
    type: "daily" as const,
    reviewDate: "2026-03-21",
    reviewScope: "daily" as const,
    wentWell: "Stayed patient.",
    mistakes: "Nearly rushed a second entry.",
    followedRules: "Yes" as const,
    emotion: "Calm" as const,
    lessonLearned: "Quality over quantity.",
    improvementPlan: "Reduce impulsive entries.",
    disciplineScore: 8,
    createdAt: "2026-03-21T10:00:00.000Z",
    updatedAt: "2026-03-21T11:00:00.000Z",
  },
  {
    id: "review-daily-older",
    type: "daily" as const,
    reviewDate: "2026-03-11",
    reviewScope: "daily" as const,
    wentWell: "Waited for the cleaner breakout.",
    mistakes: "Hesitated after the first signal.",
    followedRules: "Partially" as const,
    emotion: "Confident" as const,
    lessonLearned: "Trust the first valid setup.",
    improvementPlan: "Commit faster once rules align.",
    disciplineScore: 6,
    createdAt: "2026-03-11T10:00:00.000Z",
    updatedAt: "2026-03-11T11:00:00.000Z",
  },
  {
    id: "review-daily-next-month",
    type: "daily" as const,
    reviewDate: "2026-04-01",
    reviewScope: "daily" as const,
    wentWell: "Protected capital after a slow open.",
    mistakes: "Passed on the best continuation setup.",
    followedRules: "Yes" as const,
    emotion: "Calm" as const,
    lessonLearned: "Take the clean continuation earlier.",
    improvementPlan: "Trust continuation quality faster.",
    disciplineScore: 7,
    createdAt: "2026-04-01T10:00:00.000Z",
    updatedAt: "2026-04-01T11:00:00.000Z",
  },
];

const weeklyReviews = [
  {
    id: "review-weekly-current",
    type: "weekly" as const,
    reviewScope: "weekly" as const,
    weekStart: "2026-03-16",
    weekEnd: "2026-03-22",
    weeklySummary: "Strong week overall.",
    biggestWin: "Held winners with less interference.",
    biggestMistake: "Risk got loose after the best day.",
    riskManagement: "Yes" as const,
    nextGoal: "Tighten risk after early momentum.",
    weeklyRating: 7,
    createdAt: "2026-03-22T10:00:00.000Z",
    updatedAt: "2026-03-22T11:00:00.000Z",
  },
  {
    id: "review-weekly-prev",
    type: "weekly" as const,
    reviewScope: "weekly" as const,
    weekStart: "2026-03-09",
    weekEnd: "2026-03-15",
    weeklySummary: "Mixed week.",
    biggestWin: "Stayed selective midweek.",
    biggestMistake: "Cut winners early.",
    riskManagement: "Partially" as const,
    nextGoal: "Hold winners longer.",
    weeklyRating: 5,
    createdAt: "2026-03-15T10:00:00.000Z",
    updatedAt: "2026-03-15T11:00:00.000Z",
  },
];

const tradeReviews = [
  {
    id: "review-trade",
    type: "trade" as const,
    reviewScope: "trade" as const,
    tradeId: "trade-1",
    tradeSnapshot: {
      id: "trade-1",
      date: "2026-03-21",
      pair: "EURUSD",
      direction: "Buy" as const,
      entry: 1.1,
      stopLoss: 1.09,
      takeProfit: 1.12,
      profit: 150,
      result: "Win" as const,
      setup: "Breakout",
      setupColor: null,
      session: "New York" as const,
      emotion: "Focused" as const,
      notes: "Held the plan.",
      screenshots: [],
    },
    reviewDate: "2026-03-21",
    executionRating: 5,
    disciplineScore: 4,
    emotionRating: 4,
    whatWentWell: "Trade setup respected.",
    whatWentWrong: "Late partial exit.",
    mistakesMade: "Moved stop once.",
    lessonLearned: "Wait for confirmation.",
    improvementForNextTrade: "Scale out better.",
    wouldTakeAgain: false,
    createdAt: "2026-03-21T12:00:00.000Z",
    updatedAt: "2026-03-21T13:00:00.000Z",
  },
];

afterEach(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date("2026-03-21T12:00:00.000Z"));
  apiMocks.listReviews.mockReset();
  apiMocks.createReview.mockReset();
  apiMocks.updateReview.mockReset();
  apiMocks.deleteReview.mockReset();
  apiMocks.getTrade.mockReset();
  apiMocks.toast.success.mockReset();
  apiMocks.toast.error.mockReset();

  apiMocks.listReviews.mockImplementation(async (params?: { type?: string }) => {
    const items = params?.type === "daily"
      ? dailyReviews
      : params?.type === "weekly"
        ? weeklyReviews
        : params?.type === "trade"
          ? tradeReviews
          : [...dailyReviews, ...weeklyReviews, ...tradeReviews];

    return {
      items,
      pagination: {
        page: 1,
        pageSize: 200,
        total: items.length,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  });
  apiMocks.getTrade.mockResolvedValue({ trade });
});

describe("reviews hybrid layout", () => {
  it("renders weekly summary, calendar, and selected day detail panel", async () => {
    renderPage();

    expect(await screen.findByText("7/10")).toBeInTheDocument();
    expect(screen.getByText("Up 2 vs last week")).toBeInTheDocument();
    expect(screen.getByText("Held winners with less interference.")).toBeInTheDocument();
    expect(screen.getByText("Tighten risk after early momentum.")).toBeInTheDocument();
    expect(screen.getByText("March 2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "March 21, 2026" })).toBeInTheDocument();
  });

  it("lets the user browse previous and next weekly reviews", async () => {
    renderPage();

    await screen.findByText("7/10");

    fireEvent.click(screen.getByRole("button", { name: "Previous week" }));

    expect(screen.getByText("5/10")).toBeInTheDocument();
    expect(screen.getByText("No prior trend yet")).toBeInTheDocument();
    expect(screen.getByText("Stayed selective midweek.")).toBeInTheDocument();
    expect(screen.getByText("Hold winners longer.")).toBeInTheDocument();
    expect(screen.getByText("Earlier week")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next week" }));

    expect(screen.getByText("7/10")).toBeInTheDocument();
    expect(screen.getByText("Up 2 vs last week")).toBeInTheDocument();
    expect(screen.getByText("Latest")).toBeInTheDocument();
  });

  it("updates the detail panel when a calendar day is selected", async () => {
    renderPage();

    await screen.findByText("7/10");

    fireEvent.click(screen.getByRole("button", { name: "March 11, 2026" }));

    expect(screen.getByText("Wed, Mar 11")).toBeInTheDocument();
    expect(screen.getByText("Confident")).toBeInTheDocument();
    expect(screen.getByText("Steady discipline")).toBeInTheDocument();
    expect(screen.getByText("Trust the first valid setup.")).toBeInTheDocument();
  });

  it("resets the selected day to the active month when switching months", async () => {
    renderPage();

    await screen.findByText("7/10");

    fireEvent.click(screen.getByRole("button", { name: "Next month" }));

    expect(screen.getByRole("button", { name: "April 1, 2026" })).toBeInTheDocument();
    expect(screen.getByText("Take the clean continuation earlier.")).toBeInTheDocument();
  });

  it("opens the weekly review dialog from the dashboard controls", async () => {
    renderPage();

    await screen.findByText("7/10");

    fireEvent.click(screen.getByRole("button", { name: "View weekly review" }));

    expect(screen.getByText("Weekly Summary")).toBeInTheDocument();
    expect(screen.getByText("Strong week overall.")).toBeInTheDocument();
    expect(screen.getByText("Biggest Win")).toBeInTheDocument();
    expect(screen.getAllByText("Held winners with less interference.").length).toBeGreaterThan(0);
  });
});
