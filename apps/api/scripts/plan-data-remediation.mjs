import { PrismaClient } from "@prisma/client";
import { env } from "../src/config/env.ts";
import {
  buildDataIntegrityRemediationPlan,
  loadDataIntegrityAudit,
  writeDataIntegrityReport,
} from "./lib/data-integrity-audit.mjs";

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

function parsePositiveInt(value, fallback) {
  if (value == null || value === "") {
    return fallback;
  }

  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer, received: ${value}`);
  }

  return parsed;
}

const args = parseArgs(process.argv.slice(2));
const sampleSize = parsePositiveInt(args["sample-size"], 25);
const prisma = new PrismaClient({
  log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

try {
  const audit = await loadDataIntegrityAudit(prisma);
  const reportPath = await writeDataIntegrityReport(audit, { sampleSize });
  const plan = buildDataIntegrityRemediationPlan(audit);

  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    reportPath,
    manualQueueCounts: {
      duplicateClientRequestIds: plan.manualReviewQueues.duplicateClientRequestIds.length,
      candidateNaturalKeyDuplicates: plan.manualReviewQueues.candidateNaturalKeyDuplicates.length,
      orphanRowGroups: Object.keys(plan.manualReviewQueues.orphanRows).length,
      fxSnapshotGaps: plan.manualReviewQueues.fxSnapshotGaps.length,
      setupSnapshotGaps: plan.manualReviewQueues.setupSnapshotGaps.length,
      impossibleFinancialValues: plan.manualReviewQueues.impossibleFinancialValues.length,
      impossibleFxValues: plan.manualReviewQueues.impossibleFxValues.length,
    },
    notes: plan.notes,
  }, null, 2));
} finally {
  await prisma.$disconnect();
}
