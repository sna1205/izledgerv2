import {
  Prisma,
  PrismaClient,
  ScreenshotCleanupAction,
  ScreenshotCleanupReason,
} from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import {
  deleteObjectIfPresent,
  isStorageEnabled,
  listObjectKeys,
  objectExists,
} from "../../lib/storage.js";

const DEFAULT_BATCH_SIZE = 100;
const TASK_LEASE_MS = 5 * 60 * 1000;
const MAX_RETRY_DELAY_MS = 6 * 60 * 60 * 1000;

type DbClient = PrismaClient | Prisma.TransactionClient;

type CleanupTaskRecord = {
  id: string;
  dedupeKey: string;
  action: ScreenshotCleanupAction;
  reason: ScreenshotCleanupReason;
  storageKey: string | null;
  screenshotId: string | null;
  uploadId: string | null;
  userId: string | null;
  tradeId: string | null;
  attemptCount: number;
  nextAttemptAt: Date;
  leaseExpiresAt: Date | null;
  lastError: string | null;
  lastAttemptAt: Date | null;
  completedAt: Date | null;
};

type CleanupDeps = {
  deleteObjectIfPresent: typeof deleteObjectIfPresent;
  isStorageEnabled: typeof isStorageEnabled;
  objectExists: typeof objectExists;
  listObjectKeys: typeof listObjectKeys;
};

const defaultDeps: CleanupDeps = {
  deleteObjectIfPresent,
  isStorageEnabled,
  objectExists,
  listObjectKeys,
};

function getRetryDelayMs(attemptCount: number) {
  return Math.min(30_000 * 2 ** Math.max(0, attemptCount), MAX_RETRY_DELAY_MS);
}

function toTaskErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function buildDedupeKey(input: {
  action: ScreenshotCleanupAction;
  storageKey?: string | null;
  screenshotId?: string | null;
  uploadId?: string | null;
}) {
  if (input.action === ScreenshotCleanupAction.deleteObject) {
    return `delete-object:${input.storageKey ?? ""}`;
  }

  if (input.action === ScreenshotCleanupAction.deleteExpiredUploadRecord) {
    return `delete-expired-upload:${input.uploadId ?? ""}`;
  }

  return `delete-dangling-screenshot:${input.screenshotId ?? ""}`;
}

export async function enqueueScreenshotCleanupTask(
  db: DbClient,
  input: {
    action: ScreenshotCleanupAction;
    reason: ScreenshotCleanupReason;
    storageKey?: string | null;
    screenshotId?: string | null;
    uploadId?: string | null;
    userId?: string | null;
    tradeId?: string | null;
  },
) {
  const dedupeKey = buildDedupeKey(input);

  return db.screenshotCleanupTask.upsert({
    where: {
      dedupeKey,
    },
    create: {
      dedupeKey,
      action: input.action,
      reason: input.reason,
      storageKey: input.storageKey ?? null,
      screenshotId: input.screenshotId ?? null,
      uploadId: input.uploadId ?? null,
      userId: input.userId ?? null,
      tradeId: input.tradeId ?? null,
    },
    update: {
      reason: input.reason,
      storageKey: input.storageKey ?? null,
      screenshotId: input.screenshotId ?? null,
      uploadId: input.uploadId ?? null,
      userId: input.userId ?? null,
      tradeId: input.tradeId ?? null,
      nextAttemptAt: new Date(),
      leaseExpiresAt: null,
      lastError: null,
      completedAt: null,
    },
  });
}

async function claimCleanupTask(taskId: string, db: PrismaClient = prisma) {
  const now = new Date();
  const leaseExpiresAt = new Date(now.getTime() + TASK_LEASE_MS);

  const claimed = await db.screenshotCleanupTask.updateMany({
    where: {
      id: taskId,
      completedAt: null,
      nextAttemptAt: {
        lte: now,
      },
      OR: [
        { leaseExpiresAt: null },
        { leaseExpiresAt: { lte: now } },
      ],
    },
    data: {
      leaseExpiresAt,
    },
  });

  if (claimed.count !== 1) {
    return null;
  }

  return db.screenshotCleanupTask.findUnique({
    where: { id: taskId },
  });
}

async function markCleanupTaskCompleted(taskId: string, attemptCount: number, db: PrismaClient = prisma) {
  await db.screenshotCleanupTask.update({
    where: { id: taskId },
    data: {
      attemptCount,
      lastAttemptAt: new Date(),
      leaseExpiresAt: null,
      lastError: null,
      completedAt: new Date(),
    },
  });
}

async function markCleanupTaskRetry(taskId: string, attemptCount: number, error: unknown, db: PrismaClient = prisma) {
  await db.screenshotCleanupTask.update({
    where: { id: taskId },
    data: {
      attemptCount,
      lastAttemptAt: new Date(),
      leaseExpiresAt: null,
      lastError: toTaskErrorMessage(error),
      nextAttemptAt: new Date(Date.now() + getRetryDelayMs(attemptCount)),
    },
  });
}

async function processCleanupTask(task: CleanupTaskRecord, deps: CleanupDeps, db: PrismaClient = prisma) {
  if (task.action === ScreenshotCleanupAction.deleteObject) {
    if (!task.storageKey) {
      return;
    }

    if (!deps.isStorageEnabled()) {
      throw new Error("Storage is disabled.");
    }

    await deps.deleteObjectIfPresent(task.storageKey);
    return;
  }

  if (task.action === ScreenshotCleanupAction.deleteExpiredUploadRecord) {
    if (!task.uploadId) {
      return;
    }

    await db.tradeScreenshotUpload.deleteMany({
      where: {
        id: task.uploadId,
        completedAt: null,
      },
    });
    return;
  }

  if (!task.screenshotId) {
    return;
  }

  const screenshot = await db.tradeScreenshot.findUnique({
    where: {
      id: task.screenshotId,
    },
  });

  if (!screenshot) {
    return;
  }

  if (task.storageKey && deps.isStorageEnabled()) {
    const exists = await deps.objectExists(task.storageKey);

    if (exists) {
      return;
    }
  }

  await db.tradeScreenshot.delete({
    where: {
      id: task.screenshotId,
    },
  });
}

async function processClaimedCleanupTask(task: CleanupTaskRecord, deps: CleanupDeps) {
  const nextAttemptCount = task.attemptCount + 1;

  try {
    await processCleanupTask(task, deps);
    await markCleanupTaskCompleted(task.id, nextAttemptCount);
    return "completed" as const;
  } catch (error) {
    await markCleanupTaskRetry(task.id, nextAttemptCount, error);
    return "retried" as const;
  }
}

export async function processDueScreenshotCleanupTasks(options?: {
  limit?: number;
  deps?: Partial<CleanupDeps>;
}) {
  const deps = {
    ...defaultDeps,
    ...options?.deps,
  } satisfies CleanupDeps;
  const limit = options?.limit ?? DEFAULT_BATCH_SIZE;
  const now = new Date();
  const candidates = await prisma.screenshotCleanupTask.findMany({
    where: {
      completedAt: null,
      nextAttemptAt: {
        lte: now,
      },
      OR: [
        { leaseExpiresAt: null },
        { leaseExpiresAt: { lte: now } },
      ],
    },
    orderBy: [
      { nextAttemptAt: "asc" },
      { createdAt: "asc" },
    ],
    take: limit,
  });

  let completed = 0;
  let retried = 0;
  let skipped = 0;

  for (const candidate of candidates) {
    const task = await claimCleanupTask(candidate.id);

    if (!task) {
      skipped += 1;
      continue;
    }

    const outcome = await processClaimedCleanupTask(task, deps);

    if (outcome === "completed") {
      completed += 1;
    } else {
      retried += 1;
    }
  }

  return {
    processed: candidates.length,
    completed,
    retried,
    skipped,
  };
}

export async function tryProcessScreenshotCleanupTaskNow(taskId: string, options?: {
  deps?: Partial<CleanupDeps>;
}) {
  const deps = {
    ...defaultDeps,
    ...options?.deps,
  } satisfies CleanupDeps;
  const task = await claimCleanupTask(taskId);

  if (!task) {
    return {
      taskId,
      processed: 0,
      completed: 0,
      retried: 0,
      skipped: 1,
    };
  }

  const outcome = await processClaimedCleanupTask(task, deps);

  return {
    taskId,
    processed: 1,
    completed: outcome === "completed" ? 1 : 0,
    retried: outcome === "retried" ? 1 : 0,
    skipped: 0,
  };
}

export async function queueExpiredScreenshotUploadCleanup(options?: { limit?: number }) {
  const limit = options?.limit ?? DEFAULT_BATCH_SIZE;
  const now = new Date();
  const staleUploads = await prisma.tradeScreenshotUpload.findMany({
    where: {
      completedAt: null,
      expiresAt: {
        lt: now,
      },
    },
    orderBy: {
      expiresAt: "asc",
    },
    take: limit,
  });

  for (const upload of staleUploads) {
    await enqueueScreenshotCleanupTask(prisma, {
      action: ScreenshotCleanupAction.deleteObject,
      reason: ScreenshotCleanupReason.expiredUpload,
      storageKey: upload.storageKey,
      uploadId: upload.id,
      userId: upload.userId,
      tradeId: upload.tradeId,
    });
    await enqueueScreenshotCleanupTask(prisma, {
      action: ScreenshotCleanupAction.deleteExpiredUploadRecord,
      reason: ScreenshotCleanupReason.expiredUpload,
      storageKey: upload.storageKey,
      uploadId: upload.id,
      userId: upload.userId,
      tradeId: upload.tradeId,
    });
  }

  return {
    staleUploadsFound: staleUploads.length,
  };
}

export async function reconcileScreenshotStorage(options?: {
  objectPrefix?: string;
  limit?: number;
  deps?: Partial<CleanupDeps>;
}) {
  const deps = {
    ...defaultDeps,
    ...options?.deps,
  } satisfies CleanupDeps;
  const limit = options?.limit ?? DEFAULT_BATCH_SIZE;
  const objectPrefix = options?.objectPrefix ?? "users/";
  const expiredUploadResult = await queueExpiredScreenshotUploadCleanup({ limit });

  let orphanedObjectsQueued = 0;
  let danglingScreenshotRowsQueued = 0;
  let storageScanSkipped = false;
  let scannedObjectCount = 0;

  if (!deps.isStorageEnabled()) {
    storageScanSkipped = true;
  } else {
    const [referencedScreenshots, pendingUploads] = await Promise.all([
      prisma.tradeScreenshot.findMany({
        select: {
          id: true,
          userId: true,
          tradeId: true,
          storageKey: true,
        },
      }),
      prisma.tradeScreenshotUpload.findMany({
        where: {
          completedAt: null,
        },
        select: {
          id: true,
          userId: true,
          tradeId: true,
          storageKey: true,
        },
      }),
    ]);

    for (const screenshot of referencedScreenshots.slice(0, limit)) {
      const exists = await deps.objectExists(screenshot.storageKey);

      if (!exists) {
        await enqueueScreenshotCleanupTask(prisma, {
          action: ScreenshotCleanupAction.deleteDanglingScreenshotRecord,
          reason: ScreenshotCleanupReason.danglingReference,
          storageKey: screenshot.storageKey,
          screenshotId: screenshot.id,
          userId: screenshot.userId,
          tradeId: screenshot.tradeId,
        });
        danglingScreenshotRowsQueued += 1;
      }
    }

    const referencedKeys = new Set([
      ...referencedScreenshots.map((item) => item.storageKey),
      ...pendingUploads.map((item) => item.storageKey),
    ]);

    let continuationToken: string | undefined;

    while (scannedObjectCount < limit) {
      const pageSize = Math.min(1000, limit - scannedObjectCount);
      const page = await deps.listObjectKeys({
        prefix: objectPrefix,
        continuationToken,
        maxKeys: pageSize,
      });

      scannedObjectCount += page.keys.length;

      for (const key of page.keys) {
        if (referencedKeys.has(key)) {
          continue;
        }

        await enqueueScreenshotCleanupTask(prisma, {
          action: ScreenshotCleanupAction.deleteObject,
          reason: ScreenshotCleanupReason.orphanObject,
          storageKey: key,
        });
        orphanedObjectsQueued += 1;
      }

      if (!page.nextContinuationToken || page.keys.length === 0) {
        break;
      }

      continuationToken = page.nextContinuationToken;
    }
  }

  const processingResult = await processDueScreenshotCleanupTasks({
    limit,
    deps,
  });

  return {
    expiredUploadResult,
    orphanedObjectsQueued,
    danglingScreenshotRowsQueued,
    scannedObjectCount,
    storageScanSkipped,
    processingResult,
  };
}
