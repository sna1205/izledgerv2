import { Prisma } from "@prisma/client";
import { z } from "zod";
import { isoCalendarDateSchema } from "../../utils/date-validation.js";
import { AppError } from "../../utils/errors.js";
import { numericBounds, positivePriceSchema, signedMoneySchema } from "../../utils/validation.js";
import { tradeShareSettingsSchema } from "./schemas.js";

const TRADE_SHARE_SETTINGS_VERSION = 1;
const TRADE_SHARE_SNAPSHOT_VERSION = 1;

const tradeShareScreenshotSchema = z.object({
  storageKey: z.string().min(1),
  sortOrder: z.number().int().nonnegative(),
});

const tradeShareSnapshotDataSchema = z
  .object({
    tradeId: z.string().uuid(),
    pair: z.string().min(1),
    direction: z.enum(["Buy", "Sell"]),
    result: z.enum(["Win", "Loss", "Breakeven"]),
    date: isoCalendarDateSchema("Trade share snapshot date is invalid."),
    entry: positivePriceSchema(numericBounds.maxTradePrice),
    stopLoss: positivePriceSchema(numericBounds.maxTradePrice),
    takeProfit: positivePriceSchema(numericBounds.maxTradePrice),
    pnl: signedMoneySchema(numericBounds.maxTradeProfitAbs),
    rr: z.number().finite().nullable().optional(),
    setup: z.string().nullable().optional(),
    session: z.enum(["Asia", "London", "New York"]).nullable().optional(),
    emotion: z.enum(["Calm", "Focused", "Confident", "Anxious", "Frustrated"]).nullable().optional(),
    notes: z.string().nullable().optional(),
    accountName: z.string().nullable().optional(),
    screenshots: z.array(tradeShareScreenshotSchema).optional(),
  })
  .passthrough()
  .transform((value) => ({
    ...value,
    rr: value.rr ?? getRiskReward(value.entry, value.stopLoss, value.takeProfit),
    setup: value.setup ?? null,
    session: value.session ?? null,
    emotion: value.emotion ?? null,
    notes: value.notes ?? null,
    accountName: value.accountName ?? null,
    screenshots: value.screenshots ?? [],
  }));

const versionedTradeShareSettingsSchema = z
  .object({
    version: z.literal(TRADE_SHARE_SETTINGS_VERSION),
    data: tradeShareSettingsSchema,
  })
  .passthrough();

const versionedTradeShareSnapshotSchema = z
  .object({
    version: z.literal(TRADE_SHARE_SNAPSHOT_VERSION),
    data: tradeShareSnapshotDataSchema,
  })
  .passthrough();

export type StoredTradeShareSettings = z.infer<typeof tradeShareSettingsSchema>;
export type TradeShareSnapshot = z.infer<typeof tradeShareSnapshotDataSchema>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRiskReward(entry: number, stopLoss: number, takeProfit: number) {
  const risk = Math.abs(entry - stopLoss);
  const reward = Math.abs(takeProfit - entry);
  return risk > 0 ? Number((reward / risk).toFixed(4)) : null;
}

function normalizeSnapshotDataInput(value: unknown) {
  if (!isRecord(value)) {
    return value;
  }

  if (!Array.isArray(value.screenshots)) {
    return value;
  }

  return {
    ...value,
    screenshots: value.screenshots.map((item, index) => {
      if (typeof item === "string") {
        return {
          storageKey: item,
          sortOrder: index,
        };
      }

      return item;
    }),
  };
}

function normalizeSnapshotPayloadInput(value: unknown) {
  if (!isRecord(value)) {
    return value;
  }

  if ("version" in value && "data" in value) {
    return {
      ...value,
      data: normalizeSnapshotDataInput(value.data),
    };
  }

  return normalizeSnapshotDataInput(value);
}

function isVersionedPayload(value: unknown) {
  return isRecord(value) && "version" in value && "data" in value;
}

function toUnavailableShareError() {
  return new AppError(410, "TRADE_SHARE_UNAVAILABLE", "This shared trade link is unavailable.");
}

export function serializeTradeShareSettings(settings: StoredTradeShareSettings) {
  return {
    version: TRADE_SHARE_SETTINGS_VERSION,
    data: tradeShareSettingsSchema.parse(settings),
  } satisfies Prisma.JsonObject;
}

export function serializeTradeShareSnapshot(snapshot: TradeShareSnapshot) {
  return {
    version: TRADE_SHARE_SNAPSHOT_VERSION,
    data: tradeShareSnapshotDataSchema.parse(snapshot),
  } satisfies Prisma.JsonObject;
}

export function parseStoredTradeShareSettings(
  value: Prisma.JsonValue,
  options?: { fallbackToDefaults?: boolean },
) {
  const versioned = versionedTradeShareSettingsSchema.safeParse(value);

  if (versioned.success) {
    return versioned.data.data satisfies StoredTradeShareSettings;
  }

  if (isVersionedPayload(value)) {
    throw toUnavailableShareError();
  }

  const legacy = tradeShareSettingsSchema.safeParse(value);

  if (legacy.success) {
    return legacy.data satisfies StoredTradeShareSettings;
  }

  if (options?.fallbackToDefaults) {
    return tradeShareSettingsSchema.parse({});
  }

  throw toUnavailableShareError();
}

export function parseStoredTradeShareSnapshot(value: Prisma.JsonValue) {
  const normalizedInput = normalizeSnapshotPayloadInput(value);
  const versioned = versionedTradeShareSnapshotSchema.safeParse(normalizedInput);

  if (versioned.success) {
    return versioned.data.data satisfies TradeShareSnapshot;
  }

  const legacy = tradeShareSnapshotDataSchema.safeParse(normalizedInput);

  if (legacy.success) {
    return legacy.data satisfies TradeShareSnapshot;
  }

  throw toUnavailableShareError();
}
