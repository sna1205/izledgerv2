import process from "node:process";
import { PrismaClient } from "@prisma/client";
import {
  applyUniquenessRemediationPlan,
  buildUniquenessRemediationPlan,
  loadUniquenessAudit,
  writeUniquenessReport,
} from "./lib/uniqueness-backfill.mjs";

const prisma = new PrismaClient();
const applyChanges = process.argv.includes("--apply");

try {
  const audit = await loadUniquenessAudit(prisma);
  const plan = buildUniquenessRemediationPlan(audit);
  const hasDuplicates =
    audit.setupDuplicates.length > 0
    || audit.dailyReviewDuplicates.length > 0
    || audit.weeklyReviewDuplicates.length > 0;

  if (!hasDuplicates) {
    console.log("No setup or review scope duplicates found.");
    process.exit(0);
  }

  const reportPath = await writeUniquenessReport(audit, plan);

  if (!applyChanges) {
    console.log(`Duplicate remediation plan written to ${reportPath}`);
    console.log("Re-run with --apply to rename setup duplicates and remove duplicate daily/weekly reviews.");
    process.exit(1);
  }

  await applyUniquenessRemediationPlan(prisma, plan);
  const postApplyAudit = await loadUniquenessAudit(prisma);
  const duplicatesRemaining =
    postApplyAudit.setupDuplicates.length > 0
    || postApplyAudit.dailyReviewDuplicates.length > 0
    || postApplyAudit.weeklyReviewDuplicates.length > 0;

  if (duplicatesRemaining) {
    console.error("Duplicate remediation did not fully resolve scope collisions.");
    process.exit(1);
  }

  console.log(`Duplicate remediation applied successfully. Report written to ${reportPath}`);
} finally {
  await prisma.$disconnect();
}
