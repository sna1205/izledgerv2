import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Trades from "@/pages/Trades";
import Reviews from "@/pages/Reviews";
import Setups from "@/pages/Setups";

vi.mock("@/lib/auth", () => ({
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
  createTrade: vi.fn(),
  updateTrade: vi.fn(),
  deleteTrade: vi.fn(),
  getTrade: vi.fn(),
  listReviews: vi.fn(),
  createReview: vi.fn(),
  updateReview: vi.fn(),
  deleteReview: vi.fn(),
  listSetups: vi.fn(),
  createSetup: vi.fn(),
  updateSetup: vi.fn(),
  deleteSetup: vi.fn(),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/api/accounts", () => ({
  listAccounts: apiMocks.listAccounts,
}));

vi.mock("@/lib/api/trades", () => ({
  listTrades: apiMocks.listTrades,
  createTrade: apiMocks.createTrade,
  updateTrade: apiMocks.updateTrade,
  deleteTrade: apiMocks.deleteTrade,
  getTrade: apiMocks.getTrade,
}));

vi.mock("@/lib/api/reviews", () => ({
  listReviews: apiMocks.listReviews,
  createReview: apiMocks.createReview,
  updateReview: apiMocks.updateReview,
  deleteReview: apiMocks.deleteReview,
}));

vi.mock("@/lib/api/setups", () => ({
  listSetups: apiMocks.listSetups,
  createSetup: apiMocks.createSetup,
  updateSetup: apiMocks.updateSetup,
  deleteSetup: apiMocks.deleteSetup,
}));

vi.mock("@/components/ui/sonner", () => ({
  toast: apiMocks.toast,
  Toaster: () => null,
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

vi.mock("@/components/ProfitDisplay", () => ({
  ProfitDisplay: ({ value }: { value: number }) => <span>{value}</span>,
}));

vi.mock("@/components/ResultBadge", () => ({
  ResultBadge: ({ result }: { result: string }) => <span>{result}</span>,
}));

vi.mock("@/components/TradeReviewStatusBadge", () => ({
  TradeReviewStatusBadge: ({ reviewed }: { reviewed: boolean }) => <span>{reviewed ? "Reviewed" : "Pending Review"}</span>,
}));

vi.mock("@/components/TradeFormDialog", () => ({
  TradeFormDialog: () => null,
}));

vi.mock("@/components/TradeReviewDialog", () => ({
  TradeReviewDialog: () => null,
}));

vi.mock("@/components/TradeReviewContent", () => ({
  TradeReviewContent: () => <div>Review details</div>,
}));

vi.mock("@/components/TradeReviewSummary", () => ({
  TradeReviewSummary: ({ trade }: { trade: { pair: string } }) => <div>{trade.pair}</div>,
}));

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
      <MemoryRouter>{page}</MemoryRouter>
    </QueryClientProvider>,
  );
}

function normalizeText(text: string | null | undefined) {
  return text?.replace(/\s+/g, " ").trim() ?? "";
}

function hasTextContent(text: string) {
  return (_content: string, node: Element | null) => {
    if (!node) {
      return false;
    }

    const normalizedNodeText = normalizeText(node.textContent);

    if (normalizedNodeText !== text) {
      return false;
    }

    return Array.from(node.children).every((child) => normalizeText(child.textContent) !== text);
  };
}

const account = {
  id: "account-1",
  name: "Primary",
  broker: "Manual",
  type: "Personal" as const,
  balance: 1000,
  currency: "USD",
  isDefault: true,
};

const trade = {
  id: "trade-1",
  date: "2026-03-16",
  pair: "EURUSD",
  accountId: "account-1",
  direction: "Buy" as const,
  entry: 1.1,
  stopLoss: 1.09,
  takeProfit: 1.12,
  profit: 250,
  result: "Win" as const,
  setup: "Breakout",
  notes: "",
  screenshots: [],
  screenshotAssets: [],
  createdAt: "2026-03-16T10:00:00.000Z",
  updatedAt: "2026-03-16T10:00:00.000Z",
};

const review = {
  id: "review-1",
  type: "daily" as const,
  reviewScope: "daily" as const,
  reviewDate: "2026-03-16",
  lessonLearned: "Stay patient.",
  createdAt: "2026-03-16T10:00:00.000Z",
  updatedAt: "2026-03-16T11:00:00.000Z",
};

beforeEach(() => {
  localStorage.clear();
  apiMocks.toast.success.mockReset();
  apiMocks.toast.error.mockReset();
  apiMocks.listAccounts.mockReset();
  apiMocks.listTrades.mockReset();
  apiMocks.listReviews.mockReset();
  apiMocks.listSetups.mockReset();
  apiMocks.createSetup.mockReset();
  apiMocks.updateSetup.mockReset();
  apiMocks.deleteSetup.mockReset();
  apiMocks.getTrade.mockReset();

  apiMocks.listAccounts.mockResolvedValue({ items: [account] });
  apiMocks.getTrade.mockResolvedValue({ trade });
  apiMocks.listSetups.mockResolvedValue({
    items: [{ id: "setup-1", name: "Breakout", description: "Retest entry", color: "#10b981", tradeCount: 42 }],
    pagination: { page: 1, pageSize: 12, total: 33, totalPages: 3, hasNextPage: true, hasPreviousPage: false },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("server-backed list pages", () => {
  it("uses server-backed pagination, filters, and sorting for trades", async () => {
    apiMocks.listTrades.mockImplementation(async (params) => ({
      items: [{ ...trade, emotion: params.emotion ?? "Focused", session: params.session ?? "London" }],
      pagination: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
        total: 121,
        totalPages: 13,
        hasNextPage: (params.page ?? 1) < 13,
        hasPreviousPage: (params.page ?? 1) > 1,
      },
    }));
    apiMocks.listReviews.mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 1, total: 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false } });

    renderPage(<Trades />);

    await screen.findByText(hasTextContent("121 trades in view"));
    expect(screen.getByText(hasTextContent("Page 1 of 13 ledger pages"))).toBeInTheDocument();

    await waitFor(() => {
      expect(apiMocks.listTrades).toHaveBeenCalledWith(expect.objectContaining({
        page: 1,
        pageSize: 10,
        sortBy: "date",
        sortOrder: "desc",
      }));
    });

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(apiMocks.listTrades).toHaveBeenCalledWith(expect.objectContaining({
        page: 2,
        pageSize: 10,
      }));
    });

    fireEvent.click(screen.getByRole("button", { name: "Screenbook" }));

    await waitFor(() => {
      expect(apiMocks.listTrades).toHaveBeenCalledWith(expect.objectContaining({
        page: 1,
        pageSize: 9,
      }));
    });

    fireEvent.change(screen.getByDisplayValue("All Emotions"), { target: { value: "Focused" } });

    await waitFor(() => {
      expect(apiMocks.listTrades).toHaveBeenCalledWith(expect.objectContaining({
        emotion: "Focused",
        page: 1,
      }));
    });

    await screen.findByDisplayValue("Focused");
    fireEvent.change(screen.getByDisplayValue("Trade Date"), { target: { value: "pair" } });

    await waitFor(() => {
      expect(apiMocks.listTrades).toHaveBeenCalledWith(expect.objectContaining({
        sortBy: "pair",
      }));
    });
  });

  it("uses server-backed filters, sorting, paging, and totals for reviews", async () => {
    apiMocks.listReviews.mockImplementation(async (params) => ({
      items: [{ ...review, type: params.type ?? "daily", reviewScope: params.type ?? "daily" }],
      pagination: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
        total: 134,
        totalPages: 14,
        hasNextPage: (params.page ?? 1) < 14,
        hasPreviousPage: (params.page ?? 1) > 1,
      },
    }));

    renderPage(<Reviews />);

    await screen.findByText("134");
    expect(screen.getByText(hasTextContent("Page 1 of 14 review pages"))).toBeInTheDocument();

    await waitFor(() => {
      expect(apiMocks.listReviews).toHaveBeenCalledWith(expect.objectContaining({
        page: 1,
        pageSize: 10,
        sortBy: "updatedAt",
        sortOrder: "desc",
      }));
    });

    fireEvent.click(screen.getByRole("button", { name: "Trade" }));

    await waitFor(() => {
      expect(apiMocks.listReviews).toHaveBeenCalledWith(expect.objectContaining({
        type: "trade",
        page: 1,
      }));
    });

    await screen.findByText("134");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(apiMocks.listReviews).toHaveBeenCalledWith(expect.objectContaining({
        page: 2,
      }));
    });

    await screen.findByText(hasTextContent("Page 2 of 14 review pages"));
    fireEvent.change(screen.getByDisplayValue("Updated At"), { target: { value: "createdAt" } });

    await waitFor(() => {
      expect(apiMocks.listReviews).toHaveBeenCalledWith(expect.objectContaining({
        sortBy: "createdAt",
        page: 1,
      }));
    });
  });

  it("uses server-backed search, sorting, paging, and totals for setups", async () => {
    apiMocks.listSetups.mockImplementation(async (params) => ({
      items: [{
        id: "setup-1",
        name: params.search ? `Filtered ${params.search}` : "Breakout",
        description: "Retest entry",
        color: "#10b981",
        tradeCount: 42,
      }],
      pagination: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 12,
        total: 33,
        totalPages: 3,
        hasNextPage: (params.page ?? 1) < 3,
        hasPreviousPage: (params.page ?? 1) > 1,
      },
    }));

    renderPage(<Setups />);

    await screen.findByText(hasTextContent("33 setups in view"));
    expect(screen.getAllByText("42").length).toBeGreaterThan(0);
    expect(screen.getByText(hasTextContent("Page 1 of 3 setup pages"))).toBeInTheDocument();

    await waitFor(() => {
      expect(apiMocks.listSetups).toHaveBeenCalledWith(expect.objectContaining({
        page: 1,
        pageSize: 12,
        sortBy: "createdAt",
        sortOrder: "asc",
        status: "all",
      }));
    });

    fireEvent.change(screen.getByPlaceholderText("Search setups..."), { target: { value: "Break" } });

    await waitFor(() => {
      expect(apiMocks.listSetups).toHaveBeenCalledWith(expect.objectContaining({
        search: "Break",
        page: 1,
      }));
    });

    await screen.findByText(hasTextContent("33 setups in view"));
    fireEvent.change(screen.getByDisplayValue("All Setups"), { target: { value: "archived" } });

    await waitFor(() => {
      expect(apiMocks.listSetups).toHaveBeenCalledWith(expect.objectContaining({
        status: "archived",
        page: 1,
      }));
    });

    await screen.findByDisplayValue("Archived");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(apiMocks.listSetups).toHaveBeenCalledWith(expect.objectContaining({
        page: 2,
      }));
    });
  });

});
