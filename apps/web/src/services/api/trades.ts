import type { Pagination, Trade } from "@/types";
import { apiFetch } from "@/services/api/client";

export type TradePayload = {
  date: string;
  accountId: string;
  pair: string;
  direction: Trade["direction"];
  entry: number;
  stopLoss: number;
  takeProfit: number;
  profit: number;
  result: Trade["result"];
  setupId?: string | null;
  setup?: string | null;
  session?: Trade["session"] | null;
  emotion?: Trade["emotion"] | null;
  notes?: string;
};

export type ListTradesParams = {
  accountId?: string;
  setupId?: string;
  pair?: string;
  dateFrom?: string;
  dateTo?: string;
  direction?: Trade["direction"];
  result?: Trade["result"];
  session?: NonNullable<Trade["session"]>;
  emotion?: NonNullable<Trade["emotion"]>;
  page?: number;
  pageSize?: number;
  sortBy?: "date" | "createdAt" | "profit" | "pair";
  sortOrder?: "asc" | "desc";
  includeDeleted?: boolean;
};

function buildQuery(params: ListTradesParams = {}) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    query.set(key, String(value));
  }

  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export function listTrades(params: ListTradesParams = {}) {
  return apiFetch<{ items: Trade[]; pagination: Pagination }>(`/trades${buildQuery(params)}`);
}

export function getTrade(tradeId: string) {
  return apiFetch<{ trade: Trade }>(`/trades/${tradeId}`);
}

export function createTrade(payload: TradePayload) {
  return apiFetch<{ trade: Trade }>("/trades", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateTrade(tradeId: string, payload: Partial<TradePayload>) {
  return apiFetch<{ trade: Trade }>(`/trades/${tradeId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteTrade(tradeId: string) {
  return apiFetch<void>(`/trades/${tradeId}`, {
    method: "DELETE",
  });
}
