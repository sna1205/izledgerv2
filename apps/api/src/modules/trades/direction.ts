import type { TradeDirectionValue } from "../../config/domain.js";

export function deriveTradeDirection(entry: number, stopLoss: number): TradeDirectionValue | null {
  if (entry === stopLoss) {
    return null;
  }

  return stopLoss < entry ? "Buy" : "Sell";
}
