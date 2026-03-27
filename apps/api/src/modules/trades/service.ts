import { Prisma, TradeSession } from "@prisma/client";
import type { TradeResultValue } from "../../config/domain.js";
import { toNumber } from "../../utils/decimal.js";
import { prisma } from "../../lib/prisma.js";
import { getReadUrl } from "../../lib/storage.js";
import { buildPagination } from "../../utils/http.js";
import { AppError } from "../../utils/errors.js";
import { sessionFromDb, sessionToDb } from "../../utils/domain-mappers.js";
import { createTradeChecklistSnapshots, type ChecklistResponseInput } from "../checklist-rules/service.js";
import { deriveTradeDirection } from "./direction.js";
import { deriveTradeResultFromProfit } from "./result.js";

function normalizeTradePair(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

function normalizeClientRequestId(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeCurrencyCode(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized ? normalized : null;
}

function toNullableNumber(value: Prisma.Decimal | string | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return toNumber(value);
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function roundPercent(value: number) {
  return Number(value.toFixed(4));
}

function calculatePlannedRiskReward(input: {
  entry: number;
  stopLoss: number;
  takeProfit: number;
  direction: "Buy" | "Sell";
}) {
  const risk = input.direction === "Buy"
    ? input.entry - input.stopLoss
    : input.stopLoss - input.entry;
  const reward = input.direction === "Buy"
    ? input.takeProfit - input.entry
    : input.entry - input.takeProfit;

  if (risk <= 0) {
    return null;
  }

  return Number(Math.max(0, reward / risk).toFixed(4));
}

function calculateRealizedR(netPnl: number, riskAmount?: number | null) {
  if (!riskAmount || riskAmount <= 0) {
    return null;
  }

  return Number((netPnl / riskAmount).toFixed(4));
}

function getTradeDateStart(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function resolveTradeLifecycleTimestamps(input: {
  date?: string;
  openedAt?: Date;
  closedAt?: Date;
}, existing?: {
  tradeDate: Date;
  openedAt: Date | null;
  closedAt: Date | null;
}) {
  const tradeDateStart = input.date
    ? getTradeDateStart(input.date)
    : existing
      ? new Date(`${existing.tradeDate.toISOString().slice(0, 10)}T00:00:00.000Z`)
      : new Date();
  const openedAt = input.openedAt ?? existing?.openedAt ?? tradeDateStart;
  const closedAt = input.closedAt ?? existing?.closedAt ?? openedAt;

  if (closedAt.getTime() < openedAt.getTime()) {
    throw new AppError(400, "TRADE_LIFECYCLE_INVALID", "Closed time must be on or after opened time.");
  }

  return {
    openedAt,
    closedAt,
  };
}

function buildTradeFxSnapshot(accountCurrency: string | null | undefined, lifecycle: {
  openedAt: Date;
  closedAt: Date;
}) {
  const normalizedAccountCurrency = normalizeCurrencyCode(accountCurrency);

  if (!normalizedAccountCurrency) {
    return {
      accountCurrencySnapshot: null,
      pnlCurrency: null,
      fxRateSnapshot: null,
      fxRateSource: null,
      fxRateTimestamp: null,
    };
  }

  return {
    accountCurrencySnapshot: normalizedAccountCurrency,
    pnlCurrency: normalizedAccountCurrency,
    fxRateSnapshot: 1,
    fxRateSource: "account_currency_snapshot",
    fxRateTimestamp: lifecycle.closedAt,
  };
}

function resolveTradeFinancials(input: {
  quantity?: number | null;
  lotSize?: number | null;
  exitPrice?: number | null;
  fees?: number | null;
  riskAmount?: number | null;
  riskPercent?: number | null;
  profit?: number;
}, existing?: {
  quantity: number | null;
  lotSize: number | null;
  exitPrice: number | null;
  fees: number | null;
  riskAmount: number | null;
  riskPercent: number | null;
  grossPnl: number | null;
  netPnl: number | null;
  profit: number;
}, accountBalance?: number | null, options?: {
  recalculateRiskPercentFromStoredAmount?: boolean;
}) {
  const resolvedNetPnl = input.profit ?? existing?.netPnl ?? existing?.profit;

  if (resolvedNetPnl === undefined) {
    throw new AppError(400, "TRADE_NET_PNL_REQUIRED", "Profit is required.");
  }

  const resolvedFees = input.fees !== undefined ? input.fees : existing?.fees ?? null;
  const canonicalNetPnl = roundMoney(resolvedNetPnl);
  const resolvedGrossPnl = resolvedFees !== null ? roundMoney(canonicalNetPnl + resolvedFees) : null;
  const riskFieldsTouched = input.riskAmount !== undefined || input.riskPercent !== undefined;

  let resolvedRiskAmount: number | null;
  let resolvedRiskPercent: number | null;

  if (input.riskAmount === null || (input.riskAmount === undefined && input.riskPercent === null)) {
    resolvedRiskAmount = null;
    resolvedRiskPercent = null;
  } else if (input.riskAmount !== undefined && input.riskAmount !== null) {
    resolvedRiskAmount = input.riskAmount;
    resolvedRiskPercent = accountBalance && accountBalance > 0
      ? roundPercent((resolvedRiskAmount / accountBalance) * 100)
      : null;
  } else if (input.riskPercent !== undefined && input.riskPercent !== null) {
    if (!accountBalance || accountBalance <= 0) {
      throw new AppError(
        400,
        "TRADE_RISK_AMOUNT_REQUIRED",
        "Risk amount is required when the selected account balance is zero or unavailable.",
      );
    }

    resolvedRiskAmount = roundMoney(accountBalance * (input.riskPercent / 100));
    resolvedRiskPercent = roundPercent((resolvedRiskAmount / accountBalance) * 100);
  } else if (riskFieldsTouched) {
    resolvedRiskAmount = null;
    resolvedRiskPercent = null;
  } else if (options?.recalculateRiskPercentFromStoredAmount && existing?.riskAmount !== null && existing?.riskAmount !== undefined) {
    resolvedRiskAmount = existing.riskAmount;
    resolvedRiskPercent = accountBalance && accountBalance > 0
      ? roundPercent((resolvedRiskAmount / accountBalance) * 100)
      : null;
  } else {
    resolvedRiskAmount = existing?.riskAmount ?? null;
    resolvedRiskPercent = existing?.riskPercent ?? null;
  }

  return {
    quantity: input.quantity !== undefined ? input.quantity : existing?.quantity ?? null,
    lotSize: input.lotSize !== undefined ? input.lotSize : existing?.lotSize ?? null,
    exitPrice: input.exitPrice !== undefined ? input.exitPrice : existing?.exitPrice ?? null,
    fees: resolvedFees,
    riskAmount: resolvedRiskAmount,
    riskPercent: resolvedRiskPercent,
    grossPnl: resolvedGrossPnl,
    netPnl: canonicalNetPnl,
    profit: canonicalNetPnl,
  };
}

const tradeListInclude = Prisma.validator<Prisma.TradeInclude>()({
  account: true,
  setup: true,
  screenshots: {
    orderBy: {
      sortOrder: "asc" as const,
    },
  },
});

const tradeDetailInclude = Prisma.validator<Prisma.TradeInclude>()({
  ...tradeListInclude,
  checklistResponses: {
    orderBy: {
      sortOrderSnapshot: "asc" as const,
    },
  },
});

type TradeListRecord = Prisma.TradeGetPayload<{ include: typeof tradeListInclude }>;
type TradeDetailRecord = Prisma.TradeGetPayload<{ include: typeof tradeDetailInclude }>;

async function resolveSetup(userId: string, input: {
  setupId?: string | null;
  setup?: string | null;
}) {
  if (input.setupId) {
    const setup = await prisma.setup.findFirst({
      where: {
        id: input.setupId,
        userId,
      },
    });

    if (!setup) {
      throw new AppError(404, "SETUP_NOT_FOUND", "Setup not found.");
    }

    return {
      setupId: setup.id,
      setupNameSnapshot: setup.name,
      setupColorSnapshot: setup.color,
    };
  }

  if (input.setup && input.setup.trim()) {
    const matchedSetup = await prisma.setup.findFirst({
      where: {
        userId,
        name: {
          equals: input.setup,
          mode: "insensitive",
        },
      },
    });

    return {
      setupId: matchedSetup?.id ?? null,
      setupNameSnapshot: matchedSetup?.name ?? input.setup.trim(),
      setupColorSnapshot: matchedSetup?.color ?? null,
    };
  }

  return {
    setupId: null,
    setupNameSnapshot: null,
    setupColorSnapshot: null,
  };
}

async function ensureOwnedAccount(userId: string, accountId: string, options?: {
  allowArchived?: boolean;
}) {
  const account = await prisma.account.findFirst({
    where: {
      id: accountId,
      userId,
    },
  });

  if (!account) {
    throw new AppError(404, "ACCOUNT_NOT_FOUND", "Account not found.");
  }

  if (account.isArchived && !options?.allowArchived) {
    throw new AppError(409, "ACCOUNT_ARCHIVED", "Archived accounts cannot be used for new trades.");
  }

  return account;
}

async function toTradeDto(trade: TradeListRecord | TradeDetailRecord) {
  const netPnl = toNullableNumber(trade.netPnl) ?? toNumber(trade.profit);
  const riskAmount = toNullableNumber(trade.riskAmount);
  const plannedRR = calculatePlannedRiskReward({
    entry: toNumber(trade.entry),
    stopLoss: toNumber(trade.stopLoss),
    takeProfit: toNumber(trade.takeProfit),
    direction: trade.direction,
  });
  const screenshotAssets = await Promise.all(
    trade.screenshots.map(async (screenshot) => ({
      id: screenshot.id,
      storageKey: screenshot.storageKey,
      sortOrder: screenshot.sortOrder,
      createdAt: screenshot.createdAt.toISOString(),
      url: await getReadUrl(screenshot.storageKey),
    })),
  );

  return {
    id: trade.id,
    date: trade.tradeDate.toISOString().slice(0, 10),
    accountId: trade.accountId,
    clientRequestId: trade.clientRequestId,
    accountCurrency: normalizeCurrencyCode(trade.accountCurrencySnapshot),
    pair: normalizeTradePair(trade.pair),
    direction: trade.direction,
    entry: toNumber(trade.entry),
    stopLoss: toNumber(trade.stopLoss),
    takeProfit: toNumber(trade.takeProfit),
    quantity: toNullableNumber(trade.quantity),
    lotSize: toNullableNumber(trade.lotSize),
    exitPrice: toNullableNumber(trade.exitPrice),
    fees: toNullableNumber(trade.fees),
    riskAmount,
    riskPercent: toNullableNumber(trade.riskPercent),
    grossPnl: toNullableNumber(trade.grossPnl),
    netPnl,
    pnlCurrency: normalizeCurrencyCode(trade.pnlCurrency),
    fxRateSnapshot: toNullableNumber(trade.fxRateSnapshot),
    fxRateSource: trade.fxRateSource ?? null,
    fxRateTimestamp: trade.fxRateTimestamp?.toISOString() ?? null,
    plannedRR,
    realizedR: calculateRealizedR(netPnl, riskAmount),
    profit: netPnl,
    result: trade.result,
    setupId: trade.setupId,
    setup: trade.setupNameSnapshot ?? "",
    setupColor: trade.setupColorSnapshot ?? trade.setup?.color ?? null,
    session: sessionFromDb(trade.session),
    emotion: trade.emotion,
    notes: trade.notes,
    openedAt: trade.openedAt?.toISOString() ?? null,
    closedAt: trade.closedAt?.toISOString() ?? null,
    screenshots: screenshotAssets.map((asset) => asset.url),
    screenshotAssets,
    checklistResponses:
      "checklistResponses" in trade
        ? trade.checklistResponses.map((response) => ({
            id: response.id,
            tradeId: response.tradeId,
            checklistRuleId: response.checklistRuleId,
            ruleTitleSnapshot: response.ruleTitleSnapshot,
            ruleDescriptionSnapshot: response.ruleDescriptionSnapshot,
            isRequiredSnapshot: response.isRequiredSnapshot,
            checked: response.checked,
            note: response.note,
            sortOrderSnapshot: response.sortOrderSnapshot,
            createdAt: response.createdAt.toISOString(),
            updatedAt: response.updatedAt.toISOString(),
          }))
        : undefined,
    createdAt: trade.createdAt.toISOString(),
    updatedAt: trade.updatedAt.toISOString(),
    account: {
      id: trade.account.id,
      name: trade.account.name,
      broker: trade.account.broker,
      type: trade.account.type,
      currency: trade.account.currency,
      isDefault: trade.account.isDefault,
      isArchived: trade.account.isArchived,
    },
  };
}

function buildTradeWhere(userId: string, query: {
  accountId?: string;
  setupId?: string;
  pair?: string;
  dateFrom?: string;
  dateTo?: string;
  direction?: "Buy" | "Sell";
  result?: TradeResultValue;
  session?: "Asia" | "London" | "New York";
  emotion?: "Calm" | "Focused" | "Confident" | "Anxious" | "Frustrated";
  includeDeleted?: boolean;
}) {
  const where: Prisma.TradeWhereInput = {
    userId,
    deletedAt: query.includeDeleted ? undefined : null,
    accountId: query.accountId,
    setupId: query.setupId,
    pair: query.pair
      ? {
          contains: normalizeTradePair(query.pair),
          mode: "insensitive" as const,
        }
      : undefined,
    direction: query.direction,
    result: query.result,
    session: (query.session ? sessionToDb(query.session) : undefined) as TradeSession | null | undefined,
    emotion: query.emotion,
    tradeDate:
      query.dateFrom || query.dateTo
        ? {
            gte: query.dateFrom ? new Date(`${query.dateFrom}T00:00:00.000Z`) : undefined,
            lte: query.dateTo ? new Date(`${query.dateTo}T00:00:00.000Z`) : undefined,
          }
        : undefined,
  };

  return where;
}

async function getOwnedTrade(userId: string, tradeId: string) {
  const trade = await prisma.trade.findFirst({
    where: {
      id: tradeId,
      userId,
      deletedAt: null,
    },
    include: tradeDetailInclude,
  });

  if (!trade) {
    throw new AppError(404, "TRADE_NOT_FOUND", "Trade not found.");
  }

  return trade;
}

async function findActiveTradeByClientRequestId(userId: string, clientRequestId: string) {
  return prisma.trade.findFirst({
    where: {
      userId,
      clientRequestId,
      deletedAt: null,
    },
    include: tradeDetailInclude,
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function listTrades(userId: string, query: {
  accountId?: string;
  setupId?: string;
  pair?: string;
  dateFrom?: string;
  dateTo?: string;
  direction?: "Buy" | "Sell";
  result?: TradeResultValue;
  session?: "Asia" | "London" | "New York";
  emotion?: "Calm" | "Focused" | "Confident" | "Anxious" | "Frustrated";
  page: number;
  pageSize: number;
  sortBy: "date" | "createdAt" | "profit" | "pair";
  sortOrder: "asc" | "desc";
  includeDeleted: boolean;
}) {
  const where = buildTradeWhere(userId, query);
  const orderBy =
    query.sortBy === "date"
      ? [
          { tradeDate: query.sortOrder },
          { closedAt: query.sortOrder },
          { openedAt: query.sortOrder },
          { createdAt: query.sortOrder },
        ]
      : query.sortBy === "createdAt"
        ? { createdAt: query.sortOrder }
        : query.sortBy === "profit"
          ? { profit: query.sortOrder }
          : { pair: query.sortOrder };

  const [total, trades] = await Promise.all([
    prisma.trade.count({ where }),
    prisma.trade.findMany({
      where,
      include: tradeListInclude,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    items: await Promise.all(trades.map(toTradeDto)),
    pagination: buildPagination(query.page, query.pageSize, total),
  };
}

export async function getTrade(userId: string, tradeId: string) {
  const trade = await getOwnedTrade(userId, tradeId);
  return toTradeDto(trade);
}

export async function createTrade(userId: string, input: {
  date: string;
  accountId: string;
  clientRequestId?: string | null;
  pair: string;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  quantity?: number | null;
  lotSize?: number | null;
  exitPrice?: number | null;
  fees?: number | null;
  riskAmount?: number | null;
  riskPercent?: number | null;
  profit: number;
  setupId?: string | null;
  setup?: string | null;
  session?: "Asia" | "London" | "New York" | null;
  emotion?: "Calm" | "Focused" | "Confident" | "Anxious" | "Frustrated" | null;
  notes: string;
  openedAt?: Date;
  closedAt?: Date;
  checklistResponses?: ChecklistResponseInput[];
  checklistScopeMode?: "applicable" | "exact";
}) {
  const normalizedClientRequestId = normalizeClientRequestId(input.clientRequestId);

  if (normalizedClientRequestId) {
    const existingTrade = await findActiveTradeByClientRequestId(userId, normalizedClientRequestId);

    if (existingTrade) {
      return {
        trade: await toTradeDto(existingTrade),
        created: false,
      };
    }
  }

  const account = await ensureOwnedAccount(userId, input.accountId);
  const setup = await resolveSetup(userId, {
    setupId: input.setupId,
    setup: input.setup,
  });
  const financials = resolveTradeFinancials(input, undefined, toNumber(account.balance));
  const derivedDirection = deriveTradeDirection(input.entry, input.stopLoss);
  const derivedResult = deriveTradeResultFromProfit(financials.profit);
  const lifecycle = resolveTradeLifecycleTimestamps(input);
  const fxSnapshot = buildTradeFxSnapshot(account.currency, lifecycle);

  if (derivedDirection === null) {
    throw new AppError(400, "INVALID_TRADE_DIRECTION", "Stop Loss must be above or below Entry to determine trade direction.");
  }

  try {
    const trade = await prisma.$transaction(async (tx) => {
      const createdTrade = await tx.trade.create({
        data: {
          userId,
          accountId: input.accountId,
          clientRequestId: normalizedClientRequestId,
          accountCurrencySnapshot: fxSnapshot.accountCurrencySnapshot,
          pnlCurrency: fxSnapshot.pnlCurrency,
          fxRateSnapshot: fxSnapshot.fxRateSnapshot,
          fxRateSource: fxSnapshot.fxRateSource,
          fxRateTimestamp: fxSnapshot.fxRateTimestamp,
          tradeDate: getTradeDateStart(input.date),
          pair: normalizeTradePair(input.pair),
          direction: derivedDirection,
          entry: input.entry,
          stopLoss: input.stopLoss,
          takeProfit: input.takeProfit,
          quantity: financials.quantity,
          lotSize: financials.lotSize,
          exitPrice: financials.exitPrice,
          fees: financials.fees,
          riskAmount: financials.riskAmount,
          riskPercent: financials.riskPercent,
          grossPnl: financials.grossPnl,
          netPnl: financials.netPnl,
          profit: financials.profit,
          result: derivedResult,
          setupId: setup.setupId,
          setupNameSnapshot: setup.setupNameSnapshot,
          setupColorSnapshot: setup.setupColorSnapshot,
          openedAt: lifecycle.openedAt,
          closedAt: lifecycle.closedAt,
          session: (sessionToDb(input.session) as TradeSession | null | undefined) ?? null,
          emotion: input.emotion ?? null,
          notes: input.notes,
        },
      });

      await createTradeChecklistSnapshots(tx, userId, createdTrade.id, {
        accountId: input.accountId,
        setupId: setup.setupId,
        checklistResponses: input.checklistResponses,
        scopeMode: input.checklistScopeMode,
      });

      const tradeWithRelations = await tx.trade.findUnique({
        where: {
          id: createdTrade.id,
        },
        include: tradeDetailInclude,
      });

      if (!tradeWithRelations) {
        throw new AppError(404, "TRADE_NOT_FOUND", "Trade not found.");
      }

      return tradeWithRelations;
    });

    return {
      trade: await toTradeDto(trade),
      created: true,
    };
  } catch (error) {
    if (normalizedClientRequestId && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existingTrade = await findActiveTradeByClientRequestId(userId, normalizedClientRequestId);

      if (existingTrade) {
        return {
          trade: await toTradeDto(existingTrade),
          created: false,
        };
      }
    }

    throw error;
  }
}

export async function updateTrade(userId: string, tradeId: string, input: {
  date?: string;
  accountId?: string;
  pair?: string;
  entry?: number;
  stopLoss?: number;
  takeProfit?: number;
  quantity?: number | null;
  lotSize?: number | null;
  exitPrice?: number | null;
  fees?: number | null;
  riskAmount?: number | null;
  riskPercent?: number | null;
  profit?: number;
  setupId?: string | null;
  setup?: string | null;
  session?: "Asia" | "London" | "New York" | null;
  emotion?: "Calm" | "Focused" | "Confident" | "Anxious" | "Frustrated" | null;
  notes?: string;
  openedAt?: Date;
  closedAt?: Date;
}) {
  const existingTrade = await getOwnedTrade(userId, tradeId);
  let nextAccountCurrencySnapshot: string | undefined;
  let nextAccountBalance = toNumber(existingTrade.account.balance);
  let nextAccountCurrency = existingTrade.accountCurrencySnapshot ?? existingTrade.account.currency;

  if (input.accountId) {
    const account = await ensureOwnedAccount(userId, input.accountId, {
      allowArchived: input.accountId === existingTrade.accountId,
    });
    nextAccountCurrencySnapshot = account.currency;
    nextAccountBalance = toNumber(account.balance);
    nextAccountCurrency = account.currency;
  }

  const setup =
    input.setupId !== undefined || input.setup !== undefined
      ? await resolveSetup(userId, {
          setupId: input.setupId,
          setup: input.setup,
        })
      : null;
  const nextDirection =
    input.entry !== undefined || input.stopLoss !== undefined
      ? deriveTradeDirection(input.entry ?? toNumber(existingTrade.entry), input.stopLoss ?? toNumber(existingTrade.stopLoss))
      : undefined;
  const existingFinancials = {
    quantity: toNullableNumber(existingTrade.quantity),
    lotSize: toNullableNumber(existingTrade.lotSize),
    exitPrice: toNullableNumber(existingTrade.exitPrice),
    fees: toNullableNumber(existingTrade.fees),
    riskAmount: toNullableNumber(existingTrade.riskAmount),
    riskPercent: toNullableNumber(existingTrade.riskPercent),
    grossPnl: toNullableNumber(existingTrade.grossPnl),
    netPnl: toNullableNumber(existingTrade.netPnl),
    profit: toNumber(existingTrade.profit),
  };
  const nextFinancials = resolveTradeFinancials(input, existingFinancials, nextAccountBalance, {
    recalculateRiskPercentFromStoredAmount: input.accountId !== undefined,
  });
  const nextLifecycle = resolveTradeLifecycleTimestamps(input, {
    tradeDate: existingTrade.tradeDate,
    openedAt: existingTrade.openedAt,
    closedAt: existingTrade.closedAt,
  });
  const nextFxSnapshot = buildTradeFxSnapshot(nextAccountCurrencySnapshot ?? nextAccountCurrency, nextLifecycle);
  const nextResult =
    input.profit !== undefined
    || input.fees !== undefined
      ? deriveTradeResultFromProfit(nextFinancials.profit)
      : undefined;

  if (nextDirection === null) {
    throw new AppError(400, "INVALID_TRADE_DIRECTION", "Stop Loss must be above or below Entry to determine trade direction.");
  }

  const trade = await prisma.trade.update({
    where: { id: tradeId },
    data: {
      tradeDate: input.date ? getTradeDateStart(input.date) : undefined,
      accountId: input.accountId,
      accountCurrencySnapshot: nextFxSnapshot.accountCurrencySnapshot,
      pnlCurrency: nextFxSnapshot.pnlCurrency,
      fxRateSnapshot: nextFxSnapshot.fxRateSnapshot,
      fxRateSource: nextFxSnapshot.fxRateSource,
      fxRateTimestamp: nextFxSnapshot.fxRateTimestamp,
      pair: input.pair === undefined ? undefined : normalizeTradePair(input.pair),
      direction: nextDirection,
      entry: input.entry,
      stopLoss: input.stopLoss,
      takeProfit: input.takeProfit,
      quantity: nextFinancials.quantity,
      lotSize: nextFinancials.lotSize,
      exitPrice: nextFinancials.exitPrice,
      fees: nextFinancials.fees,
      riskAmount: nextFinancials.riskAmount,
      riskPercent: nextFinancials.riskPercent,
      grossPnl: nextFinancials.grossPnl,
      netPnl: nextFinancials.netPnl,
      profit: nextFinancials.profit,
      result: nextResult,
      setupId: setup ? setup.setupId : undefined,
      setupNameSnapshot: setup ? setup.setupNameSnapshot : undefined,
      setupColorSnapshot: setup ? setup.setupColorSnapshot : undefined,
      openedAt: nextLifecycle.openedAt,
      closedAt: nextLifecycle.closedAt,
      session:
        input.session === undefined
          ? undefined
          : ((sessionToDb(input.session) as TradeSession | null | undefined) ?? null),
      emotion: input.emotion === undefined ? undefined : input.emotion,
      notes: input.notes,
    },
    include: tradeDetailInclude,
  });

  return toTradeDto(trade);
}

export async function deleteTrade(userId: string, tradeId: string) {
  await getOwnedTrade(userId, tradeId);

  await prisma.$transaction([
    prisma.trade.update({
      where: { id: tradeId },
      data: {
        deletedAt: new Date(),
      },
    }),
    prisma.tradeShare.updateMany({
      where: {
        tradeId,
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    }),
  ]);
}
