import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { loadNumericIntegrityAudit } from "./lib/numeric-integrity.mjs";

const prisma = new PrismaClient();

try {
  const audit = await loadNumericIntegrityAudit(prisma);
  console.log(JSON.stringify({
    invalidAccountBalanceRows: audit.invalidAccountBalances.length,
    invalidTradeNumericRows: audit.invalidTradeNumerics.length,
    zeroRiskTradeRows: audit.zeroRiskTrades.length,
    invalidAccountBalances: audit.invalidAccountBalances.map((row) => ({
      id: row.id,
      userId: row.userId,
      balance: row.balance.toString(),
    })),
    invalidTradeNumerics: audit.invalidTradeNumerics.map((row) => ({
      id: row.id,
      userId: row.userId,
      entry: row.entry.toString(),
      stopLoss: row.stopLoss.toString(),
      takeProfit: row.takeProfit.toString(),
      profit: row.profit.toString(),
      deletedAt: row.deletedAt?.toISOString() ?? null,
    })),
    zeroRiskTrades: audit.zeroRiskTrades.map((row) => ({
      id: row.id,
      userId: row.userId,
      entry: row.entry.toString(),
      stopLoss: row.stopLoss.toString(),
      deletedAt: row.deletedAt?.toISOString() ?? null,
    })),
  }, null, 2));
} finally {
  await prisma.$disconnect();
}
