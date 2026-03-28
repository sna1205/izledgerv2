import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import {
  assertBackupBucketConfig,
  assertBucketExistsAndVersioned,
  buildBackupObjectKey,
  commandAvailable,
  createS3Client,
  describeDatabaseUrl,
  parseArgs,
  parseBoolean,
  resolveBackupConfig,
  text,
} from "./lib/backup-config.mjs";

function fail(message, details = "") {
  console.error(details ? `${message}\n${details}` : message);
  process.exit(1);
}

function outputLine(message) {
  process.stdout.write(`${message}\n`);
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    stdio: "pipe",
    ...options,
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = parseBoolean(args["dry-run"], false);
  const skipBucketCheck = parseBoolean(args["skip-bucket-check"], false);
  const skipToolCheck = parseBoolean(args["skip-tool-check"], false);
  const config = resolveBackupConfig(args);

  assertBackupBucketConfig(config);

  if (!skipToolCheck && !commandAvailable(config.backupPgDumpPath)) {
    fail(
      "Logical backup failed before export started.",
      `Could not find ${config.backupPgDumpPath} in PATH. Set BACKUP_PGDUMP_PATH if pg_dump lives elsewhere.`,
    );
  }

  const now = new Date();
  const objectKey = buildBackupObjectKey(config.backupObjectPrefix, now);
  const client = createS3Client({
    region: config.backupRegion,
    endpoint: config.backupEndpoint,
    accessKey: config.backupAccessKey,
    secretKey: config.backupSecretKey,
    forcePathStyle: config.backupForcePathStyle,
  });

  outputLine(`Backup database target: ${describeDatabaseUrl(config.backupDatabaseUrl)}`);
  outputLine(`Backup destination: s3://${config.backupBucket}/${objectKey}`);

  if (dryRun) {
    outputLine("Dry run only. pg_dump and upload were skipped.");
    return;
  }

  if (!skipBucketCheck) {
    await assertBucketExistsAndVersioned({
      client,
      bucket: config.backupBucket,
      label: "Logical-backup",
    });
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "izledger-logical-backup-"));
  const dumpPath = path.join(tempDir, "izledger.dump");

  try {
    const dumpResult = run(config.backupPgDumpPath, [
      "--format=custom",
      "--no-owner",
      "--no-privileges",
      "--file",
      dumpPath,
      config.backupDatabaseUrl,
    ]);

    if (dumpResult.status !== 0) {
      fail(
        "Logical backup export failed.",
        [text(dumpResult.stdout), text(dumpResult.stderr)].filter(Boolean).join("\n"),
      );
    }

    const dumpStats = fs.statSync(dumpPath);

    await client.send(
      new PutObjectCommand({
        Bucket: config.backupBucket,
        Key: objectKey,
        Body: fs.createReadStream(dumpPath),
        ContentType: "application/octet-stream",
        Metadata: {
          backup_timestamp: now.toISOString(),
        },
      }),
    );

    outputLine(`Backup uploaded successfully (${dumpStats.size.toLocaleString("en-US")} bytes).`);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  fail("Logical backup failed.", message);
});
