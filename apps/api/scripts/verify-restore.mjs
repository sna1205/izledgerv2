import { PrismaClient } from "@prisma/client";
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../src/config/env.ts";

function fail(message, details = "") {
  console.error(details ? `${message}\n${details}` : message);
  process.exit(1);
}

function parseArgs(argv) {
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

function parseBoolean(value, defaultValue = false) {
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();

  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "off", ""].includes(normalized)) {
    return false;
  }

  fail(`Invalid boolean value: ${value}`);
}

function parseStorageSampleSize(value) {
  if (value === undefined || value === null || value === "") {
    return 25;
  }

  if (String(value).trim().toLowerCase() === "all") {
    return "all";
  }

  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    fail("RESTORE_VERIFY_STORAGE_SAMPLE_SIZE must be a positive integer or 'all'.");
  }

  return parsed;
}

function outputHeader(title) {
  process.stdout.write(`\n${title}\n`);
}

function outputLine(message) {
  process.stdout.write(`${message}\n`);
}

function createStorageClient() {
  if (!env.STORAGE_BUCKET || !env.STORAGE_ACCESS_KEY || !env.STORAGE_SECRET_KEY) {
    fail(
      "Storage verification could not start.",
      "Set STORAGE_BUCKET, STORAGE_ACCESS_KEY, and STORAGE_SECRET_KEY when STORAGE_ENABLED=true.",
    );
  }

  return new S3Client({
    region: env.STORAGE_REGION,
    endpoint: env.STORAGE_ENDPOINT || undefined,
    forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.STORAGE_ACCESS_KEY,
      secretAccessKey: env.STORAGE_SECRET_KEY,
    },
  });
}

function isStorageEnabled() {
  return env.STORAGE_ENABLED;
}

function normalizeBaseUrl(value) {
  return value ? value.replace(/\/$/, "") : "";
}

function formatCount(label, value) {
  return `- ${label}: ${value.toLocaleString("en-US")}`;
}

function describeDatabaseUrl(value) {
  try {
    const url = new URL(value);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return "invalid";
  }
}

const args = parseArgs(process.argv.slice(2));
const printEnv = parseBoolean(args["print-env"], false);
const restoreVerifyApiUrl = args["api-url"] ?? env.RESTORE_VERIFY_API_URL;
const storageSampleSize = parseStorageSampleSize(
  args["storage-sample-size"] ?? env.RESTORE_VERIFY_STORAGE_SAMPLE_SIZE,
);
const requireApi = parseBoolean(args["require-api"] ?? env.RESTORE_VERIFY_REQUIRE_API, false);
const requireStorage = parseBoolean(args["require-storage"] ?? env.RESTORE_VERIFY_REQUIRE_STORAGE, false);
const prisma = new PrismaClient({
  log: ["error"],
});

async function verifyDatabase() {
  await prisma.$queryRaw`SELECT 1`;

  const [
    userCount,
    sessionCount,
    accountCount,
    tradeCount,
    reviewCount,
    shareCount,
    screenshotCount,
    pendingUploadCount,
    latestMigrationRows,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.session.count(),
    prisma.account.count(),
    prisma.trade.count(),
    prisma.review.count(),
    prisma.tradeShare.count(),
    prisma.tradeScreenshot.count(),
    prisma.tradeScreenshotUpload.count({
      where: {
        completedAt: null,
      },
    }),
    prisma.$queryRawUnsafe(
      'SELECT migration_name, finished_at FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY finished_at DESC NULLS LAST, migration_name DESC LIMIT 1',
    ),
  ]);

  const latestMigration = Array.isArray(latestMigrationRows) ? latestMigrationRows[0] : null;

  if (!latestMigration || typeof latestMigration !== "object" || !("migration_name" in latestMigration)) {
    fail('Restore verification could not confirm Prisma migration history.', 'Expected at least one completed row in "_prisma_migrations".');
  }

  outputHeader("Database verification");
  outputLine(formatCount("users", userCount));
  outputLine(formatCount("sessions", sessionCount));
  outputLine(formatCount("accounts", accountCount));
  outputLine(formatCount("trades", tradeCount));
  outputLine(formatCount("reviews", reviewCount));
  outputLine(formatCount("trade shares", shareCount));
  outputLine(formatCount("trade screenshots", screenshotCount));
  outputLine(formatCount("pending screenshot uploads", pendingUploadCount));
  outputLine(`- latest completed migration: ${String(latestMigration.migration_name)}`);

  return {
    screenshotCount,
  };
}

async function verifyApiHealth() {
  if (!restoreVerifyApiUrl) {
    if (requireApi) {
      fail("Restore verification requires a live API URL.", "Set RESTORE_VERIFY_API_URL or pass --api-url.");
    }

    outputHeader("API verification");
    outputLine("- skipped: RESTORE_VERIFY_API_URL not set");
    return;
  }

  const healthUrl = `${normalizeBaseUrl(restoreVerifyApiUrl)}/ready`;
  const response = await fetch(healthUrl);

  if (!response.ok) {
    fail("Restore verification failed API health check.", `${healthUrl} returned HTTP ${response.status}.`);
  }

  const payload = await response.json();

  if (payload?.status !== "ok" || payload?.database !== "ok") {
    fail(
      "Restore verification received an unhealthy API response.",
      JSON.stringify(payload, null, 2),
    );
  }

  outputHeader("API verification");
  outputLine(`- health URL: ${healthUrl}`);
  outputLine(`- API status: ${payload.status}`);
  outputLine(`- database status: ${payload.database}`);
  outputLine(`- storage enabled: ${String(payload.storageEnabled)}`);
}

async function verifyScreenshotStorage(screenshotCount) {
  outputHeader("Storage verification");

  if (!isStorageEnabled()) {
    if (requireStorage) {
      fail("Restore verification requires storage verification, but STORAGE_ENABLED=false.");
    }

    outputLine("- skipped: STORAGE_ENABLED=false");
    return;
  }

  if (screenshotCount === 0) {
    outputLine("- no screenshot metadata rows found in the restored database");
    return;
  }

  const screenshots = await prisma.tradeScreenshot.findMany({
    select: {
      id: true,
      userId: true,
      tradeId: true,
      storageKey: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: storageSampleSize === "all" ? undefined : storageSampleSize,
  });

  const s3 = createStorageClient();
  const missingKeys = [];
  const invalidMappings = [];

  for (const screenshot of screenshots) {
    const expectedPrefix = `users/${screenshot.userId}/trades/${screenshot.tradeId}/`;

    if (!screenshot.storageKey.startsWith(expectedPrefix)) {
      invalidMappings.push(`${screenshot.id}: ${screenshot.storageKey}`);
      continue;
    }

    try {
      await s3.send(
        new HeadObjectCommand({
          Bucket: env.STORAGE_BUCKET,
          Key: screenshot.storageKey,
        }),
      );
    } catch (error) {
      const statusCode =
        typeof error === "object" && error !== null && "$metadata" in error
          ? ((error).$metadata?.httpStatusCode ?? null)
          : null;
      const errorName =
        typeof error === "object" && error !== null && "name" in error
          ? String((error).name)
          : "";

      if (statusCode === 404 || errorName === "NotFound" || errorName === "NoSuchKey") {
        missingKeys.push(`${screenshot.id}: ${screenshot.storageKey}`);
        continue;
      }

      throw error;
    }
  }

  outputLine(`- checked screenshot rows: ${screenshots.length.toLocaleString("en-US")}`);

  if (invalidMappings.length > 0) {
    fail(
      "Restore verification found screenshot rows with invalid storage-key prefixes.",
      invalidMappings.join("\n"),
    );
  }

  if (missingKeys.length > 0) {
    fail(
      "Restore verification found screenshot metadata rows whose objects are missing from storage.",
      missingKeys.join("\n"),
    );
  }

  outputLine("- screenshot storage keys match the expected user/trade prefix");
  outputLine("- sampled screenshot objects exist in the configured bucket");
}

async function main() {
  if (printEnv) {
    outputHeader("Resolved env");
    outputLine(JSON.stringify({
      nodeEnv: env.NODE_ENV,
      appEnv: env.APP_ENV,
      appUrl: env.APP_URL ?? null,
      apiUrl: env.API_URL ?? null,
      restoreVerifyApiUrl: env.RESTORE_VERIFY_API_URL ?? null,
      storageEnabled: env.STORAGE_ENABLED,
      databaseTarget: describeDatabaseUrl(env.DATABASE_URL),
      directDatabaseTarget: env.DIRECT_URL ? describeDatabaseUrl(env.DIRECT_URL) : null,
    }, null, 2));
    return;
  }

  const databaseSummary = await verifyDatabase();
  await verifyApiHealth();
  await verifyScreenshotStorage(databaseSummary.screenshotCount);

  outputHeader("Result");
  outputLine("Restore verification passed.");
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    fail("Restore verification failed.", message);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
