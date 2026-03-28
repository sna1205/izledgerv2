import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseBoolean, resolveBackupConfig } from "./lib/backup-config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "..");

function fail(message, details = "") {
  console.error(details ? `${message}\n${details}` : message);
  process.exit(1);
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function run(command, args) {
  return spawnSync(command, args, {
    cwd: apiRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
}

const checks = [
  {
    label: "Prisma release state",
    args: ["run", "prisma:check:release"],
  },
  {
    label: "Persistence-critical release gate",
    args: ["run", "check:persistence:release"],
  },
];

function shouldRunBackupCheck() {
  try {
    const config = resolveBackupConfig({});
    return config.releaseRequiresBackup
      || Boolean(process.env.BACKUP_DATABASE_URL?.trim())
      || Boolean(process.env.BACKUP_S3_BUCKET?.trim());
  } catch {
    return parseBoolean(process.env.RELEASE_CHECK_REQUIRE_BACKUP ?? "false", false);
  }
}

for (const check of checks) {
  process.stdout.write(`Running ${check.label}...\n`);

  const result = run("npm", check.args);

  if (result.status !== 0) {
    fail(
      `Release readiness failed during ${check.label}.`,
      [text(result.stdout), text(result.stderr)].filter(Boolean).join("\n"),
    );
  }

  const output = [text(result.stdout), text(result.stderr)].filter(Boolean).join("\n");

  if (output) {
    process.stdout.write(`${output}\n`);
  }
}

const runBackupCheck = shouldRunBackupCheck();

if (runBackupCheck) {
  const backupArgs = ["run", "backup:check"];

  if (parseBoolean(process.env.RELEASE_CHECK_REQUIRE_RESTORE_DRILL ?? "true", true)) {
    backupArgs.push("--", "--require-restore-drill=true");
  }

  process.stdout.write("Running Backup and restore readiness...\n");
  const backupResult = run("npm", backupArgs);

  if (backupResult.status !== 0) {
    fail(
      "Release readiness failed during Backup and restore readiness.",
      [text(backupResult.stdout), text(backupResult.stderr)].filter(Boolean).join("\n"),
    );
  }

  const output = [text(backupResult.stdout), text(backupResult.stderr)].filter(Boolean).join("\n");

  if (output) {
    process.stdout.write(`${output}\n`);
  }
} else {
  process.stdout.write("Skipping Backup and restore readiness. Set RELEASE_CHECK_REQUIRE_BACKUP=true to enforce it.\n");
}

process.stdout.write(
  [
    "Release readiness checks passed.",
    "- Prisma release validation passed",
    "- Persistence-critical release gate passed",
    runBackupCheck
      ? "- Backup and restore readiness passed"
      : "- Backup and restore readiness skipped",
  ].join("\n"),
);
process.stdout.write("\n");
