DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'ChecklistRuleScopeType'
  ) THEN
    CREATE TYPE "ChecklistRuleScopeType" AS ENUM ('global', 'account', 'setup', 'account_setup');
  END IF;
END $$;

ALTER TABLE "checklist_rules"
ADD COLUMN "scope_type" "ChecklistRuleScopeType";

UPDATE "checklist_rules"
SET "scope_type" = CASE
  WHEN "setup_id" IS NOT NULL AND "account_id" IS NOT NULL THEN 'account_setup'::"ChecklistRuleScopeType"
  WHEN "setup_id" IS NOT NULL THEN 'setup'::"ChecklistRuleScopeType"
  WHEN "account_id" IS NOT NULL THEN 'account'::"ChecklistRuleScopeType"
  ELSE 'global'::"ChecklistRuleScopeType"
END
WHERE "scope_type" IS NULL;

ALTER TABLE "checklist_rules"
ALTER COLUMN "scope_type" SET NOT NULL;

ALTER TABLE "checklist_rules"
ADD CONSTRAINT "checklist_rules_scope_type_consistency_chk"
CHECK (
  ("scope_type" = 'global' AND "setup_id" IS NULL AND "account_id" IS NULL)
  OR ("scope_type" = 'account' AND "setup_id" IS NULL AND "account_id" IS NOT NULL)
  OR ("scope_type" = 'setup' AND "setup_id" IS NOT NULL AND "account_id" IS NULL)
  OR ("scope_type" = 'account_setup' AND "setup_id" IS NOT NULL AND "account_id" IS NOT NULL)
) NOT VALID;

ALTER TABLE "checklist_rules"
VALIDATE CONSTRAINT "checklist_rules_scope_type_consistency_chk";

CREATE INDEX IF NOT EXISTS "checklist_rules_user_id_scope_type_is_active_sort_order_idx"
ON "checklist_rules" ("user_id", "scope_type", "is_active", "sort_order");

ALTER TABLE "checklist_rules"
DROP CONSTRAINT IF EXISTS "checklist_rules_setup_id_fkey";

ALTER TABLE "checklist_rules"
DROP CONSTRAINT IF EXISTS "checklist_rules_account_id_fkey";

ALTER TABLE "checklist_rules"
ADD CONSTRAINT "checklist_rules_setup_id_fkey"
FOREIGN KEY ("setup_id") REFERENCES "setups"("id")
ON DELETE NO ACTION
ON UPDATE CASCADE;

ALTER TABLE "checklist_rules"
ADD CONSTRAINT "checklist_rules_account_id_fkey"
FOREIGN KEY ("account_id") REFERENCES "accounts"("id")
ON DELETE NO ACTION
ON UPDATE CASCADE;
