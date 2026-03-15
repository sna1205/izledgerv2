import { getDefaultAccountId } from "./accounts";
import { Trade } from "./types";

const STORAGE_KEY = 'trading-journal-trades';

export function getTrades(): Trade[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return (JSON.parse(raw) as Trade[]).map((trade) => ({
      ...trade,
      accountId: trade.accountId || getDefaultAccountId(),
    }));
  } catch {
    return [];
  }
}

export function saveTrades(trades: Trade[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
}

export function addTrade(trade: Trade): void {
  const trades = getTrades();
  trades.unshift(trade);
  saveTrades(trades);
}

export function updateTrade(updated: Trade): void {
  const trades = getTrades().map(t => t.id === updated.id ? updated : t);
  saveTrades(trades);
}

export function deleteTrade(id: string): void {
  saveTrades(getTrades().filter(t => t.id !== id));
}

export function getTradeById(id: string): Trade | undefined {
  return getTrades().find(t => t.id === id);
}

export function generateId(): string {
  return crypto.randomUUID();
}
