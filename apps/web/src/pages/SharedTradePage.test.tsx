import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/services/api/client";
import SharedTradePage from "@/pages/SharedTradePage";

const shareMocks = vi.hoisted(() => ({
  getPublicTradeShare: vi.fn(),
}));

vi.mock("@/services/api/trade-shares", () => ({
  getPublicTradeShare: shareMocks.getPublicTradeShare,
}));

vi.mock("@/features/trade-sharing/components/ShareTradeCard", () => ({
  ShareTradeCard: ({ trade }: { trade: { pair: string } }) => <div>Shared card for {trade.pair}</div>,
}));

function renderPage(shareId: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/shared/trade/${shareId}`]}>
        <Routes>
          <Route path="/" element={<div>Home</div>} />
          <Route path="/shared/trade/:shareId" element={<SharedTradePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SharedTradePage", () => {
  beforeEach(() => {
    shareMocks.getPublicTradeShare.mockReset();
  });

  it("shows a clearer invalid share message", async () => {
    shareMocks.getPublicTradeShare.mockRejectedValue(
      new ApiError("Invalid share link.", 400, "INVALID_INPUT"),
    );

    renderPage("bad-link");

    expect(await screen.findByText("This shared trade link is invalid.")).toBeInTheDocument();
  });

  it("shows a revoked-share message", async () => {
    shareMocks.getPublicTradeShare.mockRejectedValue(
      new ApiError("This shared trade link was revoked by its owner.", 410, "TRADE_SHARE_REVOKED"),
    );

    renderPage("share-revoked");

    expect(await screen.findByText("This shared trade link was revoked by its owner.")).toBeInTheDocument();
  });

  it("shows an expired-share message", async () => {
    shareMocks.getPublicTradeShare.mockRejectedValue(
      new ApiError("This shared trade link has expired.", 410, "TRADE_SHARE_EXPIRED"),
    );

    renderPage("share-expired");

    expect(await screen.findByText("This shared trade link has expired.")).toBeInTheDocument();
  });
});
