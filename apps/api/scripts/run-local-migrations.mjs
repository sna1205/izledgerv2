import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);
const prismaCliPath = require.resolve("prisma/build/index.js", { paths: [apiRoot] });
const migrationDatabaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

function fail(message, details = "") {
  console.error(details ? `${message}\n${details}` : message);
  process.exit(1);
}

function outputText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function runPrisma(args, options = {}) {
  return spawnSync(process.execPath, [prismaCliPath, ...args], {
    encoding: "utf8",
    stdio: "pipe",
    ...options,
  });
}

function createPrismaWorkspace(databaseUrl) {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "izledger-prisma-local-"));
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

function getCombinedOutput(result) {
  return [outputText(result.stdout), outputText(result.stderr)].filter(Boolean).join("\n");
}

function getFailedMigrationNames(output) {
  return [...output.matchAll(/The `([^`]+)` migration started .* failed/g)].map((match) => match[1]);
}

async function findUnresolvedFailedMigrations(databaseUrl) {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT migration_name
       FROM "_prisma_migrations"
       WHERE finished_at IS NULL
         AND rolled_back_at IS NULL
       ORDER BY started_at ASC`,
    );

    return rows
      .map((row) => row?.migration_name)
      .filter((migrationName) => typeof migrationName === "string" && migrationName.length > 0);
  } finally {
    await prisma.$disconnect();
  }
}

async function markMigrationsRolledBack(databaseUrl, migrationNames) {
  if (migrationNames.length === 0) {
    return;
  }

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  try {
    for (const migrationName of migrationNames) {
      await prisma.$executeRaw`
        UPDATE "_prisma_migrations"
        SET rolled_back_at = CURRENT_TIMESTAMP
        WHERE migration_name = ${migrationName}
          AND finished_at IS NULL
          AND rolled_back_at IS NULL
      `;
      process.stdout.write(`Marked failed local migration as rolled back: ${migrationName}\n`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

const parsed = parsePostgresUrl(migrationDatabaseUrl);

if (!parsed) {
  fail(
    [
      "Cannot run local migrations.",
      "- Set DATABASE_URL to a valid PostgreSQL connection string.",
      "- Set DIRECT_URL as well when you want migrations to use a direct connection.",
    ].join("\n"),
  );
}

const prismaWorkspace = createPrismaWorkspace(migrationDatabaseUrl);
const prismaEnv = {
  ...process.env,
  DATABASE_URL: migrationDatabaseUrl,
  DIRECT_URL: migrationDatabaseUrl,
};

let result;

try {
  const unresolvedFailedMigrations = await findUnresolvedFailedMigrations(migrationDatabaseUrl);
  await markMigrationsRolledBack(migrationDatabaseUrl, unresolvedFailedMigrations);

  result = runPrisma(["migrate", "deploy", "--schema", "prisma/schema.prisma"], {
    cwd: prismaWorkspace,
    env: prismaEnv,
  });

  if (result.status !== 0) {
    const combinedOutput = getCombinedOutput(result);
    const failedMigrationNames = getFailedMigrationNames(combinedOutput);

    if (combinedOutput.includes("Error: P3009") && failedMigrationNames.length > 0) {
      await markMigrationsRolledBack(migrationDatabaseUrl, failedMigrationNames);

      result = runPrisma(["migrate", "deploy", "--schema", "prisma/schema.prisma"], {
        cwd: prismaWorkspace,
        env: prismaEnv,
      });
    }
  }
} finally {
  cleanupWorkspace(prismaWorkspace);
}

if (result.status !== 0) {
  fail("Prisma local migrations failed.", getCombinedOutput(result));
}

if (outputText(result.stdout)) {
  process.stdout.write(result.stdout);
}

process.stdout.write("Local Prisma migrations completed.\n");
