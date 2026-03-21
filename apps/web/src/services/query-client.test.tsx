import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/services/api/client";
import {
  DEFAULT_QUERY_GC_TIME_MS,
  DEFAULT_QUERY_STALE_TIME_MS,
  clearPrivateQueryCache,
  createAppQueryClient,
  privateQueryKey,
  syncTradeScreenshotQueryData,
  updateTradeQueryData,
} from "@/services/query-client";

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
  setupId: "setup-1",
  setup: "Breakout",
  session: null,
  emotion: null,
  notes: "",
  screenshots: [],
  screenshotAssets: [],
  createdAt: "2026-03-16T10:00:00.000Z",
  updatedAt: "2026-03-16T10:00:00.000Z",
};

describe("react query helpers", () => {
  it("uses the shared stale and garbage-collection strategy", () => {
    const queryClient = createAppQueryClient();
    const defaults = queryClient.getDefaultOptions();

    expect(defaults.queries?.staleTime).toBe(DEFAULT_QUERY_STALE_TIME_MS);
    expect(defaults.queries?.gcTime).toBe(DEFAULT_QUERY_GC_TIME_MS);
    expect(defaults.mutations?.retry).toBe(false);
  });

  it("clears private caches without touching public queries", async () => {
    const queryClient = createAppQueryClient();

    queryClient.setQueryData(privateQueryKey("user-1", "trades", "list"), { items: [trade] });
    queryClient.setQueryData(["shared-trade", "share-1"], { id: "share-1" });
    queryClient.setQueryData(["auth", "me"], { user: { id: "user-1" } });

    await clearPrivateQueryCache(queryClient);

    expect(queryClient.getQueryData(privateQueryKey("user-1", "trades", "list"))).toBeUndefined();
    expect(queryClient.getQueryData(["shared-trade", "share-1"])).toEqual({ id: "share-1" });
    expect(queryClient.getQueryData(["auth", "me"])).toEqual({ user: { id: "user-1" } });
  });

  it("updates both trade list and detail caches for screenshot changes", () => {
    const queryClient = createAppQueryClient();
    const updatedTrade = {
      ...trade,
      screenshots: ["https://example.com/chart.png"],
      screenshotAssets: [
        {
          id: "shot-1",
          url: "https://example.com/chart.png",
          storageKey: "screenshots/shot-1.png",
          sortOrder: 0,
          createdAt: "2026-03-16T12:00:00.000Z",
        },
      ],
    };

    queryClient.setQueryData(privateQueryKey("user-1", "trades", "detail", trade.id), trade);
    queryClient.setQueryData(privateQueryKey("user-1", "trades", "detail", trade.id, "review-page"), trade);
    queryClient.setQueryData(privateQueryKey("user-1", "trades", "list", { page: 1 }), {
      items: [trade],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
    });

    updateTradeQueryData(queryClient, "user-1", updatedTrade);

    expect(queryClient.getQueryData(privateQueryKey("user-1", "trades", "detail", trade.id))).toEqual(updatedTrade);
    expect(queryClient.getQueryData(privateQueryKey("user-1", "trades", "detail", trade.id, "review-page"))).toEqual(updatedTrade);
    expect(
      queryClient.getQueryData<{ items: Array<typeof updatedTrade> }>(privateQueryKey("user-1", "trades", "list", { page: 1 }))?.items[0]?.screenshotAssets,
    ).toEqual(updatedTrade.screenshotAssets);
  });

  it("refreshes related queries after screenshot changes to recover stale views", async () => {
    const queryClient = createAppQueryClient();
    const updatedTrade = {
      ...trade,
      screenshots: ["https://example.com/chart.png"],
      screenshotAssets: [
        {
          id: "shot-1",
          url: "https://example.com/chart.png",
          storageKey: "screenshots/shot-1.png",
          sortOrder: 0,
          createdAt: "2026-03-16T12:00:00.000Z",
        },
      ],
    };
    const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

    await syncTradeScreenshotQueryData(queryClient, "user-1", updatedTrade);

    expect(queryClient.getQueryData(privateQueryKey("user-1", "trades", "detail", trade.id))).toEqual(updatedTrade);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: privateQueryKey("user-1", "trades") });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: privateQueryKey("user-1", "reviews") });
  });

  it("retries temporary query failures once and recovers", async () => {
    const queryClient = createAppQueryClient();
    let attempts = 0;

    const result = await queryClient.fetchQuery({
      queryKey: ["retry-test"],
      queryFn: async () => {
        attempts += 1;

        if (attempts === 1) {
          throw new ApiError("Network error", 0, "NETWORK_ERROR");
        }

        return "ok";
      },
    });

    expect(result).toBe("ok");
    expect(attempts).toBe(2);
  });

  it("does not retry non-recoverable client errors", async () => {
    const queryClient = createAppQueryClient();
    let attempts = 0;

    await expect(
      queryClient.fetchQuery({
        queryKey: ["no-retry-test"],
        queryFn: async () => {
          attempts += 1;
          throw new ApiError("Not found", 404, "NOT_FOUND");
        },
      }),
    ).rejects.toThrow("Not found");

    expect(attempts).toBe(1);
  });
});
