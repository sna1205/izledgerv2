import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Reviews from "@/pages/Reviews";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      username: "trader",
    },
  }),
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

function renderPage() {
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
  date: "2026-03-10",
  pair: "EURUSD",
  accountId: "account-1",
  direction: "Buy" as const,
  entry: 1.1,
  stopLoss: 1.09,
  takeProfit: 1.12,
  profit: 150,
  result: "Win" as const,
  setup: "Breakout",
  notes: "Held the plan.",
  screenshots: [],
  createdAt: "2026-03-10T10:00:00.000Z",
  updatedAt: "2026-03-10T11:00:00.000Z",
};

const reviews = [
  {
    id: "review-daily",
    type: "daily" as const,
    reviewDate: "2026-03-11",
    wentWell: "Stayed patient.",
    mistakes: "Overtraded London.",
    followedRules: "Partially" as const,
    emotion: "Calm" as const,
    lessonLearned: "Quality over quantity.",
    improvementPlan: "Reduce impulsive entries.",
    disciplineScore: 8,
    whatWentWell: "trade-only text",
    whatWentWrong: "trade-only mistake",
    createdAt: "2026-03-11T10:00:00.000Z",
    updatedAt: "2026-03-11T11:00:00.000Z",
  },
  {
    id: "review-weekly",
    type: "weekly" as const,
    weekStart: "2026-03-10",
    weekEnd: "2026-03-16",
    weeklySummary: "Consistent week overall.",
    biggestWin: "Held winners longer.",
    biggestMistake: "Ignored correlations.",
    riskManagement: "Yes" as const,
    nextGoal: "Skip mediocre setups.",
    weeklyRating: 7,
    lessonLearned: "daily-only text",
    whatWentWell: "trade-only text",
    createdAt: "2026-03-16T10:00:00.000Z",
    updatedAt: "2026-03-16T11:00:00.000Z",
  },
  {
    id: "review-trade",
    type: "trade" as const,
    tradeId: "trade-1",
    reviewDate: "2026-03-10",
    executionRating: 5,
    disciplineScore: 4,
    emotionRating: 4,
    whatWentWell: "Trade setup respected.",
    whatWentWrong: "Late partial exit.",
    mistakesMade: "Moved stop once.",
    lessonLearned: "Wait for confirmation.",
    improvementForNextTrade: "Scale out better.",
    wouldTakeAgain: false,
    createdAt: "2026-03-10T12:00:00.000Z",
    updatedAt: "2026-03-10T13:00:00.000Z",
  },
];

beforeEach(() => {
  apiMocks.listReviews.mockReset();
  apiMocks.createReview.mockReset();
  apiMocks.updateReview.mockReset();
  apiMocks.deleteReview.mockReset();
  apiMocks.getTrade.mockReset();
  apiMocks.toast.success.mockReset();
  apiMocks.toast.error.mockReset();

  apiMocks.listReviews.mockResolvedValue({
    items: reviews,
    pagination: {
      page: 1,
      pageSize: 10,
      total: reviews.length,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  });
  apiMocks.getTrade.mockResolvedValue({ trade });
});

describe("review rendering by type", () => {
  it("renders a mixed review list with type-specific summaries", async () => {
    renderPage();

    await screen.findByText("Mar 11, 2026");

    expect(screen.getByText("Mar 10 - Mar 16, 2026")).toBeInTheDocument();
    expect(screen.getByText("EURUSD • Mar 10, 2026")).toBeInTheDocument();
    expect(screen.getByText("Discipline: 8/10")).toBeInTheDocument();
    expect(screen.getByText("Risk Management: Yes")).toBeInTheDocument();
    expect(screen.getByText("View Trade")).toBeInTheDocument();
  });

  it("opens daily reviews with only daily review fields", async () => {
    renderPage();

    const dailyCard = (await screen.findByText("Mar 11, 2026")).closest("article");
    if (!dailyCard) {
      throw new Error("Daily review card not found.");
    }

    fireEvent.click(within(dailyCard).getByRole("button", { name: "View" }));

    expect(await screen.findByText("Review Date")).toBeInTheDocument();
    expect(screen.getByText("Rules Followed")).toBeInTheDocument();
    expect(screen.getByText("Stayed patient.")).toBeInTheDocument();
    expect(screen.getByText("Reduce impulsive entries.")).toBeInTheDocument();
    expect(screen.queryByText("What Went Wrong")).not.toBeInTheDocument();
    expect(screen.queryByText("Take Again?")).not.toBeInTheDocument();
  });

  it("opens weekly reviews with only weekly review fields", async () => {
    renderPage();

    const weeklyCard = (await screen.findByText("Mar 10 - Mar 16, 2026")).closest("article");
    if (!weeklyCard) {
      throw new Error("Weekly review card not found.");
    }

    fireEvent.click(within(weeklyCard).getByRole("button", { name: "View" }));

    expect(await screen.findByText("Weekly Summary")).toBeInTheDocument();
    expect(screen.getByText("Biggest Win")).toBeInTheDocument();
    expect(screen.getByText("Skip mediocre setups.")).toBeInTheDocument();
    expect(screen.getByText("Risk Management")).toBeInTheDocument();
    expect(screen.queryByText("Lesson Learned")).not.toBeInTheDocument();
    expect(screen.queryByText("What Went Well")).not.toBeInTheDocument();
  });

  it("opens trade reviews with only trade review fields", async () => {
    renderPage();

    const tradeCard = (await screen.findByText("EURUSD • Mar 10, 2026")).closest("article");
    if (!tradeCard) {
      throw new Error("Trade review card not found.");
    }

    fireEvent.click(within(tradeCard).getByRole("button", { name: "View" }));

    expect(await screen.findByText("Execution")).toBeInTheDocument();
    expect(screen.getByText("What Went Wrong")).toBeInTheDocument();
    expect(screen.getByText("Take Again?")).toBeInTheDocument();
    expect(screen.getByText("Moved stop once.")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
    expect(screen.queryByText("Improvement Plan")).not.toBeInTheDocument();
    expect(screen.queryByText("Weekly Summary")).not.toBeInTheDocument();
  });
});
