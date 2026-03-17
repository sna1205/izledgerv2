import "dotenv/config";
import { z } from "zod";

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no", "off", ""].includes(normalized)) {
      return false;
    }
  }

  return value;
}, z.boolean());

const optionalStringFromEnv = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
}, z.string().optional());

const optionalUrlFromEnv = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
}, z.string().url().optional());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),
  FRONTEND_URL: optionalUrlFromEnv,
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: optionalUrlFromEnv,
  SUPABASE_ANON_KEY: optionalStringFromEnv,
  SUPABASE_SERVICE_ROLE_KEY: optionalStringFromEnv,
  JWT_SECRET: optionalStringFromEnv,
  SESSION_COOKIE_NAME: z.string().default("izledger_session"),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(14),
  SESSION_COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  SESSION_COOKIE_DOMAIN: z.string().optional().transform((value) => value || undefined),
  SESSION_COOKIE_SECURE: booleanFromEnv.default(false),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  AUTH_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(1),
  STORAGE_ENABLED: booleanFromEnv.default(true),
  STORAGE_BUCKET: optionalStringFromEnv,
  STORAGE_REGION: z.string().default("auto"),
  STORAGE_ENDPOINT: optionalUrlFromEnv,
  STORAGE_ACCESS_KEY: optionalStringFromEnv,
  STORAGE_SECRET_KEY: optionalStringFromEnv,
  STORAGE_PUBLIC_BASE_URL: optionalUrlFromEnv,
  STORAGE_FORCE_PATH_STYLE: booleanFromEnv.default(true),
  STORAGE_SIGNED_READS: booleanFromEnv.default(true),
  STORAGE_SIGNED_READ_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
}).superRefine((data, ctx) => {
  if (data.NODE_ENV === "production" && !data.FRONTEND_URL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["FRONTEND_URL"],
      message: "FRONTEND_URL is required when NODE_ENV=production",
    });
  }

  if ((data.SUPABASE_ANON_KEY || data.SUPABASE_SERVICE_ROLE_KEY) && !data.SUPABASE_URL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["SUPABASE_URL"],
      message: "SUPABASE_URL is required when using Supabase API keys",
    });
  }

  if (!data.STORAGE_ENABLED) {
    return;
  }

  if (!data.STORAGE_BUCKET) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["STORAGE_BUCKET"],
      message: "STORAGE_BUCKET is required when STORAGE_ENABLED=true",
    });
  }

  if (!data.STORAGE_ENDPOINT) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["STORAGE_ENDPOINT"],
      message: "STORAGE_ENDPOINT is required when STORAGE_ENABLED=true",
    });
  }

  if (!data.STORAGE_ACCESS_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["STORAGE_ACCESS_KEY"],
      message: "STORAGE_ACCESS_KEY is required when STORAGE_ENABLED=true",
    });
  }

  if (!data.STORAGE_SECRET_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["STORAGE_SECRET_KEY"],
      message: "STORAGE_SECRET_KEY is required when STORAGE_ENABLED=true",
    });
  }
});

const parsed = envSchema.safeParse({
  ...process.env,
  FRONTEND_URL: process.env.FRONTEND_URL ?? process.env.FRONTEND_ORIGIN,
});

if (!parsed.success) {
  console.error("Invalid backend environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid backend environment variables");
}

export const env = parsed.data;
