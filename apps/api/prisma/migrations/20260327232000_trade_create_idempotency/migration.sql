DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "trades"
    WHERE "client_request_id" IS NOT NULL
      AND "deleted_at" IS NULL
    GROUP BY "user_id", "client_request_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce active trade client_request_id uniqueness while duplicates exist.'
      USING ERRCODE = '23505',
        HINT = 'Resolve duplicate active trades that share the same user_id and client_request_id before applying this migration.';
  END IF;
END $$;

DROP INDEX IF EXISTS "trades_user_id_client_request_id_idx";

CREATE UNIQUE INDEX "trades_user_id_client_request_id_active_key"
ON "trades" ("user_id", "client_request_id")
WHERE "client_request_id" IS NOT NULL
  AND "deleted_at" IS NULL;
