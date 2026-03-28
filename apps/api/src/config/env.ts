import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseDotenv } from "dotenv";
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

const optionalUrlArrayFromEnv = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    const values = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    return values;
  }

  return [];
}, z.array(z.string().url()).default([]));

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function normalizeOrigin(value: string) {
  return trimTrailingSlash(new URL(value).origin);
}

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "0.0.0.0" || hostname === "127.0.0.1" || hostname === "::1";
}

function getUrlHostname(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

function getRegistrableDomain(hostname: string) {
  if (isLocalHostname(hostname)) {
    return hostname;
  }

  const parts = hostname.split(".").filter(Boolean);

  if (parts.length < 2) {
    return hostname;
  }

  return parts.slice(-2).join(".");
}

function isCrossSite(appHostname: string, apiHostname: string) {
  return getRegistrableDomain(appHostname) !== getRegistrableDomain(apiHostname);
}

function isValidCookieDomain(domain: string) {
  return /^[A-Za-z0-9.-]+$/.test(domain);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRootDir = path.resolve(__dirname, "../..");

function readEnvFile(filename: string) {
  const filePath = path.join(appRootDir, filename);

  if (!existsSync(filePath)) {
    return {};
  }

  return parseDotenv(readFileSync(filePath));
}

function resolveRuntimeEnv() {
  const candidate = process.env.NODE_ENV ?? process.env.APP_ENV ?? "development";

  if (candidate === "production" || candidate === "test") {
    return candidate;
  }

  return "development";
}

function loadFileEnv() {
  const runtimeEnv = resolveRuntimeEnv();
  const hasLocalFile = existsSync(path.join(appRootDir, ".env.local"));

  const developmentFallback = runtimeEnv === "development" && !hasLocalFile
    ? readEnvFile(".env.example")
    : {};

  const modeEnv = runtimeEnv === "production"
    ? readEnvFile(".env.production")
    : runtimeEnv === "test"
      ? readEnvFile(".env.test")
      : readEnvFile(".env.local");

  return {
    ...developmentFallback,
    ...modeEnv,
  };
}

const envSchema = z.object({
  APP_ENV: z.enum(["development", "test", "production"]).optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_DEBUG: booleanFromEnv.default(false),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),
  APP_URL: optionalUrlFromEnv,
  API_URL: optionalUrlFromEnv,
  CORS_ALLOWED_ORIGINS: optionalUrlArrayFromEnv,
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: optionalStringFromEnv,
  TEST_DATABASE_URL: optionalStringFromEnv,
  PRISMA_MIGRATE_CHECK_SHADOW_DATABASE_URL: optionalStringFromEnv,
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
  RESTORE_VERIFY_API_URL: optionalUrlFromEnv,
  RESTORE_VERIFY_STORAGE_SAMPLE_SIZE: optionalStringFromEnv,
  RESTORE_VERIFY_REQUIRE_API: booleanFromEnv.default(false),
  RESTORE_VERIFY_REQUIRE_STORAGE: booleanFromEnv.default(false),
  RESTORE_VERIFY_REQUIRE_BUCKET_VERSIONING: booleanFromEnv.default(false),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
}).superRefine((data, ctx) => {
  const appUrl = data.APP_URL ? new URL(data.APP_URL) : null;
  const apiUrl = data.API_URL ? new URL(data.API_URL) : null;

  if (data.NODE_ENV === "production" && data.APP_DEBUG) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["APP_DEBUG"],
      message: "APP_DEBUG must be false when NODE_ENV=production",
    });
  }

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

  if (data.COOKIE_DOMAIN) {
    const normalizedCookieDomain = data.COOKIE_DOMAIN.replace(/^\./, "");

    if (!isValidCookieDomain(normalizedCookieDomain)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["COOKIE_DOMAIN"],
        message: "COOKIE_DOMAIN must be a bare domain name without a protocol or path",
      });
    }

    if (data.NODE_ENV === "production" && isLocalHostname(normalizedCookieDomain)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["COOKIE_DOMAIN"],
        message: "COOKIE_DOMAIN cannot target localhost in production",
      });
    }

    if (apiUrl && normalizedCookieDomain !== apiUrl.hostname && !apiUrl.hostname.endsWith(`.${normalizedCookieDomain}`)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["COOKIE_DOMAIN"],
        message: "COOKIE_DOMAIN must match the API host or one of its parent domains",
      });
    }
  }

  if (data.NODE_ENV === "production") {
    for (const [key, url] of [["APP_URL", appUrl], ["API_URL", apiUrl]] as const) {
      if (!url) {
        continue;
      }

      if (url.protocol !== "https:") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} must use https in production`,
        });
      }

      if (isLocalHostname(url.hostname)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} cannot use localhost in production`,
        });
      }
    }

    for (const origin of data.CORS_ALLOWED_ORIGINS) {
      const parsedOrigin = new URL(origin);

      if (parsedOrigin.protocol !== "https:") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CORS_ALLOWED_ORIGINS"],
          message: "CORS_ALLOWED_ORIGINS must use https in production",
        });
      }

      if (isLocalHostname(parsedOrigin.hostname)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CORS_ALLOWED_ORIGINS"],
          message: "CORS_ALLOWED_ORIGINS cannot include localhost in production",
        });
      }
    }

    for (const [key, url] of [["DATABASE_URL", data.DATABASE_URL], ["DIRECT_URL", data.DIRECT_URL]] as const) {
      if (!url) {
        continue;
      }

      const hostname = getUrlHostname(url);

      if (hostname && isLocalHostname(hostname)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} cannot use localhost or loopback hosts in production`,
        });
      }
    }
  }

  if (data.NODE_ENV === "production" && appUrl && apiUrl && isCrossSite(appUrl.hostname, apiUrl.hostname)
    && data.SESSION_COOKIE_SAME_SITE !== "none") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["SESSION_COOKIE_SAME_SITE"],
      message: "SESSION_COOKIE_SAME_SITE must be none when APP_URL and API_URL are on different sites",
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

const fileEnv = loadFileEnv();
const rawEnv = {
  ...fileEnv,
  ...process.env,
  NODE_ENV: process.env.NODE_ENV ?? process.env.APP_ENV ?? fileEnv.NODE_ENV ?? fileEnv.APP_ENV ?? "development",
  APP_ENV: process.env.APP_ENV ?? process.env.NODE_ENV ?? fileEnv.APP_ENV ?? fileEnv.NODE_ENV,
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN ?? process.env.SESSION_COOKIE_DOMAIN ?? fileEnv.COOKIE_DOMAIN,
};

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  console.error("Invalid backend environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid backend environment variables");
}

const normalizedAllowedOrigins = parsed.data.CORS_ALLOWED_ORIGINS.length > 0
  ? parsed.data.CORS_ALLOWED_ORIGINS.map(normalizeOrigin)
  : parsed.data.APP_URL
    ? [normalizeOrigin(parsed.data.APP_URL)]
    : [];

function serializeEnvValue(value: boolean | number | string | string[] | undefined) {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.join(",");
  }

  return String(value);
}

function applyValidatedEnv(targetEnv: NodeJS.ProcessEnv, values: Record<string, boolean | number | string | string[] | undefined>) {
  for (const [key, value] of Object.entries(values)) {
    const serializedValue = serializeEnvValue(value);

    if (serializedValue === undefined) {
      delete targetEnv[key];
      continue;
    }

    targetEnv[key] = serializedValue;
  }
}

applyValidatedEnv(process.env, {
  ...parsed.data,
  APP_URL: parsed.data.APP_URL ? normalizeOrigin(parsed.data.APP_URL) : undefined,
  API_URL: parsed.data.API_URL ? normalizeOrigin(parsed.data.API_URL) : undefined,
  CORS_ALLOWED_ORIGINS: normalizedAllowedOrigins,
  COOKIE_DOMAIN: parsed.data.COOKIE_DOMAIN,
  SESSION_COOKIE_DOMAIN: parsed.data.COOKIE_DOMAIN,
});

const envWarnings: string[] = [];
const explicitCorsAllowedOrigins = Object.prototype.hasOwnProperty.call(rawEnv, "CORS_ALLOWED_ORIGINS")
  ? (rawEnv as Record<string, string | undefined>).CORS_ALLOWED_ORIGINS
  : undefined;

if (parsed.data.NODE_ENV === "production" && !explicitCorsAllowedOrigins && normalizedAllowedOrigins.length > 0) {
  envWarnings.push("CORS_ALLOWED_ORIGINS is not set explicitly; defaulting to APP_URL.");
}

if (parsed.data.NODE_ENV === "production" && ["debug", "trace"].includes(parsed.data.LOG_LEVEL)) {
  envWarnings.push(`LOG_LEVEL=${parsed.data.LOG_LEVEL} is unusually verbose for production.`);
}

export const env = {
  ...parsed.data,
  APP_URL: parsed.data.APP_URL ? normalizeOrigin(parsed.data.APP_URL) : undefined,
  API_URL: parsed.data.API_URL ? normalizeOrigin(parsed.data.API_URL) : undefined,
  CORS_ALLOWED_ORIGINS: normalizedAllowedOrigins,
  SESSION_COOKIE_DOMAIN: parsed.data.COOKIE_DOMAIN,
} as const;

export { envWarnings };
