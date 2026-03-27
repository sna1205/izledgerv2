import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(apiRoot, "..", "..");

function fail(message, details = "") {
  console.error(details ? `${message}\n${details}` : message);
  process.exit(1);
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: "pipe",
    ...options,
  });

  return result;
}

const dirtyPrismaState = run(
  "git",
  [
    "-C",
    repoRoot,
    "status",
    "--porcelain",
    "--untracked-files=all",
    "--",
    "apps/api/prisma/schema.prisma",
    "apps/api/prisma/migrations",
  ],
);

if (dirtyPrismaState.status !== 0) {
  fail(
    "Unable to inspect Prisma release state with git.",
    text(dirtyPrismaState.stderr),
  );
}

if (text(dirtyPrismaState.stdout)) {
  fail(
    [
      "Uncommitted Prisma changes detected.",
      "Commit or remove pending schema/migration changes before releasing.",
    ].join("\n"),
    text(dirtyPrismaState.stdout),
  );
}

for (const args of [
  ["run", "prisma:validate"],
  ["run", "prisma:generate"],
  ["run", "prisma:check:migrations"],
]) {
  const result = run("npm", args, { cwd: apiRoot });

  if (result.status !== 0) {
    fail(
      `Prisma release check failed while running \`npm ${args.join(" ")}\`.`,
      [text(result.stdout), text(result.stderr)].filter(Boolean).join("\n"),
    );
  }
}

process.stdout.write(
  [
    "Prisma release checks passed.",
    "- schema and migrations are clean in git",
    "- schema validates",
    "- client generation succeeded",
    "- schema matches committed migrations",
  ].join("\n"),
);
process.stdout.write("\n");
