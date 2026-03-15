import { z } from "zod";
import { tradeDirections, tradeEmotions, tradeResults, tradeSessions } from "../../config/domain.js";

export const tradeParamsSchema = z.object({
  id: z.string().uuid(),
});

const optionalString = z.string().trim().optional().nullable();

export const createTradeSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  accountId: z.string().uuid(),
  pair: z.string().trim().min(1).max(20),
  direction: z.enum(tradeDirections),
  entry: z.coerce.number(),
  stopLoss: z.coerce.number(),
  takeProfit: z.coerce.number(),
  profit: z.coerce.number(),
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
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  direction: z.enum(tradeDirections).optional(),
  result: z.enum(tradeResults).optional(),
  session: z.enum(tradeSessions).optional(),
  emotion: z.enum(tradeEmotions).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(["date", "createdAt", "profit", "pair"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  includeDeleted: z.coerce.boolean().default(false),
});
