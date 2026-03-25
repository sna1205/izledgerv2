import { prisma } from "../lib/prisma.js";
import {
  processDueScreenshotCleanupTasks,
  queueExpiredScreenshotUploadCleanup,
} from "../modules/screenshots/reconciliation.js";

async function main() {
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number.parseInt(limitArg.split("=")[1] ?? "", 10) : undefined;

  const queueResult = await queueExpiredScreenshotUploadCleanup({
    limit,
  });
  const processingResult = await processDueScreenshotCleanupTasks({
    limit,
  });

  console.log(JSON.stringify({
    queueResult,
    processingResult,
  }));
}

main()
  .catch((error) => {
    console.error("Failed to run screenshot cleanup.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
