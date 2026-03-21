import type { TradeResultValue } from "../../config/domain.js";

export function deriveTradeResultFromProfit(profit: number): TradeResultValue {
  if (profit > 0) {
    return "Win";
  }

  if (profit < 0) {
    return "Loss";
  }

  return "Breakeven";
}
