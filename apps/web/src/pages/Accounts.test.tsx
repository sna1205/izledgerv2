import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Accounts from "@/pages/Accounts";
import { ApiError } from "@/services/api/client";

vi.mock("@/features/auth/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      username: "trader",
    },
  }),
}));

vi.mock("@/features/auth/use-unauthorized-session-guard", () => ({
  useUnauthorizedSessionGuard: () => undefined,
}));

vi.mock("@/utils/loading", () => ({
  withMinimumDelay: async <T,>(operation: Promise<T> | (() => Promise<T>)) => (
    typeof operation === "function" ? operation() : operation
  ),
}));

const apiMocks = vi.hoisted(() => ({
  listAccounts: vi.fn(),
  getAnalyticsBreakdowns: vi.fn(),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  deleteAccount: vi.fn(),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/services/api/accounts", () => ({
  listAccounts: apiMocks.listAccounts,
  createAccount: apiMocks.createAccount,
  updateAccount: apiMocks.updateAccount,
  deleteAccount: apiMocks.deleteAccount,
}));

vi.mock("@/services/api/analytics", () => ({
  getAnalyticsBreakdowns: apiMocks.getAnalyticsBreakdowns,
}));

vi.mock("@/components/ui/sonner", () => ({
  toast: apiMocks.toast,
  Toaster: () => null,
}));

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
        <Accounts />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  apiMocks.listAccounts.mockReset();
  apiMocks.getAnalyticsBreakdowns.mockReset();
  apiMocks.createAccount.mockReset();
  apiMocks.updateAccount.mockReset();
  apiMocks.deleteAccount.mockReset();
  apiMocks.toast.success.mockReset();
  apiMocks.toast.error.mockReset();

  apiMocks.listAccounts.mockResolvedValue({
    items: [
      {
        id: "account-1",
        name: "Main Account",
        broker: "Manual",
        type: "Personal",
        balance: 1000,
        currency: "USD",
        isDefault: true,
        isArchived: false,
        createdAt: "2026-03-29T06:00:00.000Z",
        updatedAt: "2026-03-29T06:00:00.000Z",
      },
    ],
  });

  apiMocks.getAnalyticsBreakdowns.mockResolvedValue({
    summary: {
      totalTrades: 1,
      wins: 1,
      losses: 0,
      breakevens: 0,
      totalProfit: 40,
      totalGross: 40,
      totalLoss: 0,
      winRate: 100,
      avgRR: 2,
      avgPlannedRR: 2,
      avgRealizedR: 2,
      displayCurrency: "USD",
      isMixedCurrency: false,
      currencyTotals: [{ currency: "USD", totalProfit: 40 }],
    },
    accountPerformance: [
      {
        accountId: "account-1",
        accountName: "Main Account",
        currency: "USD",
        profit: 40,
        trades: 1,
        winRate: 100,
      },
    ],
  });
});

describe("Accounts delete guidance", () => {
  it("shows proactive archive guidance on accounts that already have history", async () => {
    renderPage();

    expect(await screen.findByText("Main Account")).toBeInTheDocument();
    expect(screen.getByText("This account already has journal history. Archive it when you retire it. Delete is best for unused accounts.")).toBeInTheDocument();
  });

  it("keeps the delete dialog open and explains when account history blocks deletion", async () => {
    apiMocks.deleteAccount.mockRejectedValue(
      new ApiError(
        "Account cannot be deleted because trades still reference it. Archive the account instead.",
        409,
        "ACCOUNT_IN_USE",
      ),
    );

    renderPage();

    await screen.findByText("Main Account");
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Permanently" }));

    await waitFor(() => {
      expect(apiMocks.deleteAccount).toHaveBeenCalledWith("account-1");
    });

    expect(await screen.findByText("Account cannot be deleted because trades still reference it. Archive the account instead.")).toBeInTheDocument();
    expect(screen.getByText("Delete Account")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archive Instead" })).toBeInTheDocument();
  });

  it("lets users archive the account from the delete dialog", async () => {
    apiMocks.updateAccount.mockResolvedValue({
      account: {
        id: "account-1",
        name: "Main Account",
        broker: "Manual",
        type: "Personal",
        balance: 1000,
        currency: "USD",
        isDefault: false,
        isArchived: true,
        createdAt: "2026-03-29T06:00:00.000Z",
        updatedAt: "2026-03-29T06:00:00.000Z",
      },
    });

    renderPage();

    await screen.findByText("Main Account");
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Archive Instead" }));

    await waitFor(() => {
      expect(apiMocks.updateAccount).toHaveBeenCalledWith("account-1", { isArchived: true });
    });

    await waitFor(() => {
      expect(screen.queryByText("Delete Account")).not.toBeInTheDocument();
    });
  });
});
