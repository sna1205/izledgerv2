import { z } from "zod";

export const numericBounds = {
  maxAccountBalance: 999_999_999_999.99,
  maxTradePrice: 1_000_000_000,
  maxTradeProfitAbs: 999_999_999_999.99,
  maxPage: 10_000,
  maxPageSize: 100,
  maxScreenshotSortOrder: 1_000,
} as const;

export function finiteNumberSchema() {
  return z.coerce.number().finite();
}

export function boundedIntSchema(min: number, max: number) {
  return finiteNumberSchema().int().min(min).max(max);
}

export function nonnegativeMoneySchema(max: number) {
  return finiteNumberSchema().nonnegative().max(max);
}

export function positivePriceSchema(max: number) {
  return finiteNumberSchema().positive().max(max);
}

export function signedMoneySchema(maxAbs: number) {
  return finiteNumberSchema().min(-maxAbs).max(maxAbs);
}
