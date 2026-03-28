import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseDotenv } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "..");
const prismaCli = path.resolve(apiRoot, "..", "..", "node_modules", "prisma", "build", "index.js");

function readEnvFile(filename) {
  const filePath = path.join(apiRoot, filename);

  if (!existsSync(filePath)) {
    return {};
  }

  return parseDotenv(readFileSync(filePath, "utf8"));
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
  const hasLocalFile = existsSync(path.join(apiRoot, ".env.local"));

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

const runtimeEnv = resolveRuntimeEnv();
const fileEnv = loadFileEnv();

function deriveShadowDatabaseUrlFromTestDatabase() {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL
    ?? fileEnv.TEST_DATABASE_URL
    ?? "";

  if (!text(testDatabaseUrl)) {
    return "";
  }

  try {
    const parsed = new URL(testDatabaseUrl);
    const databaseName = parsed.pathname.replace(/^\//, "");

    if (!databaseName) {
      return "";
    }

    parsed.pathname = `/${databaseName}_shadow`;
    return parsed.toString();
  } catch {
    return "";
  }
}

function readShadowDatabaseUrl() {
  const args = process.argv.slice(2);

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];

    if (current?.startsWith("--shadow-database-url=")) {
      return current.slice("--shadow-database-url=".length);
    }

    if (current === "--shadow-database-url") {
      return args[index + 1] ?? "";
    }
  }

  const explicitShadowDatabaseUrl = process.env.PRISMA_MIGRATE_CHECK_SHADOW_DATABASE_URL
    ?? process.env.SHADOW_DATABASE_URL
    ?? fileEnv.PRISMA_MIGRATE_CHECK_SHADOW_DATABASE_URL
    ?? fileEnv.SHADOW_DATABASE_URL
    ?? "";

  if (explicitShadowDatabaseUrl.trim()) {
    return explicitShadowDatabaseUrl;
  }

  if (runtimeEnv !== "production") {
    return deriveShadowDatabaseUrlFromTestDatabase();
  }

  return "";
}

function fail(message, details = "") {
  console.error(details ? `${message}\n${details}` : message);
  process.exit(1);
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function ensureLocalShadowDatabaseExists(databaseUrl) {
  try {
    const parsed = new URL(databaseUrl);
    const databaseName = parsed.pathname.replace(/^\//, "");
    const isLocalDockerTestDatabase = (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost")
      && parsed.port === "5433";

    if (!databaseName || !isLocalDockerTestDatabase) {
      return;
    }

    const existsResult = run("docker", [
      "compose",
      "-f",
      "docker-compose.test.yml",
      "exec",
      "-T",
      "postgres",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-tAc",
      `SELECT 1 FROM pg_database WHERE datname = '${databaseName.replaceAll("'", "''")}'`,
    ]);

    if (existsResult.status === 0 && text(existsResult.stdout) === "1") {
      return;
    }

    const createResult = run("docker", [
      "compose",
      "-f",
      "docker-compose.test.yml",
      "exec",
      "-T",
      "postgres",
      "createdb",
      "-U",
      "postgres",
      databaseName,
    ]);

    if (createResult.status !== 0 && !text(createResult.stderr).includes("already exists")) {
      fail(
        "Unable to prepare the local Prisma shadow database.",
        [text(createResult.stdout), text(createResult.stderr)].filter(Boolean).join("\n"),
      );
    }
  } catch {
    // Leave environments without Docker-based local test databases to use explicit shadow DB configuration.
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: apiRoot,
    encoding: "utf8",
    stdio: "pipe",
    ...options,
  });

  return result;
}

const shadowDatabaseUrl = readShadowDatabaseUrl();

if (text(shadowDatabaseUrl) && runtimeEnv !== "production") {
  ensureLocalShadowDatabaseExists(shadowDatabaseUrl);
}

if (!shadowDatabaseUrl) {
  fail(
    [
      "Prisma migration drift check is not configured.",
      "Set PRISMA_MIGRATE_CHECK_SHADOW_DATABASE_URL (or SHADOW_DATABASE_URL) to a disposable PostgreSQL database before running this script.",
    ].join("\n"),
  );
}

const diff = run(process.execPath, [
  prismaCli,
  "migrate",
  "diff",
  "--exit-code",
  "--from-migrations",
  "prisma/migrations",
  "--to-schema-datamodel",
  "prisma/schema.prisma",
  "--shadow-database-url",
  shadowDatabaseUrl,
]);

if (diff.status === 0) {
  if (text(diff.stdout)) {
    process.stdout.write(diff.stdout);
  }
  process.exit(0);
}

if (diff.status === 2) {
  fail(
    [
      "Prisma schema drift detected between prisma/schema.prisma and prisma/migrations.",
      "Create and commit the missing migration before releasing.",
    ].join("\n"),
    text(diff.stdout) || text(diff.stderr),
  );
}

fail(
  "Prisma migration drift check failed.",
  [text(diff.stdout), text(diff.stderr)].filter(Boolean).join("\n"),
);
