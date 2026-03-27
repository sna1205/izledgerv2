import { spawnSync } from "node:child_process";
import { access, copyFile, readFile } from "node:fs/promises";
import { constants, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parse as parseDotenv } from "dotenv";

export const WSL_SAFE_TMP_DIR = "/tmp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const rootDir = path.resolve(__dirname, "..");
export const preferredNodePath =
  process.env.IZLEDGER_NODE_PATH ??
  (process.platform === "linux" && existsSync("/usr/bin/node") ? "/usr/bin/node" : process.execPath);
const apiMigrateScriptPath = path.join(rootDir, "apps/api/scripts/run-local-migrations.mjs");

const apiEnvLocalPath = path.join(rootDir, "apps/api/.env.local");
const apiEnvExamplePath = path.join(rootDir, "apps/api/.env.example");
const webEnvLocalPath = path.join(rootDir, "apps/web/.env.local");
const webEnvExamplePath = path.join(rootDir, "apps/web/.env.example");
const apiLocalOverrideKeys = ["NODE_ENV", "APP_ENV", "PORT", "HOST", "APP_URL", "API_URL", "CORS_ALLOWED_ORIGINS"];
const webLocalOverrideKeys = ["NODE_ENV", "VITE_APP_ENV", "VITE_API_BASE_URL", "VITE_FEATURE_ECONOMIC_CALENDAR"];

async function ensureFile(targetPath, examplePath) {
  try {
    await access(targetPath, constants.F_OK);
    return false;
  } catch {
    await copyFile(examplePath, targetPath);
    return true;
  }
}

async function readEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  return parseDotenv(await readFile(filePath, "utf8"));
}

function readEnvFileSync(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  return parseDotenv(readFileSync(filePath, "utf8"));
}

function getDefaultPort(protocol) {
  return protocol === "https:" ? 443 : 80;
}

function getUrlPort(url) {
  return url.port ? Number.parseInt(url.port, 10) : getDefaultPort(url.protocol);
}

function parseRequiredUrl(value, key, filePath) {
  if (!value || typeof value !== "string") {
    throw new Error(`${path.relative(rootDir, filePath)} must define ${key}.`);
  }

  try {
    return new URL(value);
  } catch {
    throw new Error(`${path.relative(rootDir, filePath)} has an invalid ${key}: ${value}`);
  }
}

function splitOrigins(value) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function assertLocalDevelopment(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function omitEnvKeys(sourceEnv, keys) {
  const nextEnv = { ...sourceEnv };

  for (const key of keys) {
    delete nextEnv[key];
  }

  return nextEnv;
}

function mergeFileBackedEnv(sourceEnv, fileEnv, forcedKeys = []) {
  const keysToOmit = [...new Set([...forcedKeys, ...Object.keys(fileEnv)])];

  return {
    ...omitEnvKeys(sourceEnv, keysToOmit),
    ...fileEnv,
  };
}

export async function ensureLocalDevEnvFiles(log) {
  const createdApiEnvLocal = await ensureFile(apiEnvLocalPath, apiEnvExamplePath);
  const createdWebEnvLocal = await ensureFile(webEnvLocalPath, webEnvExamplePath);

  if (createdApiEnvLocal) {
    log?.("created apps/api/.env.local from apps/api/.env.example");
  }

  if (createdWebEnvLocal) {
    log?.("created apps/web/.env.local from apps/web/.env.example");
  }

  return {
    createdApiEnvLocal,
    createdWebEnvLocal,
  };
}

export async function loadApiLocalFileEnv() {
  return readEnvFile(apiEnvLocalPath);
}

export async function loadLocalDevConfig() {
  const [apiEnv, webEnv] = await Promise.all([
    readEnvFile(apiEnvLocalPath),
    readEnvFile(webEnvLocalPath),
  ]);

  const apiUrl = parseRequiredUrl(apiEnv.API_URL, "API_URL", apiEnvLocalPath);
  const appUrl = parseRequiredUrl(apiEnv.APP_URL, "APP_URL", apiEnvLocalPath);
  const webApiUrl = parseRequiredUrl(webEnv.VITE_API_BASE_URL, "VITE_API_BASE_URL", webEnvLocalPath);
  const apiPort = Number.parseInt(apiEnv.PORT ?? "", 10);
  const webPort = getUrlPort(appUrl);
  const corsAllowedOrigins = splitOrigins(apiEnv.CORS_ALLOWED_ORIGINS);
  const relativeApiEnvLocalPath = path.relative(rootDir, apiEnvLocalPath);
  const relativeWebEnvLocalPath = path.relative(rootDir, webEnvLocalPath);

  assertLocalDevelopment(Number.isInteger(apiPort) && apiPort > 0, `${relativeApiEnvLocalPath} must define a positive integer PORT.`);
  assertLocalDevelopment((apiEnv.NODE_ENV ?? "development") === "development", `${relativeApiEnvLocalPath} must set NODE_ENV=development for local dev.`);
  assertLocalDevelopment((apiEnv.APP_ENV ?? "development") === "development", `${relativeApiEnvLocalPath} must set APP_ENV=development for local dev.`);
  assertLocalDevelopment(webEnv.VITE_APP_ENV === "local", `${relativeWebEnvLocalPath} must set VITE_APP_ENV=local for local dev.`);
  assertLocalDevelopment(getUrlPort(apiUrl) === apiPort, `${relativeApiEnvLocalPath} PORT must match the port in API_URL.`);
  assertLocalDevelopment(webApiUrl.origin === apiUrl.origin, `${relativeWebEnvLocalPath} VITE_API_BASE_URL must match ${relativeApiEnvLocalPath} API_URL.`);
  assertLocalDevelopment(corsAllowedOrigins.includes(appUrl.origin), `${relativeApiEnvLocalPath} CORS_ALLOWED_ORIGINS must include ${appUrl.origin}.`);

  return {
    paths: {
      apiEnvLocalPath,
      webEnvLocalPath,
    },
    api: {
      origin: apiUrl.origin,
      port: apiPort,
    },
    web: {
      origin: appUrl.origin,
      port: webPort,
      appEnv: webEnv.VITE_APP_ENV,
      apiBaseUrl: webApiUrl.origin,
    },
  };
}

export function getApiLocalProcessEnv(baseEnv = process.env) {
  const apiFileEnv = readEnvFileSync(apiEnvLocalPath);

  return {
    ...mergeFileBackedEnv(baseEnv, apiFileEnv, apiLocalOverrideKeys),
    TMPDIR: WSL_SAFE_TMP_DIR,
    TMP: WSL_SAFE_TMP_DIR,
    TEMP: WSL_SAFE_TMP_DIR,
  };
}

export function getWebLocalProcessEnv(baseEnv = process.env) {
  const webFileEnv = readEnvFileSync(webEnvLocalPath);

  return mergeFileBackedEnv(baseEnv, webFileEnv, webLocalOverrideKeys);
}

export async function applyLocalApiMigrations(log, logError, baseEnv = process.env) {
  const apiFileEnv = await loadApiLocalFileEnv();
  const result = spawnSync(
    preferredNodePath,
    [apiMigrateScriptPath],
    {
      cwd: path.join(rootDir, "apps/api"),
      env: {
        ...getApiLocalProcessEnv(baseEnv),
        ...apiFileEnv,
      },
      encoding: "utf8",
      stdio: "pipe",
    },
  );

  if (result.stdout?.trim()) {
    log?.(result.stdout.trim());
  }

  if (result.stderr?.trim()) {
    logError?.(result.stderr.trim());
  }

  if (result.status !== 0) {
    const failureMessage = result.error instanceof Error
      ? result.error.message
      : `local Prisma migrations failed with exit code ${result.status ?? 1}.`;
    throw new Error(failureMessage);
  }
}
