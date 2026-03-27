import process from "node:process";
import { PrismaClient } from "@prisma/client";
import { env } from "../src/config/env.ts";
import {
  loadNumericIntegrityAudit,
  writeNumericIntegrityReport,
} from "./lib/numeric-integrity.mjs";

const prisma = new PrismaClient({
  log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
const applyChanges = process.argv.includes("--apply");

try {
  const audit = await loadNumericIntegrityAudit(prisma);
  const hasViolations =
    audit.invalidAccountBalances.length > 0
    || audit.invalidTradeNumerics.length > 0
    || audit.zeroRiskTrades.length > 0;

  if (!hasViolations) {
    console.log("No persisted numeric violations found.");
    process.exit(0);
  }

  const reportPath = await writeNumericIntegrityReport(audit);

  if (applyChanges) {
    console.error(
      `Automatic numeric remediation is disabled for persisted financial rows. Review ${reportPath} and correct the source data explicitly before validating constraints.`,
    );
    process.exit(1);
  }

  console.log(`Numeric integrity report written to ${reportPath}`);
  console.log("Re-run with --apply only after you have decided on a manual remediation plan. This script will still refuse to clamp financial history automatically.");
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
