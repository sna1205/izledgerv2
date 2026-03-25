CREATE TYPE "ScreenshotCleanupAction" AS ENUM (
  'deleteObject',
  'deleteExpiredUploadRecord',
  'deleteDanglingScreenshotRecord'
);

CREATE TYPE "ScreenshotCleanupReason" AS ENUM (
  'screenshotDelete',
  'expiredUpload',
  'orphanObject',
  'danglingReference'
);

CREATE TABLE "screenshot_cleanup_tasks" (
  "id" UUID NOT NULL,
  "dedupe_key" TEXT NOT NULL,
  "action" "ScreenshotCleanupAction" NOT NULL,
  "reason" "ScreenshotCleanupReason" NOT NULL,
  "storage_key" TEXT,
  "screenshot_id" UUID,
  "upload_id" UUID,
  "user_id" UUID,
  "trade_id" UUID,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lease_expires_at" TIMESTAMP(3),
  "last_error" TEXT,
  "last_attempt_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "screenshot_cleanup_tasks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "screenshot_cleanup_tasks_dedupe_key_key"
ON "screenshot_cleanup_tasks" ("dedupe_key");

CREATE INDEX "screenshot_cleanup_tasks_completed_at_next_attempt_at_idx"
ON "screenshot_cleanup_tasks" ("completed_at", "next_attempt_at");

CREATE INDEX "screenshot_cleanup_tasks_action_completed_at_next_attempt_a_idx"
ON "screenshot_cleanup_tasks" ("action", "completed_at", "next_attempt_at");

CREATE INDEX "screenshot_cleanup_tasks_storage_key_idx"
ON "screenshot_cleanup_tasks" ("storage_key");
