import { format, isValid, parseISO } from "date-fns";
import { z } from "zod";
import { tradeDirections, tradeEmotions, tradeResults, tradeSessions } from "../../config/domain.js";
import { boundedIntSchema, numericBounds, positivePriceSchema, signedMoneySchema } from "../../utils/validation.js";

export const tradeParamsSchema = z.object({
  id: z.string().uuid(),
});

const optionalString = z.string().trim().optional().nullable();
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = parseISO(value);
  return isValid(date) && value === format(date, "yyyy-MM-dd");
}, "Invalid trade date");

export const createTradeSchema = z.object({
  date: isoDateSchema,
  accountId: z.string().uuid(),
  pair: z.string().trim().min(1).max(20),
  direction: z.enum(tradeDirections),
  entry: positivePriceSchema(numericBounds.maxTradePrice),
  stopLoss: positivePriceSchema(numericBounds.maxTradePrice),
  takeProfit: positivePriceSchema(numericBounds.maxTradePrice),
  profit: signedMoneySchema(numericBounds.maxTradeProfitAbs),
  result: z.enum(tradeResults),
  setupId: z.string().uuid().optional().nullable(),
  setup: optionalString,
  session: z.enum(tradeSessions).optional().nullable(),
  emotion: z.enum(tradeEmotions).optional().nullable(),
  notes: z.string().max(10000).default(""),
});

export const updateTradeSchema = createTradeSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required.",
);

export const listTradesQuerySchema = z.object({
  accountId: z.string().uuid().optional(),
  setupId: z.string().uuid().optional(),
  pair: z.string().trim().optional(),
  dateFrom: isoDateSchema.optional(),
  dateTo: isoDateSchema.optional(),
  direction: z.enum(tradeDirections).optional(),
  result: z.enum(tradeResults).optional(),
  session: z.enum(tradeSessions).optional(),
  emotion: z.enum(tradeEmotions).optional(),
  page: boundedIntSchema(1, numericBounds.maxPage).default(1),
  pageSize: boundedIntSchema(1, numericBounds.maxPageSize).default(20),
  sortBy: z.enum(["date", "createdAt", "profit", "pair"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  includeDeleted: z.coerce.boolean().default(false),
});
