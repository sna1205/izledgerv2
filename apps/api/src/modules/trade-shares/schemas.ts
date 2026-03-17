import { z } from "zod";

export const tradeShareSettingsSchema = z.object({
  showPnl: z.boolean().default(true),
  showAccountName: z.boolean().default(false),
  showNotes: z.boolean().default(true),
  showScreenshots: z.boolean().default(true),
  showExactPrices: z.boolean().default(true),
});

export const createTradeShareSchema = z
  .object({
    settings: tradeShareSettingsSchema,
    expiresAt: z.string().datetime().optional().nullable(),
  })
  .transform((value) => ({
    settings: tradeShareSettingsSchema.parse(value.settings),
    expiresAt: value.expiresAt ?? null,
  }));

export const tradeShareParamsSchema = z.object({
  shareId: z.string().min(16).max(128).regex(/^[A-Za-z0-9_-]+$/),
});

export const tradeShareListParamsSchema = z.object({
  id: z.string().uuid(),
});

export type TradeShareSettingsInput = z.infer<typeof tradeShareSettingsSchema>;
