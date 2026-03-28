import { z } from "zod";
import { tradeDirections, tradeEmotions, tradeResults, tradeSessions } from "../../config/domain.js";
import {
  boundedIntSchema,
  finiteNumberSchema,
  nonnegativeMoneySchema,
  numericBounds,
  positivePriceSchema,
  signedMoneySchema,
} from "../../utils/validation.js";
import { isoCalendarDateSchema } from "../../utils/date-validation.js";

export const tradeParamsSchema = z.object({
  id: z.string().uuid(),
});

const optionalString = z.string().trim().optional().nullable();
const optionalClientRequestIdSchema = z.string().trim().min(1).max(128).optional().nullable();
const isoDateSchema = isoCalendarDateSchema("Invalid trade date");
const optionalTimestampSchema = z.string().datetime({ offset: true }).optional().nullable().transform((value) => {
  if (!value) {
    return undefined;
  }

  return new Date(value);
});
const optionalPositivePositionSchema = finiteNumberSchema()
  .positive()
  .max(numericBounds.maxTradePositionSize)
  .optional()
  .nullable();
const optionalPositiveMoneySchema = finiteNumberSchema()
  .positive()
  .max(numericBounds.maxTradeProfitAbs)
  .optional()
  .nullable();
const optionalRiskPercentSchema = finiteNumberSchema()
  .positive()
  .max(numericBounds.maxTradeRiskPercent)
  .optional()
  .nullable();
const checklistResponseSchema = z.object({
  checklistRuleId: z.string().uuid(),
  checked: z.boolean().default(false),
  note: z.string().trim().max(1000).optional().nullable(),
});

const tradeWriteSchema = z.object({
  date: isoDateSchema,
  accountId: z.string().uuid(),
  clientRequestId: optionalClientRequestIdSchema,
  pair: z.string().trim().min(1).max(20),
  entry: positivePriceSchema(numericBounds.maxTradePrice),
  stopLoss: positivePriceSchema(numericBounds.maxTradePrice),
  takeProfit: positivePriceSchema(numericBounds.maxTradePrice),
  quantity: optionalPositivePositionSchema,
  lotSize: optionalPositivePositionSchema,
  exitPrice: positivePriceSchema(numericBounds.maxTradePrice).optional().nullable(),
  fees: nonnegativeMoneySchema(numericBounds.maxTradeProfitAbs).optional().nullable(),
  riskAmount: optionalPositiveMoneySchema,
  riskPercent: optionalRiskPercentSchema,
  profit: signedMoneySchema(numericBounds.maxTradeProfitAbs),
  setupId: z.string().uuid().optional().nullable(),
  setup: optionalString,
  session: z.enum(tradeSessions).optional().nullable(),
  emotion: z.enum(tradeEmotions).optional().nullable(),
  notes: z.string().max(10000).default(""),
  openedAt: optionalTimestampSchema,
  closedAt: optionalTimestampSchema,
  checklistResponses: z.array(checklistResponseSchema).default([]),
  checklistScopeMode: z.enum(["applicable", "exact"]).optional(),
});

export const createTradeSchema = tradeWriteSchema.refine(
  (value) => !value.openedAt || !value.closedAt || value.closedAt.getTime() >= value.openedAt.getTime(),
  {
    message: "Closed time must be on or after opened time.",
    path: ["closedAt"],
  },
);

export const updateTradeSchema = tradeWriteSchema.omit({
  clientRequestId: true,
}).partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required.",
).refine(
  (value) => !value.openedAt || !value.closedAt || value.closedAt.getTime() >= value.openedAt.getTime(),
  {
    message: "Closed time must be on or after opened time.",
    path: ["closedAt"],
  },
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
