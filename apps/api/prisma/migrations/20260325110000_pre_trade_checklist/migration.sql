CREATE TYPE "ChecklistEnforcementMode" AS ENUM ('soft', 'strict');

ALTER TABLE "users"
ADD COLUMN "checklist_enforcement_mode" "ChecklistEnforcementMode" NOT NULL DEFAULT 'soft';

CREATE TABLE "checklist_rules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "is_required" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "setup_id" UUID,
  "account_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "checklist_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "checklist_rules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "checklist_rules_setup_id_fkey" FOREIGN KEY ("setup_id") REFERENCES "setups"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "checklist_rules_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "checklist_rules_user_id_is_active_sort_order_idx" ON "checklist_rules" ("user_id", "is_active", "sort_order");
CREATE INDEX "checklist_rules_user_id_setup_id_account_id_is_active_idx" ON "checklist_rules" ("user_id", "setup_id", "account_id", "is_active");

CREATE TABLE "trade_checklist_responses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "trade_id" UUID NOT NULL,
  "checklist_rule_id" UUID,
  "rule_title_snapshot" TEXT NOT NULL,
  "rule_description_snapshot" TEXT,
  "is_required_snapshot" BOOLEAN NOT NULL DEFAULT false,
  "checked" BOOLEAN NOT NULL DEFAULT false,
  "note" TEXT,
  "sort_order_snapshot" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "trade_checklist_responses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "trade_checklist_responses_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trades"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "trade_checklist_responses_checklist_rule_id_fkey" FOREIGN KEY ("checklist_rule_id") REFERENCES "checklist_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "trade_checklist_responses_trade_id_sort_order_snapshot_idx" ON "trade_checklist_responses" ("trade_id", "sort_order_snapshot");
CREATE INDEX "trade_checklist_responses_checklist_rule_id_idx" ON "trade_checklist_responses" ("checklist_rule_id");
