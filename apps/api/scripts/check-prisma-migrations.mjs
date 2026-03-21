import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "..");
const prismaCli = path.resolve(apiRoot, "..", "..", "node_modules", "prisma", "build", "index.js");

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

  return process.env.PRISMA_MIGRATE_CHECK_SHADOW_DATABASE_URL
    ?? process.env.SHADOW_DATABASE_URL
    ?? "";
}

const shadowDatabaseUrl = readShadowDatabaseUrl();

function fail(message, details = "") {
  console.error(details ? `${message}\n${details}` : message);
  process.exit(1);
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
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
