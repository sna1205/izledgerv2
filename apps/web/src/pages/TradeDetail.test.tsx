import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import TradeDetail from "@/pages/TradeDetail";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      username: "trader",
    },
  }),
}));

const apiMocks = vi.hoisted(() => ({
  getTrade: vi.fn(),
  listReviews: vi.fn(),
  listAccounts: vi.fn(),
  listSetups: vi.fn(),
  updateTrade: vi.fn(),
  deleteTrade: vi.fn(),
  createReview: vi.fn(),
  updateReview: vi.fn(),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/api/trades", () => ({
  getTrade: apiMocks.getTrade,
  updateTrade: apiMocks.updateTrade,
  deleteTrade: apiMocks.deleteTrade,
}));

vi.mock("@/lib/api/reviews", () => ({
  listReviews: apiMocks.listReviews,
  createReview: apiMocks.createReview,
  updateReview: apiMocks.updateReview,
}));

vi.mock("@/lib/api/accounts", () => ({
  listAccounts: apiMocks.listAccounts,
}));

vi.mock("@/lib/api/setups", () => ({
  listSetups: apiMocks.listSetups,
}));

vi.mock("@/components/ui/sonner", () => ({
  toast: apiMocks.toast,
  Toaster: () => null,
}));

vi.mock("@/components/ProfitDisplay", () => ({
  ProfitDisplay: ({ value, className }: { value: number; className?: string }) => <span className={className}>{value}</span>,
}));

vi.mock("@/components/ResultBadge", () => ({
  ResultBadge: ({ result }: { result: string }) => <span>{result}</span>,
}));

vi.mock("@/components/SetupTag", () => ({
  SetupTag: ({ label }: { label: string }) => <span>{label}</span>,
}));

vi.mock("@/components/TradeReviewStatusBadge", () => ({
  TradeReviewStatusBadge: ({ reviewed }: { reviewed: boolean }) => <span>{reviewed ? "Reviewed" : "Pending Review"}</span>,
}));

vi.mock("@/components/TradeReviewContent", () => ({
  TradeReviewContent: ({ review }: { review: { lessonLearned?: string | null } }) => (
    <div>Review lesson: {review.lessonLearned || "None"}</div>
  ),
}));

vi.mock("@/components/TradeFormDialog", () => ({
  TradeFormDialog: () => null,
}));

vi.mock("@/components/TradeReviewDialog", () => ({
  TradeReviewDialog: () => null,
}));

vi.mock("@/components/ShareTradeModal", () => ({
  ShareTradeModal: ({ open }: { open: boolean }) => (
    open ? <div>Share modal open</div> : null
  ),
}));

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

const baseTrade = {
  id: "trade-1",
  date: "2026-03-16",
  pair: "EURUSD",
  accountId: "account-1",
  direction: "Buy" as const,
  entry: 1.1,
  stopLoss: 1.09,
  takeProfit: 1.13,
  profit: 250,
  result: "Win" as const,
  setup: "Breakout",
  notes: "Waited for the retest and executed on confirmation.",
  screenshots: [],
  screenshotAssets: [],
  session: "London" as const,
  emotion: "Focused" as const,
  account: {
    id: "account-1",
    name: "Primary",
    broker: "Manual",
    type: "Personal" as const,
    currency: "USD",
    isDefault: true,
  },
};

const baseReview = {
  id: "review-1",
  type: "trade" as const,
  reviewScope: "trade" as const,
  tradeId: "trade-1",
  reviewDate: "2026-03-16",
  lessonLearned: "Stick to the retest confirmation.",
  disciplineScore: 4,
  executionRating: 4,
  emotionRating: 4,
  whatWentWell: "Patience before entry.",
  whatWentWrong: "Could have sized slightly better.",
  mistakesMade: "",
  improvementForNextTrade: "Keep the same confirmation rule.",
  wouldTakeAgain: true,
  createdAt: "2026-03-16T10:00:00.000Z",
  updatedAt: "2026-03-16T10:30:00.000Z",
};

function renderTradeDetail(id = "trade-1") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/trades/${id}`]}>
        <Routes>
          <Route path="/trades" element={<div>Trades Index</div>} />
          <Route path="/trades/:id" element={<TradeDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("TradeDetail", () => {
  beforeEach(() => {
    apiMocks.getTrade.mockReset();
    apiMocks.listReviews.mockReset();
    apiMocks.listAccounts.mockReset();
    apiMocks.listSetups.mockReset();
    apiMocks.updateTrade.mockReset();
    apiMocks.deleteTrade.mockReset();
    apiMocks.createReview.mockReset();
    apiMocks.updateReview.mockReset();
    apiMocks.toast.success.mockReset();
    apiMocks.toast.error.mockReset();
    apiMocks.listAccounts.mockResolvedValue({ items: [baseTrade.account] });
    apiMocks.listSetups.mockResolvedValue({ items: [{ id: "setup-1", name: "Breakout", description: "", color: "#000000" }] });
    apiMocks.listReviews.mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the first page load state before trade data is ready", async () => {
    const deferredTrade = createDeferred<{ trade: typeof baseTrade }>();
    apiMocks.getTrade.mockReturnValue(deferredTrade.promise);

    renderTradeDetail();

    expect(screen.getByTestId("trade-detail-skeleton")).toBeInTheDocument();

    deferredTrade.resolve({ trade: baseTrade });

    await screen.findByRole("heading", { name: "EURUSD" });
  });

  it("transitions from loading to loaded without a hook-order crash", async () => {
    const deferredTrade = createDeferred<{ trade: typeof baseTrade }>();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    apiMocks.getTrade.mockReturnValue(deferredTrade.promise);

    renderTradeDetail();

    expect(screen.getByTestId("trade-detail-skeleton")).toBeInTheDocument();

    deferredTrade.resolve({ trade: baseTrade });

    await screen.findByText("Trade Overview");

    expect(consoleErrorSpy).not.toHaveBeenCalledWith(expect.stringMatching(/Rendered more hooks than during the previous render|change in the order of Hooks/i));
  });

  it("renders the missing-trade state safely", async () => {
    apiMocks.getTrade.mockRejectedValue(new ApiError("Trade not found.", 404, "TRADE_NOT_FOUND"));

    renderTradeDetail("missing-trade");

    await screen.findByText("Trade not found");
    expect(screen.getByText("This trade does not exist or may have been deleted.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to trades/i })).toBeInTheDocument();
  });

  it("renders the unauthorized-trade state safely", async () => {
    apiMocks.getTrade.mockRejectedValue(new ApiError("Authentication required.", 401, "UNAUTHORIZED"));

    renderTradeDetail("private-trade");

    await screen.findByText("Trade access denied");
    expect(screen.getByText("You are not allowed to view this trade right now.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to trades/i })).toBeInTheDocument();
  });

  it("renders a validation error for invalid trade routes", async () => {
    apiMocks.getTrade.mockRejectedValue(new ApiError("Invalid request", 400, "VALIDATION_ERROR", [
      { field: "id", message: "Trade id must be a valid UUID." },
    ]));

    renderTradeDetail("bad-trade-id");

    await screen.findByText("Invalid trade link");
    expect(screen.getByText("This trade link is invalid. Trade id must be a valid UUID.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("shows a timeout state and recovers after retry", async () => {
    apiMocks.getTrade
      .mockRejectedValueOnce(new ApiError("The request timed out. Please try again.", 408, "REQUEST_TIMEOUT"))
      .mockResolvedValueOnce({ trade: baseTrade });

    renderTradeDetail("trade-1");

    await screen.findByText("Trade request timed out");
    expect(screen.getByText("Loading this trade took too long. Please try again.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await screen.findByRole("heading", { name: "EURUSD" });
  });

  it("renders trade review content when a trade already has a review", async () => {
    apiMocks.getTrade.mockResolvedValue({ trade: baseTrade });
    apiMocks.listReviews.mockResolvedValue({
      items: [baseReview],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    });

    renderTradeDetail();

    await screen.findByText("Review completed");
    expect(screen.getByText("Review lesson: Stick to the retest confirmation.")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Edit Review" }).length).toBeGreaterThan(0);
  });

  it("renders trade share controls and opens the share modal", async () => {
    apiMocks.getTrade.mockResolvedValue({ trade: baseTrade });

    renderTradeDetail();

    const shareButton = await screen.findByRole("button", { name: "Share Trade" });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(screen.getByText("Share modal open")).toBeInTheDocument();
    });
  });
});
