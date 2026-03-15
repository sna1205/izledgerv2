import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),
  FRONTEND_ORIGIN: z.string().url(),
  DATABASE_URL: z.string().min(1),
  SESSION_COOKIE_NAME: z.string().default("izledger_session"),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(14),
  SESSION_COOKIE_DOMAIN: z.string().optional().transform((value) => value || undefined),
  SESSION_COOKIE_SECURE: z.coerce.boolean().default(false),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  AUTH_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(1),
  STORAGE_BUCKET: z.string().min(1),
  STORAGE_REGION: z.string().default("auto"),
  STORAGE_ENDPOINT: z.string().url(),
  STORAGE_ACCESS_KEY: z.string().min(1),
  STORAGE_SECRET_KEY: z.string().min(1),
  STORAGE_PUBLIC_BASE_URL: z.string().optional().transform((value) => value || undefined),
  STORAGE_FORCE_PATH_STYLE: z.coerce.boolean().default(true),
  STORAGE_SIGNED_READS: z.coerce.boolean().default(true),
  STORAGE_SIGNED_READ_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid backend environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid backend environment variables");
}

export const env = parsed.data;
