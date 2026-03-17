import { format, parseISO } from "date-fns";
import { Direction, Result, Trade, TradeEmotion, TradeSession } from "@/lib/types";

export interface TradeShareSettings {
  showPnl: boolean;
  showAccountName: boolean;
  showNotes: boolean;
  showScreenshots: boolean;
  showExactPrices: boolean;
}

export interface TradeShareRecord {
  id: string;
  shareId: string;
  status: "active" | "revoked" | "expired";
  isActive: boolean;
  viewCount: number;
  expiresAt: string | null;
  publicUrl: string | null;
  settings: TradeShareSettings;
  createdAt: string;
  updatedAt: string;
}

export interface SharedTradeView {
  pair: string;
  direction: Direction;
  result: Result;
  date: string;
  rr: number | null;
  pnl: number | null;
  accountName: string | null;
  entry: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  setup: string | null;
  session: TradeSession | null;
  emotion: TradeEmotion | null;
  notes: string | null;
  screenshots: string[];
}

export const DEFAULT_TRADE_SHARE_SETTINGS: TradeShareSettings = {
  showPnl: true,
  showAccountName: false,
  showNotes: true,
  showScreenshots: true,
  showExactPrices: true,
};

export function getRiskReward(entry: number, stopLoss: number, takeProfit: number) {
  const risk = Math.abs(entry - stopLoss);
  const reward = Math.abs(takeProfit - entry);
  return risk > 0 ? Number((reward / risk).toFixed(4)) : null;
}

export function buildSharedTradeView(params: {
  trade: Trade;
  settings: TradeShareSettings;
  accountName?: string;
}): SharedTradeView {
  const { trade, settings, accountName } = params;

  return {
    pair: trade.pair,
    direction: trade.direction,
    result: trade.result,
    date: trade.date,
    rr: getRiskReward(trade.entry, trade.stopLoss, trade.takeProfit),
    pnl: settings.showPnl ? trade.profit : null,
    accountName: settings.showAccountName ? (accountName || null) : null,
    entry: settings.showExactPrices ? trade.entry : null,
    stopLoss: settings.showExactPrices ? trade.stopLoss : null,
    takeProfit: settings.showExactPrices ? trade.takeProfit : null,
    setup: trade.setup || null,
    session: trade.session || null,
    emotion: trade.emotion || null,
    notes: settings.showNotes ? (trade.notes || null) : null,
    screenshots: settings.showScreenshots ? trade.screenshots : [],
  };
}

export function formatSharedTradeDate(date: string) {
  return format(parseISO(date), "MMM d, yyyy");
}

export function formatSharedTradeDateTime(date: string) {
  return format(parseISO(date), "MMM d, yyyy h:mm a");
}

export function formatMoney(value: number) {
  return `${value >= 0 ? "+" : "-"}$${Math.abs(value).toFixed(2)}`;
}

export function formatPrice(value: number) {
  return value.toFixed(Math.abs(value) >= 100 ? 2 : 4);
}

export function getTradeShareStatusLabel(status: TradeShareRecord["status"]) {
  if (status === "active") return "Active";
  if (status === "expired") return "Expired";
  return "Revoked";
}

export function buildTradeShareFileName(data: SharedTradeView) {
  const safePair = data.pair.replace(/[^A-Za-z0-9_-]+/g, "-");
  return `trade-${safePair}-${data.date}.png`;
}
