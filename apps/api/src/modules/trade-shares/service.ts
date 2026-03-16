import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { env } from "../../config/env.js";
import { toNumber } from "../../lib/decimal.js";
import { prisma } from "../../lib/prisma.js";
import { getReadUrl } from "../../lib/storage.js";
import { AppError } from "../../utils/errors.js";
import { sessionFromDb } from "../../utils/domain-mappers.js";
import { tradeShareSettingsSchema, type TradeShareSettingsInput } from "./schemas.js";

const ownedTradeInclude = Prisma.validator<Prisma.TradeInclude>()({
  account: true,
  screenshots: {
    orderBy: {
      sortOrder: "asc",
    },
  },
});

const tradeShareSnapshotSchema = z.object({
  tradeId: z.string().uuid(),
  pair: z.string(),
  direction: z.enum(["Buy", "Sell"]),
  result: z.enum(["Win", "Loss"]),
  date: z.string(),
  entry: z.number(),
  stopLoss: z.number(),
  takeProfit: z.number(),
  pnl: z.number(),
  rr: z.number().nullable(),
  setup: z.string().nullable(),
  session: z.enum(["Asia", "London", "New York"]).nullable(),
  emotion: z.enum(["Calm", "Focused", "Confident", "Anxious", "Frustrated"]).nullable(),
  notes: z.string().nullable(),
  accountName: z.string().nullable(),
  screenshots: z.array(
    z.object({
      storageKey: z.string(),
      sortOrder: z.number().int().nonnegative(),
    }),
  ),
});

type StoredTradeShareSettings = z.infer<typeof tradeShareSettingsSchema>;
type TradeShareSnapshot = z.infer<typeof tradeShareSnapshotSchema>;

function generateTradeShareId() {
  return crypto.randomBytes(24).toString("base64url");
}

function buildTradeShareUrl(shareId: string) {
  return `${env.FRONTEND_ORIGIN.replace(/\/$/, "")}/shared/trade/${shareId}`;
}

function getRiskReward(entry: number, stopLoss: number, takeProfit: number) {
  const risk = Math.abs(entry - stopLoss);
  const reward = Math.abs(takeProfit - entry);
  return risk > 0 ? Number((reward / risk).toFixed(4)) : null;
}

function isTradeShareExpired(share: { expiresAt: Date | null }) {
  return Boolean(share.expiresAt && share.expiresAt.getTime() <= Date.now());
}

function assertValidExpiration(expiresAt?: string | null) {
  if (!expiresAt) {
    return null;
  }

  const parsed = new Date(expiresAt);

  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(400, "INVALID_SHARE_EXPIRATION", "Share expiration is invalid.");
  }

  if (parsed.getTime() <= Date.now()) {
    throw new AppError(400, "INVALID_SHARE_EXPIRATION", "Share expiration must be in the future.");
  }

  return parsed;
}

function isOwnedScreenshotStorageKey(userId: string, tradeId: string, storageKey: string) {
  return storageKey.startsWith(`users/${userId}/trades/${tradeId}/`);
}

function parseShareSettings(value: Prisma.JsonValue) {
  return tradeShareSettingsSchema.parse(value) satisfies StoredTradeShareSettings;
}

function parseTradeSnapshot(value: Prisma.JsonValue) {
  return tradeShareSnapshotSchema.parse(value) satisfies TradeShareSnapshot;
}

async function getOwnedTradeForShare(userId: string, tradeId: string) {
  const trade = await prisma.trade.findFirst({
    where: {
      id: tradeId,
      userId,
      deletedAt: null,
    },
    include: ownedTradeInclude,
  });

  if (!trade) {
    throw new AppError(404, "TRADE_NOT_FOUND", "Trade not found.");
  }

  return trade;
}

async function buildTradeShareSnapshot(userId: string, tradeId: string) {
  const trade = await getOwnedTradeForShare(userId, tradeId);

  return {
    tradeId: trade.id,
    pair: trade.pair,
    direction: trade.direction,
    result: trade.result,
    date: trade.tradeDate.toISOString().slice(0, 10),
    entry: toNumber(trade.entry),
    stopLoss: toNumber(trade.stopLoss),
    takeProfit: toNumber(trade.takeProfit),
    pnl: toNumber(trade.profit),
    rr: getRiskReward(toNumber(trade.entry), toNumber(trade.stopLoss), toNumber(trade.takeProfit)),
    setup: trade.setupNameSnapshot ?? null,
    session: (sessionFromDb(trade.session) as TradeShareSnapshot["session"]) ?? null,
    emotion: trade.emotion,
    notes: trade.notes || null,
    accountName: trade.account.name,
    screenshots: trade.screenshots
      .filter((screenshot) => isOwnedScreenshotStorageKey(userId, trade.id, screenshot.storageKey))
      .map((screenshot) => ({
        storageKey: screenshot.storageKey,
        sortOrder: screenshot.sortOrder,
      })),
  } satisfies TradeShareSnapshot;
}

function getTradeShareStatus(share: {
  isActive: boolean;
  expiresAt: Date | null;
}) {
  if (!share.isActive) {
    return "revoked" as const;
  }

  if (isTradeShareExpired(share)) {
    return "expired" as const;
  }

  return "active" as const;
}

function toOwnerTradeShareDto(share: {
  id: string;
  shareId: string;
  isActive: boolean;
  viewCount: number;
  expiresAt: Date | null;
  shareSettings: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}) {
  const status = getTradeShareStatus(share);
  const settings = parseShareSettings(share.shareSettings);

  return {
    id: share.id,
    shareId: share.shareId,
    status,
    isActive: status === "active",
    viewCount: share.viewCount,
    expiresAt: share.expiresAt?.toISOString() ?? null,
    settings,
    publicUrl: status === "active" ? buildTradeShareUrl(share.shareId) : null,
    createdAt: share.createdAt.toISOString(),
    updatedAt: share.updatedAt.toISOString(),
  };
}

async function getPublicScreenshotUrls(userId: string, snapshot: TradeShareSnapshot) {
  const urls = await Promise.all(
    snapshot.screenshots
      .filter((screenshot) => isOwnedScreenshotStorageKey(userId, snapshot.tradeId, screenshot.storageKey))
      .map(async (screenshot) => getReadUrl(screenshot.storageKey)),
  );

  return urls.filter(Boolean);
}

export async function createOrUpdateTradeShare(userId: string, tradeId: string, input: {
  settings: TradeShareSettingsInput;
  expiresAt?: string | null;
}) {
  const expiresAt = assertValidExpiration(input.expiresAt);
  const snapshot = await buildTradeShareSnapshot(userId, tradeId);
  const existing = await prisma.tradeShare.findUnique({
    where: {
      tradeId_userId: {
        tradeId,
        userId,
      },
    },
  });

  const shouldRotateShareId = !existing || !existing.isActive || isTradeShareExpired(existing);
  const nextShareId = shouldRotateShareId ? generateTradeShareId() : existing.shareId;

  const share = existing
    ? await prisma.tradeShare.update({
        where: { id: existing.id },
        data: {
          shareId: nextShareId,
          isActive: true,
          viewCount: shouldRotateShareId ? 0 : undefined,
          expiresAt,
          shareSettings: input.settings,
          snapshot,
        },
      })
    : await prisma.tradeShare.create({
        data: {
          tradeId,
          userId,
          shareId: nextShareId,
          isActive: true,
          viewCount: 0,
          expiresAt,
          shareSettings: input.settings,
          snapshot,
        },
      });

  return toOwnerTradeShareDto(share);
}

export async function listTradeShares(userId: string, tradeId: string) {
  await getOwnedTradeForShare(userId, tradeId);

  const share = await prisma.tradeShare.findUnique({
    where: {
      tradeId_userId: {
        tradeId,
        userId,
      },
    },
  });

  return share ? [toOwnerTradeShareDto(share)] : [];
}

export async function revokeTradeShare(userId: string, shareId: string) {
  const share = await prisma.tradeShare.findFirst({
    where: {
      shareId,
      userId,
    },
  });

  if (!share) {
    throw new AppError(404, "TRADE_SHARE_NOT_FOUND", "Shared trade link not found.");
  }

  const revokedShare = await prisma.tradeShare.update({
    where: { id: share.id },
    data: {
      isActive: false,
    },
  });

  return toOwnerTradeShareDto(revokedShare);
}

export async function getPublicTradeShare(shareId: string) {
  const share = await prisma.tradeShare.findUnique({
    where: {
      shareId,
    },
  });

  if (!share) {
    throw new AppError(404, "TRADE_SHARE_UNAVAILABLE", "Shared trade link is unavailable.");
  }

  if (!share.isActive || isTradeShareExpired(share)) {
    throw new AppError(404, "TRADE_SHARE_UNAVAILABLE", "Shared trade link is unavailable.");
  }

  const settings = parseShareSettings(share.shareSettings);
  const snapshot = parseTradeSnapshot(share.snapshot);

  await prisma.tradeShare.update({
    where: { id: share.id },
    data: {
      viewCount: {
        increment: 1,
      },
    },
  });

  const screenshots = settings.showScreenshots ? await getPublicScreenshotUrls(share.userId, snapshot) : [];

  return {
    trade: {
      pair: snapshot.pair,
      direction: snapshot.direction,
      result: snapshot.result,
      date: snapshot.date,
      rr: snapshot.rr,
      pnl: settings.showPnl ? snapshot.pnl : null,
      accountName: settings.showAccountName ? snapshot.accountName : null,
      entry: settings.showExactPrices ? snapshot.entry : null,
      stopLoss: settings.showExactPrices ? snapshot.stopLoss : null,
      takeProfit: settings.showExactPrices ? snapshot.takeProfit : null,
      setup: snapshot.setup,
      session: snapshot.session,
      emotion: snapshot.emotion,
      notes: settings.showNotes ? snapshot.notes : null,
      screenshots,
    },
  };
}
