import { apiFetch } from "@/lib/api/client";
import { SharedTradeView, TradeShareRecord, TradeShareSettings } from "@/lib/trade-sharing";

export function getTradeShares(tradeId: string) {
  return apiFetch<{ items: TradeShareRecord[] }>(`/trades/${tradeId}/shares`);
}

export function createTradeShare(tradeId: string, payload: {
  settings: TradeShareSettings;
  expiresAt?: string | null;
}) {
  return apiFetch<{ share: TradeShareRecord }>(`/trades/${tradeId}/share`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function revokeTradeShare(shareId: string) {
  return apiFetch<{ share: TradeShareRecord }>(`/shared/trade/${shareId}/revoke`, {
    method: "PATCH",
  });
}

export function getPublicTradeShare(shareId: string) {
  return apiFetch<{ trade: SharedTradeView }>(`/shared/trade/${shareId}`, {
    method: "GET",
  });
}
