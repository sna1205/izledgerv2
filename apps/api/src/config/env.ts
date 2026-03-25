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
  APP_URL: optionalUrlFromEnv,
  API_URL: optionalUrlFromEnv,
  DATABASE_URL: z.string().min(1),
  SESSION_COOKIE_NAME: z.string().default("izledger_session"),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(14),
  SESSION_COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  COOKIE_DOMAIN: z.string().optional().transform((value) => value || undefined),
  SESSION_COOKIE_SECURE: booleanFromEnv.default(false),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  AUTH_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(1),
  STORAGE_ENABLED: booleanFromEnv.default(false),
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
  if (data.NODE_ENV === "production" && !data.APP_URL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["APP_URL"],
      message: "APP_URL is required when NODE_ENV=production",
    });
  }

  if (data.NODE_ENV === "production" && !data.API_URL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["API_URL"],
      message: "API_URL is required when NODE_ENV=production",
    });
  }

  if (data.NODE_ENV === "production" && !data.SESSION_COOKIE_SECURE) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["SESSION_COOKIE_SECURE"],
      message: "SESSION_COOKIE_SECURE must be true in production",
    });
  }

  if (data.SESSION_COOKIE_SAME_SITE === "none" && !data.SESSION_COOKIE_SECURE) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["SESSION_COOKIE_SECURE"],
      message: "SESSION_COOKIE_SECURE must be true when SESSION_COOKIE_SAME_SITE=none",
    });
  }

  if (data.NODE_ENV === "production" && !data.COOKIE_DOMAIN) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["COOKIE_DOMAIN"],
      message: "COOKIE_DOMAIN is required when NODE_ENV=production",
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
  APP_URL: process.env.APP_URL ?? process.env.FRONTEND_URL ?? process.env.FRONTEND_ORIGIN,
  API_URL: process.env.API_URL,
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN ?? process.env.SESSION_COOKIE_DOMAIN,
});

if (!parsed.success) {
  console.error("Invalid backend environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid backend environment variables");
}

export const env = {
  ...parsed.data,
  FRONTEND_URL: parsed.data.APP_URL,
  SESSION_COOKIE_DOMAIN: parsed.data.COOKIE_DOMAIN,
} as const;
