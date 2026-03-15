CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "AccountType" AS ENUM ('Personal', 'Funded', 'Challenge', 'Demo', 'Crypto');
CREATE TYPE "TradeDirection" AS ENUM ('Buy', 'Sell');
CREATE TYPE "TradeResult" AS ENUM ('Win', 'Loss');
CREATE TYPE "TradeSession" AS ENUM ('Asia', 'London', 'New_York');
CREATE TYPE "TradeEmotion" AS ENUM ('Calm', 'Focused', 'Confident', 'Anxious', 'Frustrated');
CREATE TYPE "ReviewType" AS ENUM ('daily', 'weekly', 'trade');
CREATE TYPE "ReviewRuleStatus" AS ENUM ('Yes', 'Partially', 'No');
CREATE TYPE "ReviewRiskStatus" AS ENUM ('Yes', 'Partially', 'No');
CREATE TYPE "ReviewEmotion" AS ENUM ('Calm', 'Confident', 'Hesitant', 'FOMO', 'Revenge', 'Frustrated');

CREATE TABLE "users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "username" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_username_key" ON "users" ("username");

CREATE TABLE "sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "token_hash" TEXT NOT NULL,
  "user_agent" TEXT,
  "ip_address" TEXT,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "revoked_at" TIMESTAMPTZ,
  "last_accessed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions" ("token_hash");
CREATE INDEX "sessions_user_id_idx" ON "sessions" ("user_id");
CREATE INDEX "sessions_expires_at_idx" ON "sessions" ("expires_at");

CREATE TABLE "accounts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "broker" TEXT NOT NULL,
  "type" "AccountType" NOT NULL,
  "balance" DECIMAL(18, 2) NOT NULL,
  "currency" TEXT NOT NULL,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "accounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "accounts_user_id_idx" ON "accounts" ("user_id");

CREATE TABLE "setups" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "color" TEXT NOT NULL,
  "is_archived" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "setups_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "setups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "setups_user_id_name_idx" ON "setups" ("user_id", "name");

CREATE TABLE "trades" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "setup_id" UUID,
  "setup_name_snapshot" TEXT,
  "trade_date" DATE NOT NULL,
  "pair" TEXT NOT NULL,
  "direction" "TradeDirection" NOT NULL,
  "entry" DECIMAL(18, 8) NOT NULL,
  "stop_loss" DECIMAL(18, 8) NOT NULL,
  "take_profit" DECIMAL(18, 8) NOT NULL,
  "profit" DECIMAL(18, 2) NOT NULL,
  "result" "TradeResult" NOT NULL,
  "session" "TradeSession",
  "emotion" "TradeEmotion",
  "notes" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMPTZ,
  CONSTRAINT "trades_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "trades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "trades_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "trades_setup_id_fkey" FOREIGN KEY ("setup_id") REFERENCES "setups"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "trades_user_id_trade_date_desc_idx" ON "trades" ("user_id", "trade_date" DESC);
CREATE INDEX "trades_account_id_trade_date_desc_idx" ON "trades" ("account_id", "trade_date" DESC);
CREATE INDEX "trades_user_id_session_idx" ON "trades" ("user_id", "session");
CREATE INDEX "trades_user_id_emotion_idx" ON "trades" ("user_id", "emotion");
CREATE INDEX "trades_user_id_result_idx" ON "trades" ("user_id", "result");

CREATE TABLE "trade_screenshots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "trade_id" UUID NOT NULL,
  "storage_key" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "trade_screenshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "trade_screenshots_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trades"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "trade_screenshots_trade_id_idx" ON "trade_screenshots" ("trade_id");
CREATE INDEX "trade_screenshots_trade_id_sort_order_idx" ON "trade_screenshots" ("trade_id", "sort_order");

CREATE TABLE "reviews" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "type" "ReviewType" NOT NULL,
  "trade_id" UUID,
  "trade_snapshot" JSONB,
  "review_date" DATE,
  "week_start" DATE,
  "week_end" DATE,
  "went_well" TEXT,
  "mistakes" TEXT,
  "followed_rules" "ReviewRuleStatus",
  "emotion" "ReviewEmotion",
  "lesson_learned" TEXT,
  "improvement_plan" TEXT,
  "discipline_score" INTEGER,
  "weekly_summary" TEXT,
  "biggest_win" TEXT,
  "biggest_mistake" TEXT,
  "risk_management" "ReviewRiskStatus",
  "next_goal" TEXT,
  "weekly_rating" INTEGER,
  "execution_rating" INTEGER,
  "emotion_rating" INTEGER,
  "what_went_well" TEXT,
  "what_went_wrong" TEXT,
  "mistakes_made" TEXT,
  "improvement_for_next_trade" TEXT,
  "would_take_again" BOOLEAN,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "reviews_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trades"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "reviews_trade_id_key" ON "reviews" ("trade_id");
CREATE INDEX "reviews_user_id_type_updated_at_desc_idx" ON "reviews" ("user_id", "type", "updated_at" DESC);
