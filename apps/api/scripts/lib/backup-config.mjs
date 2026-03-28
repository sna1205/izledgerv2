import { spawnSync } from "node:child_process";
import { GetBucketVersioningCommand, HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";

function valueFromEnv(name, fallback = "") {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : fallback;
}

export function parseArgs(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const part = argv[index];

    if (!part.startsWith("--")) {
      continue;
    }

    const [rawKey, inlineValue] = part.slice(2).split("=", 2);
    const nextValue = inlineValue ?? argv[index + 1];

    if (inlineValue === undefined && nextValue && !nextValue.startsWith("--")) {
      options[rawKey] = nextValue;
      index += 1;
      continue;
    }

    options[rawKey] = inlineValue ?? "true";
  }

  return options;
}

export function parseBoolean(value, defaultValue = false) {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = String(value).trim().toLowerCase();

  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "off", ""].includes(normalized)) {
    return false;
  }

  throw new Error(`Invalid boolean value: ${value}`);
}

export function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function parsePostgresUrl(value) {
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

export function describeDatabaseUrl(value) {
  const parsed = parsePostgresUrl(value);
  return parsed ? `${parsed.hostname}${parsed.pathname}` : "invalid";
}

export function resolveBackupConfig(args = {}) {
  const backupDatabaseUrl = (
    args["database-url"]
    ?? valueFromEnv("BACKUP_DATABASE_URL")
    ?? valueFromEnv("DIRECT_URL")
    ?? valueFromEnv("DATABASE_URL")
  );
  const parsedDatabaseUrl = parsePostgresUrl(backupDatabaseUrl);

  if (!parsedDatabaseUrl) {
    throw new Error(
      [
        "Backup database configuration is invalid.",
        "- Set BACKUP_DATABASE_URL to a valid PostgreSQL connection string.",
        "- DIRECT_URL or DATABASE_URL can act as the fallback when BACKUP_DATABASE_URL is unset.",
      ].join("\n"),
    );
  }

  return {
    backupDatabaseUrl,
    backupBucket: args.bucket ?? valueFromEnv("BACKUP_S3_BUCKET"),
    backupRegion: args.region ?? valueFromEnv("BACKUP_S3_REGION", "auto"),
    backupEndpoint: args.endpoint ?? valueFromEnv("BACKUP_S3_ENDPOINT"),
    backupAccessKey: args["access-key"] ?? valueFromEnv("BACKUP_S3_ACCESS_KEY"),
    backupSecretKey: args["secret-key"] ?? valueFromEnv("BACKUP_S3_SECRET_KEY"),
    backupForcePathStyle: parseBoolean(
      args["force-path-style"] ?? valueFromEnv("BACKUP_S3_FORCE_PATH_STYLE", "true"),
      true,
    ),
    backupObjectPrefix: (args.prefix ?? valueFromEnv("BACKUP_OBJECT_PREFIX", "postgres/daily"))
      .replace(/^\/+|\/+$/g, ""),
    backupPgDumpPath: args["pg-dump-path"] ?? valueFromEnv("BACKUP_PGDUMP_PATH", "pg_dump"),
    backupPgRestorePath: args["pg-restore-path"] ?? valueFromEnv("BACKUP_PGRESTORE_PATH", "pg_restore"),
    lastRestoreVerifiedAt: args["last-restore-verified-at"] ?? valueFromEnv("BACKUP_LAST_RESTORE_VERIFIED_AT"),
    releaseRequiresBackup: parseBoolean(
      args["release-check-require-backup"] ?? valueFromEnv("RELEASE_CHECK_REQUIRE_BACKUP", "false"),
      false,
    ),
    storageEnabled: parseBoolean(valueFromEnv("STORAGE_ENABLED", "false"), false),
    storageBucket: valueFromEnv("STORAGE_BUCKET"),
    storageRegion: valueFromEnv("STORAGE_REGION", "auto"),
    storageEndpoint: valueFromEnv("STORAGE_ENDPOINT"),
    storageAccessKey: valueFromEnv("STORAGE_ACCESS_KEY"),
    storageSecretKey: valueFromEnv("STORAGE_SECRET_KEY"),
    storageForcePathStyle: parseBoolean(valueFromEnv("STORAGE_FORCE_PATH_STYLE", "true"), true),
  };
}

export function assertBackupBucketConfig(config) {
  if (!config.backupBucket || !config.backupAccessKey || !config.backupSecretKey) {
    throw new Error(
      [
        "Backup bucket configuration is incomplete.",
        "- Set BACKUP_S3_BUCKET, BACKUP_S3_ACCESS_KEY, and BACKUP_S3_SECRET_KEY.",
      ].join("\n"),
    );
  }
}

export function createS3Client({ region, endpoint, accessKey, secretKey, forcePathStyle }) {
  return new S3Client({
    region,
    endpoint: endpoint || undefined,
    forcePathStyle,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
  });
}

export async function assertBucketExistsAndVersioned({ client, bucket, label }) {
  await client.send(
    new HeadBucketCommand({
      Bucket: bucket,
    }),
  );

  const versioning = await client.send(
    new GetBucketVersioningCommand({
      Bucket: bucket,
    }),
  );

  if (versioning.Status !== "Enabled") {
    throw new Error(`${label} bucket versioning is not enabled for ${bucket}.`);
  }
}

export function commandAvailable(command) {
  const checkCommand = process.platform === "win32" ? "where" : "command";
  const args = process.platform === "win32" ? [command] : ["-v", command];
  const result = spawnSync(checkCommand, args, {
    encoding: "utf8",
    stdio: "pipe",
    shell: process.platform !== "win32",
  });

  return result.status === 0;
}

export function buildBackupObjectKey(prefix, date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const timestamp = date.toISOString().replace(/:/g, "-");

  return `${prefix}/${year}/${month}/${day}/izledger-${timestamp}.dump`;
}
