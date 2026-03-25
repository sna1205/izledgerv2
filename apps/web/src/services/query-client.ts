import { QueryClient, type Query, type QueryKey } from "@tanstack/react-query";
import { ApiError } from "@/services/api/client";
import type { Trade } from "@/types";

export const PRIVATE_QUERY_ROOT = "private";
export const DEFAULT_QUERY_STALE_TIME_MS = 30_000;
export const DEFAULT_QUERY_GC_TIME_MS = 5 * 60_000;

type PaginatedResult<T> = {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

function isRetryableQueryError(error: unknown) {
  if (!(error instanceof ApiError)) {
    return false;
  }

  if (error.status === 401 || error.status === 403 || error.status === 404 || error.status === 422) {
    return false;
  }

  return (
    error.status === 0 ||
    error.status === 408 ||
    error.status === 429 ||
    error.status >= 500 ||
    error.code === "NETWORK_ERROR" ||
    error.code === "REQUEST_TIMEOUT" ||
    error.code === "REQUEST_ABORTED"
  );
}

export function shouldRetryQuery(failureCount: number, error: unknown) {
  return failureCount < 1 && isRetryableQueryError(error);
}

export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_QUERY_STALE_TIME_MS,
        gcTime: DEFAULT_QUERY_GC_TIME_MS,
        refetchOnWindowFocus: false,
        retry: shouldRetryQuery,
        retryDelay: (attemptIndex) => Math.min(750, 250 * attemptIndex),
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function privateQueryKey(userId: string, ...parts: QueryKey) {
  return [PRIVATE_QUERY_ROOT, userId, ...parts] as const;
}

export function isPrivateQuery(queryKey: QueryKey) {
  return Array.isArray(queryKey) && queryKey[0] === PRIVATE_QUERY_ROOT;
}

function matchesPrivateUser(query: Query, userId?: string) {
  if (!isPrivateQuery(query.queryKey)) {
    return false;
  }

  return userId ? query.queryKey[1] === userId : true;
}

export async function clearPrivateQueryCache(queryClient: QueryClient, userId?: string) {
  await queryClient.cancelQueries({
    predicate: (query) => matchesPrivateUser(query, userId),
  });

  queryClient.removeQueries({
    predicate: (query) => matchesPrivateUser(query, userId),
  });
}

export function updateTradeQueryData(queryClient: QueryClient, userId: string, trade: Trade) {
  queryClient.setQueryData(privateQueryKey(userId, "trades", "detail", trade.id), trade);
  queryClient.setQueryData(privateQueryKey(userId, "trades", "detail", trade.id, "review-page"), trade);
  queryClient.setQueriesData<PaginatedResult<Trade>>(
    { queryKey: privateQueryKey(userId, "trades", "list") },
    (current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) => (item.id === trade.id ? trade : item)),
          }
        : current,
  );
}

export async function syncTradeScreenshotQueryData(queryClient: QueryClient, userId: string, trade: Trade) {
  updateTradeQueryData(queryClient, userId, trade);

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "trades") }),
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "reviews") }),
  ]);
}

export function removeTradeQueryData(queryClient: QueryClient, userId: string, tradeId: string) {
  queryClient.removeQueries({ queryKey: privateQueryKey(userId, "trades", "detail", tradeId), exact: true });
  queryClient.removeQueries({ queryKey: privateQueryKey(userId, "trades", "detail", tradeId, "review-page"), exact: true });
  queryClient.removeQueries({ queryKey: privateQueryKey(userId, "reviews", "trade", tradeId), exact: true });
  queryClient.removeQueries({ queryKey: privateQueryKey(userId, "reviews", "trade", tradeId, "summary"), exact: true });
}
