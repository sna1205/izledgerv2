import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

function toPlainValue(value) {
  if (value == null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => toPlainValue(item));
  }

  if (typeof value === "object" && typeof value.toString === "function") {
    const tag = value.constructor?.name;

    if (tag === "Decimal" || tag === "ObjectId") {
      return value.toString();
    }
  }

  return value;
}

function serializeRows(rows) {
  return rows.map((row) => Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, toPlainValue(value)]),
  ));
}

function sampleRows(rows, sampleSize) {
  return serializeRows(rows.slice(0, sampleSize));
}

function summarizeGroup(rows, sampleSize) {
  return {
    count: rows.length,
    sample: sampleRows(rows, sampleSize),
    sampled: rows.length > sampleSize,
  };
}

function decimalString(value) {
  return value == null ? null : value.toString();
}

function buildFinancialReasons(row) {
  const reasons = [];
  const riskAmount = row.riskAmount == null ? null : Number(row.riskAmount);
  const riskPercent = row.riskPercent == null ? null : Number(row.riskPercent);
  const quantity = row.quantity == null ? null : Number(row.quantity);
  const lotSize = row.lotSize == null ? null : Number(row.lotSize);
  const fees = row.fees == null ? null : Number(row.fees);
  const profit = Number(row.profit);
  const entry = Number(row.entry);
  const stopLoss = Number(row.stopLoss);
  const grossPnl = row.grossPnl == null ? null : Number(row.grossPnl);
  const netPnl = row.netPnl == null ? null : Number(row.netPnl);

  if (riskAmount != null && riskAmount < 0) {
    reasons.push("negative_risk_amount");
  }

  if (riskPercent != null && (riskPercent < 0 || riskPercent > 100)) {
    reasons.push("risk_percent_out_of_bounds");
  }

  if (quantity != null && quantity <= 0) {
    reasons.push("non_positive_quantity");
  }

  if (lotSize != null && lotSize <= 0) {
    reasons.push("non_positive_lot_size");
  }

  if (fees != null && fees < 0) {
    reasons.push("negative_fees");
  }

  if (grossPnl != null) {
    const expectedGross = fees == null ? profit : profit + fees;

    if (grossPnl !== expectedGross) {
      reasons.push("gross_pnl_mismatch");
    }
  }

  if (netPnl != null && netPnl !== profit) {
    reasons.push("net_pnl_mismatch");
  }

  if (row.result === "Win" && profit <= 0) {
    reasons.push("win_with_non_positive_profit");
  }

  if (row.result === "Loss" && profit >= 0) {
    reasons.push("loss_with_non_negative_profit");
  }

  if (row.result === "Breakeven" && profit !== 0) {
    reasons.push("breakeven_with_non_zero_profit");
  }

  if (row.direction === "Buy" && stopLoss >= entry) {
    reasons.push("buy_direction_with_invalid_stop_loss");
  }

  if (row.direction === "Sell" && stopLoss <= entry) {
    reasons.push("sell_direction_with_invalid_stop_loss");
  }

  if (row.openedAt && row.closedAt && row.closedAt < row.openedAt) {
    reasons.push("closed_before_opened");
  }

  return reasons;
}

function buildFxReasons(row) {
  const reasons = [];
  const fxRateSnapshot = row.fxRateSnapshot == null ? null : Number(row.fxRateSnapshot);
  const accountCurrencySnapshot = typeof row.accountCurrencySnapshot === "string"
    ? row.accountCurrencySnapshot.trim()
    : "";
  const pnlCurrency = typeof row.pnlCurrency === "string"
    ? row.pnlCurrency.trim()
    : "";
  const fxRateSource = typeof row.fxRateSource === "string"
    ? row.fxRateSource.trim()
    : "";

  if (fxRateSnapshot != null && fxRateSnapshot <= 0) {
    reasons.push("non_positive_fx_rate");
  }

  if (row.fxRateSnapshot != null && row.fxRateTimestamp == null) {
    reasons.push("fx_rate_without_timestamp");
  }

  if (row.fxRateSnapshot == null && row.fxRateTimestamp != null) {
    reasons.push("fx_timestamp_without_rate");
  }

  if (row.fxRateSource != null && fxRateSource.length === 0) {
    reasons.push("blank_fx_rate_source");
  }

  if (row.accountCurrencySnapshot != null && accountCurrencySnapshot.length === 0) {
    reasons.push("blank_account_currency_snapshot");
  }

  if (row.pnlCurrency != null && pnlCurrency.length === 0) {
    reasons.push("blank_pnl_currency");
  }

  if (
    accountCurrencySnapshot
    && pnlCurrency
    && accountCurrencySnapshot.toUpperCase() === pnlCurrency.toUpperCase()
    && fxRateSnapshot != null
    && fxRateSnapshot !== 1
  ) {
    reasons.push("same_currency_with_non_unit_fx_rate");
  }

  if (row.closedAt && row.fxRateTimestamp && row.fxRateTimestamp > row.closedAt) {
    reasons.push("fx_timestamp_after_trade_closed");
  }

  return reasons;
}

export async function loadDataIntegrityAudit(prisma) {
  const [
    tradeAccountOwnershipMismatches,
    tradeSetupOwnershipMismatches,
    reviewTradeOwnershipMismatches,
    shareOwnershipMismatches,
    screenshotOwnershipMismatches,
    screenshotUploadOwnershipMismatches,
    checklistRuleScopeMismatches,
    checklistResponseOwnershipMismatches,
    duplicateClientRequestIds,
    candidateNaturalKeyDuplicates,
    fxSnapshotGaps,
    setupSnapshotGaps,
    financialAnomalies,
    fxAnomalies,
  ] = await Promise.all([
    prisma.$queryRaw`
      SELECT
        t.id,
        t.user_id AS "userId",
        t.account_id AS "accountId",
        a.user_id AS "accountUserId",
        t.deleted_at AS "deletedAt"
      FROM trades t
      LEFT JOIN accounts a ON a.id = t.account_id
      WHERE a.id IS NULL OR a.user_id <> t.user_id
      ORDER BY t.created_at ASC
    `,
    prisma.$queryRaw`
      SELECT
        t.id,
        t.user_id AS "userId",
        t.setup_id AS "setupId",
        s.user_id AS "setupUserId",
        t.deleted_at AS "deletedAt"
      FROM trades t
      LEFT JOIN setups s ON s.id = t.setup_id
      WHERE t.setup_id IS NOT NULL AND (s.id IS NULL OR s.user_id <> t.user_id)
      ORDER BY t.created_at ASC
    `,
    prisma.$queryRaw`
      SELECT
        r.id,
        r.user_id AS "userId",
        r.trade_id AS "tradeId",
        t.user_id AS "tradeUserId",
        r.type,
        r.review_date AS "reviewDate"
      FROM reviews r
      LEFT JOIN trades t ON t.id = r.trade_id
      WHERE r.trade_id IS NOT NULL AND (t.id IS NULL OR t.user_id <> r.user_id)
      ORDER BY r.created_at ASC
    `,
    prisma.$queryRaw`
      SELECT
        ts.id,
        ts.user_id AS "userId",
        ts.trade_id AS "tradeId",
        t.user_id AS "tradeUserId",
        ts.is_active AS "isActive"
      FROM trade_shares ts
      LEFT JOIN trades t ON t.id = ts.trade_id
      LEFT JOIN users u ON u.id = ts.user_id
      WHERE t.id IS NULL OR u.id IS NULL OR t.user_id <> ts.user_id
      ORDER BY ts.created_at ASC
    `,
    prisma.$queryRaw`
      SELECT
        s.id,
        s.user_id AS "userId",
        s.trade_id AS "tradeId",
        t.user_id AS "tradeUserId",
        s.storage_key AS "storageKey"
      FROM trade_screenshots s
      LEFT JOIN trades t ON t.id = s.trade_id
      WHERE t.id IS NULL OR t.user_id <> s.user_id
      ORDER BY s.created_at ASC
    `,
    prisma.$queryRaw`
      SELECT
        u.id,
        u.user_id AS "userId",
        u.trade_id AS "tradeId",
        t.user_id AS "tradeUserId",
        u.storage_key AS "storageKey",
        u.completed_at AS "completedAt"
      FROM trade_screenshot_uploads u
      LEFT JOIN trades t ON t.id = u.trade_id
      WHERE t.id IS NULL OR t.user_id <> u.user_id
      ORDER BY u.created_at ASC
    `,
    prisma.$queryRaw`
      SELECT
        cr.id,
        cr.user_id AS "userId",
        cr.scope_type AS "scopeType",
        cr.account_id AS "accountId",
        a.user_id AS "accountUserId",
        cr.setup_id AS "setupId",
        s.user_id AS "setupUserId"
      FROM checklist_rules cr
      LEFT JOIN accounts a ON a.id = cr.account_id
      LEFT JOIN setups s ON s.id = cr.setup_id
      WHERE
        (cr.account_id IS NOT NULL AND (a.id IS NULL OR a.user_id <> cr.user_id))
        OR
        (cr.setup_id IS NOT NULL AND (s.id IS NULL OR s.user_id <> cr.user_id))
      ORDER BY cr.created_at ASC
    `,
    prisma.$queryRaw`
      SELECT
        r.id,
        r.user_id AS "userId",
        r.trade_id AS "tradeId",
        t.user_id AS "tradeUserId",
        r.checklist_rule_id AS "checklistRuleId",
        cr.user_id AS "checklistRuleUserId"
      FROM trade_checklist_responses r
      LEFT JOIN trades t ON t.id = r.trade_id
      LEFT JOIN checklist_rules cr ON cr.id = r.checklist_rule_id
      WHERE
        t.id IS NULL
        OR t.user_id <> r.user_id
        OR (r.checklist_rule_id IS NOT NULL AND cr.id IS NULL)
        OR (cr.id IS NOT NULL AND cr.user_id <> r.user_id)
      ORDER BY r.created_at ASC
    `,
    prisma.$queryRaw`
      SELECT
        user_id AS "userId",
        client_request_id AS "clientRequestId",
        COUNT(*)::int AS "duplicateCount",
        ARRAY_AGG(id ORDER BY created_at ASC) AS "tradeIds"
      FROM trades
      WHERE deleted_at IS NULL AND client_request_id IS NOT NULL AND BTRIM(client_request_id) <> ''
      GROUP BY user_id, client_request_id
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC, user_id ASC, client_request_id ASC
    `,
    prisma.$queryRaw`
      SELECT
        user_id AS "userId",
        account_id AS "accountId",
        pair,
        direction,
        trade_date AS "tradeDate",
        opened_at AS "openedAt",
        closed_at AS "closedAt",
        entry,
        stop_loss AS "stopLoss",
        take_profit AS "takeProfit",
        exit_price AS "exitPrice",
        quantity,
        lot_size AS "lotSize",
        profit,
        result,
        COUNT(*)::int AS "duplicateCount",
        ARRAY_AGG(id ORDER BY created_at ASC) AS "tradeIds"
      FROM trades
      WHERE deleted_at IS NULL
      GROUP BY
        user_id,
        account_id,
        pair,
        direction,
        trade_date,
        opened_at,
        closed_at,
        entry,
        stop_loss,
        take_profit,
        exit_price,
        quantity,
        lot_size,
        profit,
        result
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC, user_id ASC, trade_date DESC, opened_at DESC NULLS LAST
    `,
    prisma.$queryRaw`
      SELECT
        id,
        user_id AS "userId",
        account_currency_snapshot AS "accountCurrencySnapshot",
        pnl_currency AS "pnlCurrency",
        fx_rate_snapshot AS "fxRateSnapshot",
        fx_rate_source AS "fxRateSource",
        fx_rate_timestamp AS "fxRateTimestamp",
        opened_at AS "openedAt",
        closed_at AS "closedAt"
      FROM trades
      WHERE deleted_at IS NULL AND (
        account_currency_snapshot IS NULL
        OR pnl_currency IS NULL
        OR fx_rate_snapshot IS NULL
        OR fx_rate_source IS NULL
        OR fx_rate_timestamp IS NULL
      )
      ORDER BY created_at ASC
    `,
    prisma.$queryRaw`
      SELECT
        id,
        user_id AS "userId",
        setup_id AS "setupId",
        setup_name_snapshot AS "setupNameSnapshot",
        setup_color_snapshot AS "setupColorSnapshot"
      FROM trades
      WHERE deleted_at IS NULL AND setup_id IS NOT NULL AND (
        setup_name_snapshot IS NULL
        OR setup_color_snapshot IS NULL
      )
      ORDER BY created_at ASC
    `,
    prisma.$queryRaw`
      SELECT
        id,
        user_id AS "userId",
        direction,
        entry,
        stop_loss AS "stopLoss",
        quantity,
        lot_size AS "lotSize",
        fees,
        risk_amount AS "riskAmount",
        risk_percent AS "riskPercent",
        gross_pnl AS "grossPnl",
        net_pnl AS "netPnl",
        profit,
        result,
        opened_at AS "openedAt",
        closed_at AS "closedAt"
      FROM trades
      WHERE deleted_at IS NULL AND (
        (risk_amount IS NOT NULL AND risk_amount < 0)
        OR (risk_percent IS NOT NULL AND (risk_percent < 0 OR risk_percent > 100))
        OR (quantity IS NOT NULL AND quantity <= 0)
        OR (lot_size IS NOT NULL AND lot_size <= 0)
        OR (fees IS NOT NULL AND fees < 0)
        OR (gross_pnl IS NOT NULL AND fees IS NOT NULL AND gross_pnl <> profit + fees)
        OR (gross_pnl IS NOT NULL AND fees IS NULL AND gross_pnl <> profit)
        OR (net_pnl IS NOT NULL AND net_pnl <> profit)
        OR (result = 'Win' AND profit <= 0)
        OR (result = 'Loss' AND profit >= 0)
        OR (result = 'Breakeven' AND profit <> 0)
        OR (direction = 'Buy' AND stop_loss >= entry)
        OR (direction = 'Sell' AND stop_loss <= entry)
        OR (opened_at IS NOT NULL AND closed_at IS NOT NULL AND closed_at < opened_at)
      )
      ORDER BY created_at ASC
    `,
    prisma.$queryRaw`
      SELECT
        id,
        user_id AS "userId",
        account_currency_snapshot AS "accountCurrencySnapshot",
        pnl_currency AS "pnlCurrency",
        fx_rate_snapshot AS "fxRateSnapshot",
        fx_rate_source AS "fxRateSource",
        fx_rate_timestamp AS "fxRateTimestamp",
        opened_at AS "openedAt",
        closed_at AS "closedAt"
      FROM trades
      WHERE deleted_at IS NULL AND (
        (fx_rate_snapshot IS NOT NULL AND fx_rate_snapshot <= 0)
        OR (fx_rate_snapshot IS NOT NULL AND fx_rate_timestamp IS NULL)
        OR (fx_rate_snapshot IS NULL AND fx_rate_timestamp IS NOT NULL)
        OR (fx_rate_source IS NOT NULL AND BTRIM(fx_rate_source) = '')
        OR (account_currency_snapshot IS NOT NULL AND BTRIM(account_currency_snapshot) = '')
        OR (pnl_currency IS NOT NULL AND BTRIM(pnl_currency) = '')
        OR (
          account_currency_snapshot IS NOT NULL
          AND pnl_currency IS NOT NULL
          AND UPPER(account_currency_snapshot) = UPPER(pnl_currency)
          AND fx_rate_snapshot IS NOT NULL
          AND fx_rate_snapshot <> 1
        )
        OR (closed_at IS NOT NULL AND fx_rate_timestamp IS NOT NULL AND fx_rate_timestamp > closed_at)
      )
      ORDER BY created_at ASC
    `,
  ]);

  return {
    orphanRows: {
      tradeAccountOwnershipMismatches,
      tradeSetupOwnershipMismatches,
      reviewTradeOwnershipMismatches,
      shareOwnershipMismatches,
      screenshotOwnershipMismatches,
      screenshotUploadOwnershipMismatches,
      checklistRuleScopeMismatches,
      checklistResponseOwnershipMismatches,
    },
    duplicateTrades: {
      duplicateClientRequestIds,
      candidateNaturalKeyDuplicates,
    },
    nullCriticalSnapshots: {
      fxSnapshotGaps,
      setupSnapshotGaps,
    },
    impossibleFinancialValues: financialAnomalies.map((row) => ({
      ...row,
      reasons: buildFinancialReasons(row),
    })),
    impossibleFxValues: fxAnomalies.map((row) => ({
      ...row,
      reasons: buildFxReasons(row),
    })),
  };
}

export function summarizeDataIntegrityAudit(audit, options = {}) {
  const sampleSize = Number.isInteger(options.sampleSize) && options.sampleSize > 0
    ? options.sampleSize
    : 25;

  const orphanSummary = Object.fromEntries(
    Object.entries(audit.orphanRows).map(([key, rows]) => [key, summarizeGroup(rows, sampleSize)]),
  );

  const duplicateSummary = Object.fromEntries(
    Object.entries(audit.duplicateTrades).map(([key, rows]) => [key, summarizeGroup(rows, sampleSize)]),
  );

  const snapshotSummary = Object.fromEntries(
    Object.entries(audit.nullCriticalSnapshots).map(([key, rows]) => [key, summarizeGroup(rows, sampleSize)]),
  );

  return {
    summary: {
      orphanRowCount: Object.values(audit.orphanRows).reduce((total, rows) => total + rows.length, 0),
      duplicateTradeGroupCount: Object.values(audit.duplicateTrades).reduce((total, rows) => total + rows.length, 0),
      nullCriticalSnapshotCount: Object.values(audit.nullCriticalSnapshots).reduce((total, rows) => total + rows.length, 0),
      impossibleFinancialValueCount: audit.impossibleFinancialValues.length,
      impossibleFxValueCount: audit.impossibleFxValues.length,
    },
    details: {
      orphanRows: orphanSummary,
      duplicateTrades: duplicateSummary,
      nullCriticalSnapshots: snapshotSummary,
      impossibleFinancialValues: summarizeGroup(audit.impossibleFinancialValues, sampleSize),
      impossibleFxValues: summarizeGroup(audit.impossibleFxValues, sampleSize),
    },
  };
}

export function buildDataIntegrityRemediationPlan(audit) {
  return {
    manualReviewQueues: {
      duplicateClientRequestIds: serializeRows(audit.duplicateTrades.duplicateClientRequestIds).map((group) => ({
        ...group,
        recommendation: "Review the grouped trades and keep exactly one active row per user/clientRequestId before enabling stricter rollout gates.",
      })),
      candidateNaturalKeyDuplicates: serializeRows(audit.duplicateTrades.candidateNaturalKeyDuplicates).map((group) => ({
        ...group,
        recommendation: "Treat these as candidate duplicates only. Confirm with business context before deleting or soft-deleting any row.",
      })),
      orphanRows: Object.fromEntries(
        Object.entries(audit.orphanRows).map(([key, rows]) => [key, serializeRows(rows).map((row) => ({
          ...row,
          recommendation: "Repair the ownership/reference mismatch first; do not auto-delete unless the row is provably redundant.",
        }))]),
      ),
      fxSnapshotGaps: serializeRows(audit.nullCriticalSnapshots.fxSnapshotGaps).map((row) => ({
        ...row,
        recommendation: "Backfill historical snapshot fields from audited sources, or mark the trade as unknown rather than silently inferring current FX data.",
      })),
      setupSnapshotGaps: serializeRows(audit.nullCriticalSnapshots.setupSnapshotGaps).map((row) => ({
        ...row,
        recommendation: "Backfill setup snapshots only after confirming the original trade-era setup metadata is still known.",
      })),
      impossibleFinancialValues: serializeRows(audit.impossibleFinancialValues).map((row) => ({
        ...row,
        recommendation: "Correct the persisted trade facts from source evidence before tightening constraints.",
      })),
      impossibleFxValues: serializeRows(audit.impossibleFxValues).map((row) => ({
        ...row,
        recommendation: "Correct or explicitly mark bad FX snapshots before trusting analytics or historical account-currency reporting.",
      })),
    },
    automaticActions: [],
    notes: [
      "This plan is intentionally non-destructive.",
      "No automatic deletions are proposed because duplicate-trade and orphan cleanup are not provably safe without production review.",
      "Use these findings to prepare reviewed SQL or application-level remediation once real DB access is available.",
    ],
  };
}

export async function writeDataIntegrityReport(audit, options = {}) {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const reportDir = options.reportDir ?? path.resolve(scriptDir, "../../prisma/backfill-reports");
  const sampleSize = Number.isInteger(options.sampleSize) && options.sampleSize > 0
    ? options.sampleSize
    : 25;

  await fs.mkdir(reportDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(reportDir, `${timestamp}-data-integrity-audit.json`);
  const report = {
    generatedAt: new Date().toISOString(),
    ...summarizeDataIntegrityAudit(audit, { sampleSize }),
    remediationPlan: buildDataIntegrityRemediationPlan(audit),
  };

  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  return reportPath;
}
