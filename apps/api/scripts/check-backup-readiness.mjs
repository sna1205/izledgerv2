import {
  assertBackupBucketConfig,
  assertBucketExistsAndVersioned,
  commandAvailable,
  createS3Client,
  describeDatabaseUrl,
  parseArgs,
  parseBoolean,
  resolveBackupConfig,
} from "./lib/backup-config.mjs";

function fail(message, details = "") {
  console.error(details ? `${message}\n${details}` : message);
  process.exit(1);
}

function outputLine(message) {
  process.stdout.write(`${message}\n`);
}

function outputHeader(title) {
  process.stdout.write(`\n${title}\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const skipToolCheck = parseBoolean(args["skip-tool-check"], false);
  const skipBucketCheck = parseBoolean(args["skip-bucket-check"], false);
  const skipStorageCheck = parseBoolean(args["skip-storage-check"], false);
  const requireRestoreDrill = parseBoolean(args["require-restore-drill"], false);
  const config = resolveBackupConfig(args);

  outputHeader("Backup readiness");
  outputLine(`- backup database target: ${describeDatabaseUrl(config.backupDatabaseUrl)}`);
  outputLine(`- backup object prefix: ${config.backupObjectPrefix}`);

  if (!skipToolCheck) {
    if (!commandAvailable(config.backupPgDumpPath)) {
      fail(
        "Backup readiness failed.",
        `Could not find ${config.backupPgDumpPath} in PATH. Set BACKUP_PGDUMP_PATH if pg_dump lives elsewhere.`,
      );
    }

    if (!commandAvailable(config.backupPgRestorePath)) {
      fail(
        "Backup readiness failed.",
        `Could not find ${config.backupPgRestorePath} in PATH. Set BACKUP_PGRESTORE_PATH if pg_restore lives elsewhere.`,
      );
    }

    outputLine(`- pg_dump command available: ${config.backupPgDumpPath}`);
    outputLine(`- pg_restore command available: ${config.backupPgRestorePath}`);
  } else {
    outputLine("- pg_dump/pg_restore availability skipped");
  }

  assertBackupBucketConfig(config);
  outputLine(`- logical-backup bucket: ${config.backupBucket}`);

  if (!skipBucketCheck) {
    const backupClient = createS3Client({
      region: config.backupRegion,
      endpoint: config.backupEndpoint,
      accessKey: config.backupAccessKey,
      secretKey: config.backupSecretKey,
      forcePathStyle: config.backupForcePathStyle,
    });

    await assertBucketExistsAndVersioned({
      client: backupClient,
      bucket: config.backupBucket,
      label: "Logical-backup",
    });

    outputLine("- logical-backup bucket exists and versioning is enabled");
  } else {
    outputLine("- logical-backup bucket connectivity/versioning skipped");
  }

  if (config.storageEnabled && !skipStorageCheck) {
    if (!config.storageBucket || !config.storageAccessKey || !config.storageSecretKey) {
      fail(
        "Backup readiness failed.",
        "STORAGE_ENABLED=true but screenshot storage credentials are incomplete.",
      );
    }

    const storageClient = createS3Client({
      region: config.storageRegion,
      endpoint: config.storageEndpoint,
      accessKey: config.storageAccessKey,
      secretKey: config.storageSecretKey,
      forcePathStyle: config.storageForcePathStyle,
    });

    await assertBucketExistsAndVersioned({
      client: storageClient,
      bucket: config.storageBucket,
      label: "Screenshot storage",
    });

    outputLine(`- screenshot bucket exists and versioning is enabled: ${config.storageBucket}`);
  } else if (config.storageEnabled) {
    outputLine("- screenshot bucket versioning check skipped");
  } else {
    outputLine("- screenshot bucket versioning skipped: STORAGE_ENABLED=false");
  }

  if (!config.lastRestoreVerifiedAt) {
    if (requireRestoreDrill) {
      fail(
        "Backup readiness failed.",
        "Set BACKUP_LAST_RESTORE_VERIFIED_AT to the last successful restore drill timestamp before releasing.",
      );
    }

    outputLine("- last restore verification: not recorded");
  } else {
    const parsed = new Date(config.lastRestoreVerifiedAt);

    if (Number.isNaN(parsed.getTime())) {
      fail(
        "Backup readiness failed.",
        "BACKUP_LAST_RESTORE_VERIFIED_AT must be an ISO-8601 timestamp or YYYY-MM-DD value.",
      );
    }

    outputLine(`- last restore verification: ${parsed.toISOString()}`);
  }

  outputHeader("Result");
  outputLine("Backup readiness checks passed.");
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  fail("Backup readiness failed.", message);
});
