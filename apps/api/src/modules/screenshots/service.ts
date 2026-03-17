import crypto from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { createPresignedUpload, getReadUrl, objectExists } from "../../lib/storage.js";
import { AppError } from "../../utils/errors.js";
import { safeFileName } from "../../utils/strings.js";

const SCREENSHOT_UPLOAD_TOKEN_TTL_MS = 5 * 60 * 1000;

function getUploadTokenSecret() {
  return env.STORAGE_SECRET_KEY ?? env.DATABASE_URL;
}

function createUploadToken(payload: {
  userId: string;
  tradeId: string;
  storageKey: string;
  expiresAt: number;
}) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getUploadTokenSecret())
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

function verifyUploadToken(uploadToken: string, expected: {
  userId: string;
  tradeId: string;
  storageKey: string;
}) {
  const [encodedPayload, providedSignature] = uploadToken.split(".");

  if (!encodedPayload || !providedSignature) {
    throw new AppError(400, "INVALID_UPLOAD_TOKEN", "Upload token is invalid.");
  }

  const expectedSignature = crypto
    .createHmac("sha256", getUploadTokenSecret())
    .update(encodedPayload)
    .digest("base64url");

  const providedSignatureBuffer = Buffer.from(providedSignature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    providedSignatureBuffer.length !== expectedSignatureBuffer.length ||
    !crypto.timingSafeEqual(providedSignatureBuffer, expectedSignatureBuffer)
  ) {
    throw new AppError(400, "INVALID_UPLOAD_TOKEN", "Upload token is invalid.");
  }

  let payload: {
    userId: string;
    tradeId: string;
    storageKey: string;
    expiresAt: number;
  };

  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as typeof payload;
  } catch {
    throw new AppError(400, "INVALID_UPLOAD_TOKEN", "Upload token is invalid.");
  }

  if (
    payload.userId !== expected.userId ||
    payload.tradeId !== expected.tradeId ||
    payload.storageKey !== expected.storageKey ||
    payload.expiresAt < Date.now()
  ) {
    throw new AppError(400, "INVALID_UPLOAD_TOKEN", "Upload token is invalid.");
  }
}

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

export function isValidScreenshotReorder(allScreenshotIds: string[], requestedScreenshotIds: string[]) {
  if (new Set(requestedScreenshotIds).size !== requestedScreenshotIds.length) {
    return false;
  }

  if (allScreenshotIds.length !== requestedScreenshotIds.length) {
    return false;
  }

  const screenshotIdSet = new Set(allScreenshotIds);
  return requestedScreenshotIds.every((screenshotId) => screenshotIdSet.has(screenshotId));
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
    uploadToken: createUploadToken({
      userId,
      tradeId,
      storageKey,
      expiresAt: Date.now() + SCREENSHOT_UPLOAD_TOKEN_TTL_MS,
    }),
    sortOrder: input.sortOrder,
    ...upload,
  };
}

export async function completeTradeScreenshot(userId: string, tradeId: string, input: {
  storageKey: string;
  uploadToken: string;
  sortOrder: number;
}) {
  await ensureOwnedTrade(userId, tradeId);
  assertTradeStorageKey(userId, tradeId, input.storageKey);
  verifyUploadToken(input.uploadToken, {
    userId,
    tradeId,
    storageKey: input.storageKey,
  });

  const uploadedObjectExists = await objectExists(input.storageKey);

  if (!uploadedObjectExists) {
    throw new AppError(400, "SCREENSHOT_UPLOAD_MISSING", "Uploaded screenshot file was not found.");
  }

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
      trade: { userId },
    },
  });

  if (!isValidScreenshotReorder(screenshots.map((screenshot) => screenshot.id), screenshotIds)) {
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
