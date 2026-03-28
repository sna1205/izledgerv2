ALTER TABLE "checklist_rules"
ADD COLUMN "title_normalized" TEXT;

UPDATE "checklist_rules"
SET "title_normalized" = LOWER(REGEXP_REPLACE(BTRIM("title"), '\s+', ' ', 'g'))
WHERE "title_normalized" IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "checklist_rules"
    WHERE "scope_type" = 'global'
    GROUP BY "user_id", "title_normalized"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce global checklist rule title uniqueness while duplicates exist.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "checklist_rules"
    WHERE "scope_type" = 'account'
    GROUP BY "user_id", "account_id", "title_normalized"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce account-scoped checklist rule title uniqueness while duplicates exist.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "checklist_rules"
    WHERE "scope_type" = 'setup'
    GROUP BY "user_id", "setup_id", "title_normalized"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce setup-scoped checklist rule title uniqueness while duplicates exist.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "checklist_rules"
    WHERE "scope_type" = 'account_setup'
    GROUP BY "user_id", "account_id", "setup_id", "title_normalized"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce account+setup checklist rule title uniqueness while duplicates exist.';
  END IF;
END $$;

ALTER TABLE "checklist_rules"
ALTER COLUMN "title_normalized" SET NOT NULL;

CREATE INDEX "checklist_rules_user_id_scope_type_title_normalized_idx"
ON "checklist_rules" ("user_id", "scope_type", "title_normalized");

CREATE UNIQUE INDEX "checklist_rules_user_id_title_normalized_global_key"
ON "checklist_rules" ("user_id", "title_normalized")
WHERE "scope_type" = 'global';

CREATE UNIQUE INDEX "checklist_rules_user_id_account_id_title_normalized_key"
ON "checklist_rules" ("user_id", "account_id", "title_normalized")
WHERE "scope_type" = 'account';

CREATE UNIQUE INDEX "checklist_rules_user_id_setup_id_title_normalized_key"
ON "checklist_rules" ("user_id", "setup_id", "title_normalized")
WHERE "scope_type" = 'setup';

CREATE UNIQUE INDEX "checklist_rules_user_id_account_id_setup_id_title_normalized_key"
ON "checklist_rules" ("user_id", "account_id", "setup_id", "title_normalized")
WHERE "scope_type" = 'account_setup';
