import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "..");
const migrationDatabaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const npmExecPath = process.env.npm_execpath;

function fail(message, details = "") {
  console.error(details ? `${message}\n${details}` : message);
  process.exit(1);
}

function outputText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function runPrisma(args, options = {}) {
  if (npmExecPath) {
    return spawnSync(process.execPath, [npmExecPath, "exec", "--", "prisma", ...args], {
      encoding: "utf8",
      stdio: "pipe",
      ...options,
    });
  }

  return spawnSync("npx", ["prisma", ...args], {
    encoding: "utf8",
    stdio: "pipe",
    ...options,
  });
}

function createPrismaWorkspace(databaseUrl) {
  const workspaceRoot = fs.mkdtempSync(path.join(apiRoot, ".prisma-release-workspace-"));
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

try {
  result = runPrisma(["migrate", "deploy", "--schema", "prisma/schema.prisma"], {
    cwd: prismaWorkspace,
    env: {
      ...process.env,
      DATABASE_URL: migrationDatabaseUrl,
      DIRECT_URL: migrationDatabaseUrl,
    },
  });
} finally {
  cleanupWorkspace(prismaWorkspace);
}

if (result.status !== 0) {
  fail(
    "Prisma release migrations failed.",
    [
      result.error instanceof Error ? result.error.message : "",
      outputText(result.stdout),
      outputText(result.stderr),
    ].filter(Boolean).join("\n"),
  );
}

if (outputText(result.stdout)) {
  process.stdout.write(result.stdout);
}

process.stdout.write(
  `Release migrations completed using ${process.env.DIRECT_URL ? "DIRECT_URL" : "DATABASE_URL"}.\n`,
);
