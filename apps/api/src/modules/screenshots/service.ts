import crypto from "node:crypto";
import { ScreenshotCleanupAction, ScreenshotCleanupReason } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { createPresignedUpload, getObjectMetadata, getReadUrl, putObject } from "../../lib/storage.js";
import { AppError } from "../../utils/errors.js";
import { safeFileName } from "../../utils/strings.js";
import { allowedScreenshotContentTypes, maxScreenshotFileSizeBytes, normalizeScreenshotContentType } from "./constants.js";
import { enqueueScreenshotCleanupTask, tryProcessScreenshotCleanupTaskNow } from "./reconciliation.js";
import { parseStoredTradeShareSnapshot } from "../trade-shares/storage.js";

const SCREENSHOT_UPLOAD_TOKEN_TTL_MS = 5 * 60 * 1000;

function getUploadTokenSecret() {
  return env.STORAGE_SECRET_KEY ?? env.DATABASE_URL;
}

type UploadTokenPayload = {
  uploadId: string;
  userId: string;
  tradeId: string;
  storageKey: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  expiresAt: number;
};

type PendingScreenshotUpload = {
  id: string;
  userId: string;
  tradeId: string;
  storageKey: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  expiresAt: Date;
  completedAt: Date | null;
};

type UploadedScreenshotObject = {
  exists: boolean;
  contentType: string | null;
  contentLength: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function snapshotContainsStorageKey(snapshot: unknown, storageKey: string) {
  if (!isRecord(snapshot) || !Array.isArray(snapshot.screenshots)) {
    return false;
  }

  return snapshot.screenshots.some((item) => {
    if (typeof item === "string") {
      return item === storageKey;
    }

    return isRecord(item) && item.storageKey === storageKey;
  });
}

async function assertScreenshotNotSnapshotLocked(userId: string, tradeId: string, storageKey: string) {
  const [shares, reviews] = await Promise.all([
    prisma.tradeShare.findMany({
      where: {
        userId,
        tradeId,
      },
      select: {
        snapshot: true,
      },
    }),
    prisma.review.findMany({
      where: {
        userId,
      },
      select: {
        tradeSnapshot: true,
      },
    }),
  ]);

  const shareSnapshotReference = shares.some((share) => {
    try {
      const snapshot = parseStoredTradeShareSnapshot(share.snapshot);
      return snapshotContainsStorageKey(snapshot, storageKey);
    } catch {
      return false;
    }
  });

  if (shareSnapshotReference) {
    throw new AppError(
      409,
      "SCREENSHOT_SNAPSHOT_LOCKED",
      "This screenshot is preserved by a shared trade snapshot. Revoke or replace that snapshot before deleting the image.",
    );
  }

  const reviewSnapshotReference = reviews.some((review) => snapshotContainsStorageKey(review.tradeSnapshot, storageKey));

  if (reviewSnapshotReference) {
    throw new AppError(
      409,
      "SCREENSHOT_SNAPSHOT_LOCKED",
      "This screenshot is preserved by a saved review snapshot. Remove the review or replace the image before deleting it.",
    );
  }
}

function createUploadToken(payload: UploadTokenPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getUploadTokenSecret())
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

function verifyUploadToken(uploadToken: string, expected: {
  uploadId?: string;
  userId: string;
  tradeId: string;
  storageKey: string;
  fileName?: string;
  contentType?: string;
  fileSize?: number;
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

  let payload: UploadTokenPayload;

  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as typeof payload;
  } catch {
    throw new AppError(400, "INVALID_UPLOAD_TOKEN", "Upload token is invalid.");
  }

  if (
    ("uploadId" in expected && expected.uploadId !== undefined && payload.uploadId !== expected.uploadId) ||
    payload.userId !== expected.userId ||
    payload.tradeId !== expected.tradeId ||
    payload.storageKey !== expected.storageKey ||
    ("fileName" in expected && expected.fileName !== undefined && payload.fileName !== expected.fileName) ||
    ("contentType" in expected && expected.contentType !== undefined && payload.contentType !== expected.contentType) ||
    ("fileSize" in expected && expected.fileSize !== undefined && payload.fileSize !== expected.fileSize) ||
    payload.expiresAt < Date.now()
  ) {
    throw new AppError(400, "INVALID_UPLOAD_TOKEN", "Upload token is invalid.");
  }

  return payload;
}

export function assertPendingScreenshotUploadIsCompletable(
  pendingUpload: PendingScreenshotUpload | null,
  tokenPayload: UploadTokenPayload,
  expected: {
    userId: string;
    tradeId: string;
    storageKey: string;
    now?: number;
  },
) {
  if (!pendingUpload) {
    throw new AppError(400, "INVALID_UPLOAD_TOKEN", "Upload token is invalid.");
  }

  if (
    pendingUpload.userId !== expected.userId ||
    pendingUpload.tradeId !== expected.tradeId ||
    pendingUpload.storageKey !== expected.storageKey ||
    pendingUpload.id !== tokenPayload.uploadId ||
    pendingUpload.fileName !== tokenPayload.fileName ||
    pendingUpload.contentType !== tokenPayload.contentType ||
    pendingUpload.fileSize !== tokenPayload.fileSize
  ) {
    throw new AppError(400, "INVALID_UPLOAD_TOKEN", "Upload token is invalid.");
  }

  const now = expected.now ?? Date.now();

  if (pendingUpload.expiresAt.getTime() < now) {
    throw new AppError(400, "INVALID_UPLOAD_TOKEN", "Upload token is invalid.");
  }

  if (pendingUpload.completedAt) {
    throw new AppError(409, "SCREENSHOT_UPLOAD_ALREADY_COMPLETED", "Screenshot upload has already been completed.");
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

async function getPendingScreenshotUploadOrThrow(uploadId: string) {
  return prisma.tradeScreenshotUpload.findUnique({
    where: {
      id: uploadId,
    },
  });
}

export function assertTradeStorageKey(userId: string, tradeId: string, storageKey: string) {
  const prefix = `users/${userId}/trades/${tradeId}/`;

  if (!storageKey.startsWith(prefix)) {
    throw new AppError(400, "INVALID_STORAGE_KEY", "Storage key does not belong to this trade.");
  }
}

export function assertUploadedScreenshotObjectMatchesToken(
  uploadedObject: UploadedScreenshotObject,
  tokenPayload: UploadTokenPayload,
) {
  if (!uploadedObject.exists) {
    throw new AppError(400, "SCREENSHOT_UPLOAD_MISSING", "Uploaded screenshot file was not found.");
  }

  const uploadedContentType = uploadedObject.contentType?.toLowerCase();
  const uploadedContentLength = uploadedObject.contentLength;

  if (uploadedContentType !== tokenPayload.contentType) {
    throw new AppError(400, "SCREENSHOT_UPLOAD_INVALID", "Uploaded screenshot content type did not match the presigned upload.");
  }

  if (uploadedContentLength == null || !Number.isInteger(uploadedContentLength) || uploadedContentLength <= 0) {
    throw new AppError(400, "SCREENSHOT_UPLOAD_INVALID", "Uploaded screenshot size is invalid.");
  }

  const contentLength = uploadedContentLength as number;

  if (contentLength > maxScreenshotFileSizeBytes || contentLength !== tokenPayload.fileSize) {
    throw new AppError(400, "SCREENSHOT_UPLOAD_INVALID", "Uploaded screenshot size did not match the presigned upload.");
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
  fileSize: number;
  sortOrder: number;
}) {
  await ensureOwnedTrade(userId, tradeId);

  const normalizedFileName = safeFileName(input.fileName);
  const uploadId = crypto.randomUUID();
  const storageKey = `users/${userId}/trades/${tradeId}/${Date.now()}-${crypto.randomUUID()}-${normalizedFileName}`;
  const upload = await createPresignedUpload({
    key: storageKey,
    contentType: input.contentType,
  });

  const expiresAt = new Date(Date.now() + SCREENSHOT_UPLOAD_TOKEN_TTL_MS);

  await prisma.tradeScreenshotUpload.create({
    data: {
      id: uploadId,
      userId,
      tradeId,
      storageKey,
      fileName: normalizedFileName,
      contentType: input.contentType,
      fileSize: input.fileSize,
      expiresAt,
    },
  });

  return {
    storageKey,
    uploadToken: createUploadToken({
      uploadId,
      userId,
      tradeId,
      storageKey,
      fileName: normalizedFileName,
      contentType: input.contentType,
      fileSize: input.fileSize,
      expiresAt: expiresAt.getTime(),
    }),
    contentType: input.contentType,
    fileSize: input.fileSize,
    maxFileSizeBytes: maxScreenshotFileSizeBytes,
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
  const tokenPayload = verifyUploadToken(input.uploadToken, {
    userId,
    tradeId,
    storageKey: input.storageKey,
  });

  const pendingUpload = await prisma.tradeScreenshotUpload.findUnique({
    where: {
      id: tokenPayload.uploadId,
    },
  });

  assertPendingScreenshotUploadIsCompletable(pendingUpload, tokenPayload, {
    userId,
    tradeId,
    storageKey: input.storageKey,
  });

  const uploadedObject = await getObjectMetadata(input.storageKey);
  assertUploadedScreenshotObjectMatchesToken(uploadedObject, tokenPayload);

  const screenshot = await prisma.$transaction(async (tx) => {
    const markedCompleted = await tx.tradeScreenshotUpload.updateMany({
      where: {
        id: tokenPayload.uploadId,
        userId,
        tradeId,
        storageKey: input.storageKey,
        completedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      data: {
        completedAt: new Date(),
      },
    });

    if (markedCompleted.count !== 1) {
      const currentUpload = await tx.tradeScreenshotUpload.findUnique({
        where: {
          id: tokenPayload.uploadId,
        },
      });

      if (currentUpload?.completedAt) {
        throw new AppError(409, "SCREENSHOT_UPLOAD_ALREADY_COMPLETED", "Screenshot upload has already been completed.");
      }

      throw new AppError(400, "INVALID_UPLOAD_TOKEN", "Upload token is invalid.");
    }

    return tx.tradeScreenshot.create({
      data: {
        userId,
        tradeId,
        storageKey: input.storageKey,
        sortOrder: input.sortOrder,
      },
    });
  });

  return {
    id: screenshot.id,
    storageKey: screenshot.storageKey,
    sortOrder: screenshot.sortOrder,
    createdAt: screenshot.createdAt.toISOString(),
    url: await getReadUrl(screenshot.storageKey),
  };
}

export async function uploadTradeScreenshot(userId: string, tradeId: string, input: {
  storageKey: string;
  uploadToken: string;
  contentType: string;
  sortOrder: number;
  file: Uint8Array;
}) {
  await ensureOwnedTrade(userId, tradeId);
  assertTradeStorageKey(userId, tradeId, input.storageKey);

  const normalizedContentType = normalizeScreenshotContentType(input.contentType);

  if (!allowedScreenshotContentTypes.includes(normalizedContentType as (typeof allowedScreenshotContentTypes)[number])) {
    throw new AppError(400, "INVALID_FILE_TYPE", "Use a PNG, JPEG, or WebP image.");
  }

  if (input.file.byteLength <= 0) {
    throw new AppError(400, "SCREENSHOT_UPLOAD_INVALID", "Uploaded screenshot size is invalid.");
  }

  if (input.file.byteLength > maxScreenshotFileSizeBytes) {
    throw new AppError(400, "FILE_TOO_LARGE", "Screenshots must be 10 MB or smaller.");
  }

  const tokenPayload = verifyUploadToken(input.uploadToken, {
    userId,
    tradeId,
    storageKey: input.storageKey,
    contentType: normalizedContentType,
    fileSize: input.file.byteLength,
  });

  const pendingUpload = await getPendingScreenshotUploadOrThrow(tokenPayload.uploadId);

  assertPendingScreenshotUploadIsCompletable(pendingUpload, tokenPayload, {
    userId,
    tradeId,
    storageKey: input.storageKey,
  });

  await putObject({
    key: input.storageKey,
    contentType: normalizedContentType,
    body: input.file,
  });

  return completeTradeScreenshot(userId, tradeId, {
    storageKey: input.storageKey,
    uploadToken: input.uploadToken,
    sortOrder: input.sortOrder,
  });
}

export async function deleteTradeScreenshot(userId: string, tradeId: string, screenshotId: string) {
  await ensureOwnedTrade(userId, tradeId);

  const screenshot = await prisma.tradeScreenshot.findFirst({
    where: {
      id: screenshotId,
      userId,
      tradeId,
    },
  });

  if (!screenshot) {
    throw new AppError(404, "SCREENSHOT_NOT_FOUND", "Screenshot not found.");
  }

  await assertScreenshotNotSnapshotLocked(userId, tradeId, screenshot.storageKey);

  const cleanupTask = await prisma.$transaction(async (tx) => {
    await tx.tradeScreenshot.delete({
      where: { id: screenshot.id },
    });

    return enqueueScreenshotCleanupTask(tx, {
      action: ScreenshotCleanupAction.deleteObject,
      reason: ScreenshotCleanupReason.screenshotDelete,
      storageKey: screenshot.storageKey,
      screenshotId: screenshot.id,
      userId,
      tradeId,
    });
  });

  await tryProcessScreenshotCleanupTaskNow(cleanupTask.id).catch(() => {
    // Keep the user-facing delete successful even if storage cleanup has to retry later.
  });
}

export async function reorderTradeScreenshots(userId: string, tradeId: string, screenshotIds: string[]) {
  await ensureOwnedTrade(userId, tradeId);

  const screenshots = await prisma.tradeScreenshot.findMany({
    where: {
      userId,
      tradeId,
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
