import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { loadNumericIntegrityAudit } from "./lib/numeric-integrity.mjs";

const prisma = new PrismaClient();

const numericConstraints = [
  { table: "accounts", constraint: "accounts_balance_range_chk" },
  { table: "trades", constraint: "trades_entry_range_chk" },
  { table: "trades", constraint: "trades_stop_loss_range_chk" },
  { table: "trades", constraint: "trades_take_profit_range_chk" },
  { table: "trades", constraint: "trades_profit_range_chk" },
  { table: "trades", constraint: "trades_entry_stop_loss_gap_chk" },
];

try {
  const audit = await loadNumericIntegrityAudit(prisma);
  const hasViolations =
    audit.invalidAccountBalances.length > 0
    || audit.invalidTradeNumerics.length > 0
    || audit.zeroRiskTrades.length > 0;

  if (hasViolations) {
    console.error(JSON.stringify({
      error: "NUMERIC_CONSTRAINTS_NOT_READY",
      message: "Cannot validate numeric DB constraints while persisted numeric violations still exist.",
      invalidAccountBalanceRows: audit.invalidAccountBalances.length,
      invalidTradeNumericRows: audit.invalidTradeNumerics.length,
      zeroRiskTradeRows: audit.zeroRiskTrades.length,
    }, null, 2));
    process.exit(1);
  }

  for (const { table, constraint } of numericConstraints) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" VALIDATE CONSTRAINT "${constraint}"`);
  }

  console.log("Validated numeric database constraints.");
} finally {
  await prisma.$disconnect();
}
