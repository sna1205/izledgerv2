import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const numericBounds = {
  maxAccountBalance: "999999999999.99",
  maxTradePrice: "1000000000",
  maxTradeProfitAbs: "999999999999.99",
};

function toDecimalString(value) {
  if (value == null) {
    return null;
  }

  return typeof value === "string" ? value : value.toString();
}

function toAuditSummary(audit) {
  return {
    invalidAccountBalances: audit.invalidAccountBalances.map((row) => ({
      id: row.id,
      userId: row.userId,
      balance: toDecimalString(row.balance),
    })),
    invalidTradeNumerics: audit.invalidTradeNumerics.map((row) => ({
      id: row.id,
      userId: row.userId,
      entry: toDecimalString(row.entry),
      stopLoss: toDecimalString(row.stopLoss),
      takeProfit: toDecimalString(row.takeProfit),
      profit: toDecimalString(row.profit),
      deletedAt: row.deletedAt?.toISOString() ?? null,
    })),
    zeroRiskTrades: audit.zeroRiskTrades.map((row) => ({
      id: row.id,
      userId: row.userId,
      entry: toDecimalString(row.entry),
      stopLoss: toDecimalString(row.stopLoss),
      deletedAt: row.deletedAt?.toISOString() ?? null,
    })),
  };
}

export async function loadNumericIntegrityAudit(prisma) {
  const [invalidAccountBalances, invalidTradeNumerics, zeroRiskTrades] = await Promise.all([
    prisma.account.findMany({
      where: {
        OR: [
          { balance: { lt: 0 } },
          { balance: { gt: numericBounds.maxAccountBalance } },
        ],
      },
      select: {
        id: true,
        userId: true,
        balance: true,
      },
      orderBy: [
        { userId: "asc" },
        { createdAt: "asc" },
      ],
    }),
    prisma.trade.findMany({
      where: {
        OR: [
          { entry: { lte: 0 } },
          { entry: { gt: numericBounds.maxTradePrice } },
          { stopLoss: { lte: 0 } },
          { stopLoss: { gt: numericBounds.maxTradePrice } },
          { takeProfit: { lte: 0 } },
          { takeProfit: { gt: numericBounds.maxTradePrice } },
          { profit: { lt: `-${numericBounds.maxTradeProfitAbs}` } },
          { profit: { gt: numericBounds.maxTradeProfitAbs } },
        ],
      },
      select: {
        id: true,
        userId: true,
        entry: true,
        stopLoss: true,
        takeProfit: true,
        profit: true,
        deletedAt: true,
      },
      orderBy: [
        { userId: "asc" },
        { createdAt: "asc" },
      ],
    }),
    prisma.$queryRaw`
      SELECT id, user_id AS "userId", entry, stop_loss AS "stopLoss", deleted_at AS "deletedAt"
      FROM trades
      WHERE entry = stop_loss
      ORDER BY user_id ASC, created_at ASC
    `,
  ]);

  return {
    invalidAccountBalances,
    invalidTradeNumerics,
    zeroRiskTrades,
  };
}

export async function writeNumericIntegrityReport(audit, options = {}) {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const reportDir = options.reportDir ?? path.resolve(scriptDir, "../../prisma/backfill-reports");
  await fs.mkdir(reportDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(reportDir, `${timestamp}-numeric-integrity-report.json`);
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      invalidAccountBalanceRows: audit.invalidAccountBalances.length,
      invalidTradeNumericRows: audit.invalidTradeNumerics.length,
      zeroRiskTradeRows: audit.zeroRiskTrades.length,
    },
    details: toAuditSummary(audit),
    remediationNotes: [
      "Automatic clamping of persisted financial values is intentionally disabled.",
      "Correct invalid balances and trade prices/profit from the source of truth before validating constraints.",
      "Trades with entry equal to stop loss must be corrected manually because they break risk calculations.",
    ],
  };

  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  return reportPath;
}
