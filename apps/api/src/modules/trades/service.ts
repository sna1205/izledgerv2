import { Prisma, TradeSession } from "@prisma/client";
import type { TradeDirectionValue, TradeResultValue } from "../../config/domain.js";
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
    };
  }

  return {
    setupId: null,
    setupNameSnapshot: null,
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
    pair: normalizeTradePair(trade.pair),
    direction: trade.direction,
    entry: toNumber(trade.entry),
    stopLoss: toNumber(trade.stopLoss),
    takeProfit: toNumber(trade.takeProfit),
    profit: toNumber(trade.profit),
    result: trade.result,
    setupId: trade.setupId,
    setup: trade.setupNameSnapshot ?? "",
    setupColor: trade.setup?.color ?? null,
    session: sessionFromDb(trade.session),
    emotion: trade.emotion,
    notes: trade.notes,
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
      ? { tradeDate: query.sortOrder }
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
  pair: string;
  direction?: TradeDirectionValue;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  profit: number;
  result?: TradeResultValue;
  setupId?: string | null;
  setup?: string | null;
  session?: "Asia" | "London" | "New York" | null;
  emotion?: "Calm" | "Focused" | "Confident" | "Anxious" | "Frustrated" | null;
  notes: string;
  checklistResponses?: ChecklistResponseInput[];
  checklistScopeMode?: "applicable" | "exact";
}) {
  await ensureOwnedAccount(userId, input.accountId);
  const setup = await resolveSetup(userId, {
    setupId: input.setupId,
    setup: input.setup,
  });
  const derivedDirection = deriveTradeDirection(input.entry, input.stopLoss);
  const derivedResult = deriveTradeResultFromProfit(input.profit);

  if (derivedDirection === null) {
    throw new AppError(400, "INVALID_TRADE_DIRECTION", "Stop Loss must be above or below Entry to determine trade direction.");
  }

  const trade = await prisma.$transaction(async (tx) => {
    const createdTrade = await tx.trade.create({
      data: {
        userId,
        accountId: input.accountId,
        tradeDate: new Date(`${input.date}T00:00:00.000Z`),
        pair: normalizeTradePair(input.pair),
        direction: derivedDirection,
        entry: input.entry,
        stopLoss: input.stopLoss,
        takeProfit: input.takeProfit,
        profit: input.profit,
        result: derivedResult,
        setupId: setup.setupId,
        setupNameSnapshot: setup.setupNameSnapshot,
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

  return toTradeDto(trade);
}

export async function updateTrade(userId: string, tradeId: string, input: {
  date?: string;
  accountId?: string;
  pair?: string;
  direction?: TradeDirectionValue;
  entry?: number;
  stopLoss?: number;
  takeProfit?: number;
  profit?: number;
  result?: TradeResultValue;
  setupId?: string | null;
  setup?: string | null;
  session?: "Asia" | "London" | "New York" | null;
  emotion?: "Calm" | "Focused" | "Confident" | "Anxious" | "Frustrated" | null;
  notes?: string;
}) {
  const existingTrade = await getOwnedTrade(userId, tradeId);

  if (input.accountId) {
    await ensureOwnedAccount(userId, input.accountId, {
      allowArchived: input.accountId === existingTrade.accountId,
    });
  }

  const setup =
    input.setupId !== undefined || input.setup !== undefined
      ? await resolveSetup(userId, {
          setupId: input.setupId,
          setup: input.setup,
        })
      : null;
  const nextDirection =
    input.entry !== undefined || input.stopLoss !== undefined || input.direction !== undefined
      ? deriveTradeDirection(input.entry ?? toNumber(existingTrade.entry), input.stopLoss ?? toNumber(existingTrade.stopLoss))
      : undefined;
  const nextResult =
    input.profit !== undefined || input.result !== undefined
      ? deriveTradeResultFromProfit(input.profit ?? toNumber(existingTrade.profit))
      : undefined;

  if (nextDirection === null) {
    throw new AppError(400, "INVALID_TRADE_DIRECTION", "Stop Loss must be above or below Entry to determine trade direction.");
  }

  const trade = await prisma.trade.update({
    where: { id: tradeId },
    data: {
      tradeDate: input.date ? new Date(`${input.date}T00:00:00.000Z`) : undefined,
      accountId: input.accountId,
      pair: input.pair === undefined ? undefined : normalizeTradePair(input.pair),
      direction: nextDirection,
      entry: input.entry,
      stopLoss: input.stopLoss,
      takeProfit: input.takeProfit,
      profit: input.profit,
      result: nextResult,
      setupId: setup ? setup.setupId : undefined,
      setupNameSnapshot: setup ? setup.setupNameSnapshot : undefined,
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
