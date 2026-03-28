import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);
const prismaCliPath = require.resolve("prisma/build/index.js", { paths: [apiRoot] });
const migrationDatabaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const advisoryLockRetryCount = Number.parseInt(process.env.PRISMA_MIGRATE_ADVISORY_LOCK_RETRY_COUNT ?? "4", 10);
const advisoryLockRetryDelayMs = Number.parseInt(process.env.PRISMA_MIGRATE_ADVISORY_LOCK_RETRY_DELAY_MS ?? "15000", 10);

function fail(message, details = "") {
  console.error(details ? `${message}\n${details}` : message);
  process.exit(1);
}

function outputText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function runPrisma(args, options = {}) {
  return spawnSync(process.execPath, [prismaCliPath, ...args], {
    encoding: "utf8",
    stdio: "pipe",
    ...options,
  });
}

function getCommandOutput(result) {
  return [
    result.error instanceof Error ? result.error.message : "",
    outputText(result.stdout),
    outputText(result.stderr),
  ].filter(Boolean).join("\n");
}

function isAdvisoryLockTimeout(result) {
  const output = getCommandOutput(result).toLowerCase();
  return output.includes("advisory lock") && output.includes("timeout: 10000ms");
}

function createPrismaWorkspace(databaseUrl) {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "izledger-prisma-release-"));
  const workspacePrismaDir = path.join(workspaceRoot, "prisma");
  fs.cpSync(path.join(apiRoot, "prisma"), workspacePrismaDir, { recursive: true });
  fs.writeFileSync(
    path.join(workspaceRoot, ".env"),
    [
      `DATABASE_URL=${databaseUrl}`,
      `DIRECT_URL=${databaseUrl}`,
      "",
    ].join("\n"),
    "utf8",
  );
  return workspaceRoot;
}

function cleanupWorkspace(workspaceRoot) {
  try {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: could not remove temporary Prisma workspace at ${workspaceRoot}: ${message}`);
  }
}

function parsePostgresUrl(value) {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);
    return ["postgres:", "postgresql:"].includes(parsed.protocol) ? parsed : null;
  } catch {
    return null;
  }
}

const parsed = parsePostgresUrl(migrationDatabaseUrl);

if (!parsed) {
  fail(
    [
      "Cannot run release migrations.",
      "- Set DATABASE_URL to a valid PostgreSQL connection string.",
      "- Set DIRECT_URL as well when you want migrations to use a direct connection.",
    ].join("\n"),
  );
}

const prismaWorkspace = createPrismaWorkspace(migrationDatabaseUrl);
let result;
let attempt = 0;

try {
  do {
    attempt += 1;
    result = runPrisma(["migrate", "deploy", "--schema", "prisma/schema.prisma"], {
      cwd: prismaWorkspace,
      env: {
        ...process.env,
        DATABASE_URL: migrationDatabaseUrl,
        DIRECT_URL: migrationDatabaseUrl,
      },
    });

    if (result.status === 0 || !isAdvisoryLockTimeout(result) || attempt > advisoryLockRetryCount) {
      break;
    }

    process.stderr.write(
      [
        `Prisma advisory lock timed out during release migration attempt ${attempt}.`,
        `Retrying in ${advisoryLockRetryDelayMs}ms...`,
      ].join(" ") + "\n",
    );
    sleep(advisoryLockRetryDelayMs);
  } while (true);
} finally {
  cleanupWorkspace(prismaWorkspace);
}

if (result.status !== 0) {
  fail(
    "Prisma release migrations failed.",
    getCommandOutput(result),
  );
}

if (outputText(result.stdout)) {
  process.stdout.write(result.stdout);
}

process.stdout.write(
  `Release migrations completed using ${process.env.DIRECT_URL ? "DIRECT_URL" : "DATABASE_URL"}.\n`,
);
