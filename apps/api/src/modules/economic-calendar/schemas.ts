import { z } from "zod";

const impactSchema = z.enum(["holiday", "low", "medium", "high"]);

function parseCsv(input: string | undefined) {
  if (!input) {
    return [];
  }

  return input
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

const csvCurrenciesSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return [];
  }

  return parseCsv(value).map((item) => item.toUpperCase());
}, z.array(z.string().regex(/^[A-Z]{3}$/)).default([]));

const csvImpactsSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return [];
  }

  return parseCsv(value).map((item) => item.toLowerCase());
}, z.array(impactSchema).default([]));

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const economicCalendarQuerySchema = z.object({
  range: z.enum(["today", "week"]).optional(),
  dateFrom: dateSchema.optional(),
  dateTo: dateSchema.optional(),
  currencies: csvCurrenciesSchema.optional().default([]),
  impacts: csvImpactsSchema.optional().default([]),
  instrument: z.string().trim().min(1).max(16).optional(),
  relevantOnly: z.preprocess((value) => {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
    }

    return false;
  }, z.boolean()).default(false),
  live: z.preprocess((value) => {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
    }

    return false;
  }, z.boolean()).default(false),
}).superRefine((value, ctx) => {
  if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dateTo"],
      message: "dateTo must be on or after dateFrom.",
    });
  }

  if (value.relevantOnly && !value.instrument) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["instrument"],
      message: "instrument is required when relevantOnly=true.",
    });
  }
});

export type EconomicCalendarQuery = z.infer<typeof economicCalendarQuerySchema>;

export const economicCalendarDetailQuerySchema = z.object({
  instrument: z.string().trim().min(1).max(16).optional(),
  live: z.preprocess((value) => {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
    }

    return false;
  }, z.boolean()).default(false),
});

export const economicCalendarDetailParamsSchema = z.object({
  eventId: z.string().trim().min(1).max(128),
});

export type EconomicCalendarDetailQuery = z.infer<typeof economicCalendarDetailQuerySchema>;
export type EconomicCalendarDetailParams = z.infer<typeof economicCalendarDetailParamsSchema>;
