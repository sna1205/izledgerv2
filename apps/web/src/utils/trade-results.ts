import type { Direction, Result } from "@/types";

export function parseTradeNumericInput(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseTradeProfitInput(value: unknown) {
  return parseTradeNumericInput(value);
}

export function deriveTradeResultFromProfit(value: unknown): Result | null {
  const parsedProfit = parseTradeProfitInput(value);

  if (parsedProfit === null) {
    return null;
  }

  if (parsedProfit > 0) {
    return "Win";
  }

  if (parsedProfit < 0) {
    return "Loss";
  }

  return "Breakeven";
}

export function deriveTradeDirectionFromPrices(entry: unknown, stopLoss: unknown): Direction | null {
  const parsedEntry = parseTradeNumericInput(entry);
  const parsedStopLoss = parseTradeNumericInput(stopLoss);

  if (parsedEntry === null || parsedStopLoss === null || parsedEntry === parsedStopLoss) {
    return null;
  }

  return parsedStopLoss < parsedEntry ? "Buy" : "Sell";
}

export function getTradeDirectionError(entry: unknown, stopLoss: unknown) {
  const parsedEntry = parseTradeNumericInput(entry);
  const parsedStopLoss = parseTradeNumericInput(stopLoss);

  if (parsedEntry === null || parsedStopLoss === null) {
    return null;
  }

  if (parsedEntry === parsedStopLoss) {
    return "Stop Loss must be above or below Entry to determine trade direction";
  }

  return null;
}

export function getTakeProfitDirectionWarning(entry: unknown, stopLoss: unknown, takeProfit: unknown) {
  const direction = deriveTradeDirectionFromPrices(entry, stopLoss);
  const parsedEntry = parseTradeNumericInput(entry);
  const parsedTakeProfit = parseTradeNumericInput(takeProfit);

  if (!direction || parsedEntry === null || parsedTakeProfit === null) {
    return null;
  }

  if (direction === "Buy" && parsedTakeProfit <= parsedEntry) {
    return "Take Profit is below Entry for a Buy setup.";
  }

  if (direction === "Sell" && parsedTakeProfit >= parsedEntry) {
    return "Take Profit is above Entry for a Sell setup.";
  }

  return null;
}
