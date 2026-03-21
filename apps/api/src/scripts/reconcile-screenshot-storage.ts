import { prisma } from "../lib/prisma.js";
import { reconcileScreenshotStorage } from "../modules/screenshots/reconciliation.js";

async function main() {
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const prefixArg = process.argv.find((arg) => arg.startsWith("--prefix="));
  const limit = limitArg ? Number.parseInt(limitArg.split("=")[1] ?? "", 10) : undefined;
  const prefix = prefixArg ? prefixArg.slice("--prefix=".length) : undefined;

  const result = await reconcileScreenshotStorage({
    limit,
    objectPrefix: prefix,
  });

  console.log(JSON.stringify(result));
}

main()
  .catch((error) => {
    console.error("Failed to reconcile screenshot storage.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
