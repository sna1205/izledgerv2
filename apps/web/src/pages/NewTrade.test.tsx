import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NewTrade from "@/pages/NewTrade";

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
  listSetups: vi.fn(),
  createTrade: vi.fn(),
}));

vi.mock("@/services/api/accounts", () => ({
  listAccounts: apiMocks.listAccounts,
}));

vi.mock("@/services/api/setups", () => ({
  listSetups: apiMocks.listSetups,
}));

vi.mock("@/services/api/trades", () => ({
  createTrade: apiMocks.createTrade,
}));

vi.mock("@/features/trades/components/TradeFormPage", () => ({
  TradeFormPage: () => <div>trade-form-page</div>,
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
      <MemoryRouter initialEntries={["/trades/new"]}>
        <Routes>
          <Route path="/accounts" element={<div>Accounts Page</div>} />
          <Route path="/trades/new" element={<NewTrade />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("NewTrade", () => {
  beforeEach(() => {
    apiMocks.listAccounts.mockReset();
    apiMocks.listSetups.mockReset();
    apiMocks.createTrade.mockReset();
  });

  it("guides beginners to add an account before showing the trade form", async () => {
    apiMocks.listAccounts.mockResolvedValue({ items: [] });
    apiMocks.listSetups.mockResolvedValue({ items: [] });

    renderPage();

    await screen.findByText("Add your first account before logging a trade");
    expect(screen.queryByText("trade-form-page")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add Account" }));

    expect(screen.getByText("Accounts Page")).toBeInTheDocument();
  });
});
