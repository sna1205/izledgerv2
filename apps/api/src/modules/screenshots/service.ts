import crypto from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { createPresignedUpload, getReadUrl } from "../../lib/storage.js";
import { AppError } from "../../utils/errors.js";
import { safeFileName } from "../../utils/strings.js";

async function ensureOwnedTrade(userId: string, tradeId: string) {
  const trade = await prisma.trade.findFirst({
    where: {
      id: tradeId,
      userId,
      deletedAt: null,
    },
  });

  if (!trade) {
    throw new AppError(404, "TRADE_NOT_FOUND", "Trade not found.");
  }

  return trade;
}

function assertTradeStorageKey(userId: string, tradeId: string, storageKey: string) {
  const prefix = `users/${userId}/trades/${tradeId}/`;

  if (!storageKey.startsWith(prefix)) {
    throw new AppError(400, "INVALID_STORAGE_KEY", "Storage key does not belong to this trade.");
  }
}

export async function presignTradeScreenshot(userId: string, tradeId: string, input: {
  fileName: string;
  contentType: string;
  sortOrder: number;
}) {
  await ensureOwnedTrade(userId, tradeId);

  const storageKey = `users/${userId}/trades/${tradeId}/${Date.now()}-${crypto.randomUUID()}-${safeFileName(input.fileName)}`;
  const upload = await createPresignedUpload({
    key: storageKey,
    contentType: input.contentType,
  });

  return {
    storageKey,
    sortOrder: input.sortOrder,
    ...upload,
  };
}

export async function completeTradeScreenshot(userId: string, tradeId: string, input: {
  storageKey: string;
  sortOrder: number;
}) {
  await ensureOwnedTrade(userId, tradeId);
  assertTradeStorageKey(userId, tradeId, input.storageKey);

  const existing = await prisma.tradeScreenshot.findFirst({
    where: {
      tradeId,
      storageKey: input.storageKey,
    },
  });

  const screenshot = existing
    ? await prisma.tradeScreenshot.update({
        where: { id: existing.id },
        data: { sortOrder: input.sortOrder },
      })
    : await prisma.tradeScreenshot.create({
        data: {
          tradeId,
          storageKey: input.storageKey,
          sortOrder: input.sortOrder,
        },
      });

  return {
    id: screenshot.id,
    storageKey: screenshot.storageKey,
    sortOrder: screenshot.sortOrder,
    createdAt: screenshot.createdAt.toISOString(),
    url: await getReadUrl(screenshot.storageKey),
  };
}

export async function deleteTradeScreenshot(userId: string, tradeId: string, screenshotId: string) {
  await ensureOwnedTrade(userId, tradeId);

  const screenshot = await prisma.tradeScreenshot.findFirst({
    where: {
      id: screenshotId,
      tradeId,
      trade: {
        userId,
      },
    },
  });

  if (!screenshot) {
    throw new AppError(404, "SCREENSHOT_NOT_FOUND", "Screenshot not found.");
  }

  await prisma.tradeScreenshot.delete({
    where: { id: screenshot.id },
  });
}

export async function reorderTradeScreenshots(userId: string, tradeId: string, screenshotIds: string[]) {
  await ensureOwnedTrade(userId, tradeId);

  const screenshots = await prisma.tradeScreenshot.findMany({
    where: {
      tradeId,
      id: { in: screenshotIds },
      trade: { userId },
    },
  });

  if (screenshots.length !== screenshotIds.length) {
    throw new AppError(400, "SCREENSHOT_REORDER_INVALID", "Screenshot reorder payload is invalid.");
  }

  await prisma.$transaction(
    screenshotIds.map((screenshotId, index) =>
      prisma.tradeScreenshot.update({
        where: { id: screenshotId },
        data: { sortOrder: index },
      }),
    ),
  );

  const reordered = await prisma.tradeScreenshot.findMany({
    where: { tradeId },
    orderBy: { sortOrder: "asc" },
  });

  return Promise.all(
    reordered.map(async (screenshot) => ({
      id: screenshot.id,
      storageKey: screenshot.storageKey,
      sortOrder: screenshot.sortOrder,
      createdAt: screenshot.createdAt.toISOString(),
      url: await getReadUrl(screenshot.storageKey),
    })),
  );
}
