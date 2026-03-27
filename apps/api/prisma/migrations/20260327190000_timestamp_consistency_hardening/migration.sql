ALTER TABLE "trade_shares"
ALTER COLUMN "expires_at" TYPE TIMESTAMPTZ(3) USING "expires_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "trade_screenshot_uploads"
ALTER COLUMN "expires_at" TYPE TIMESTAMPTZ(3) USING "expires_at" AT TIME ZONE 'UTC',
ALTER COLUMN "completed_at" TYPE TIMESTAMPTZ(3) USING "completed_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

ALTER TABLE "screenshot_cleanup_tasks"
ALTER COLUMN "next_attempt_at" TYPE TIMESTAMPTZ(3) USING "next_attempt_at" AT TIME ZONE 'UTC',
ALTER COLUMN "lease_expires_at" TYPE TIMESTAMPTZ(3) USING "lease_expires_at" AT TIME ZONE 'UTC',
ALTER COLUMN "last_attempt_at" TYPE TIMESTAMPTZ(3) USING "last_attempt_at" AT TIME ZONE 'UTC',
ALTER COLUMN "completed_at" TYPE TIMESTAMPTZ(3) USING "completed_at" AT TIME ZONE 'UTC',
ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';
