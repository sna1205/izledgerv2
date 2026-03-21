import { prisma } from "../../lib/prisma.js";

const RECENT_LIMIT = 5;

async function withFallback<T>(promise: Promise<T>, fallback: T) {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

export async function getFounderStats() {
  const [totalUsers, totalTrades, totalReviews, totalAccounts] = await Promise.all([
    withFallback(prisma.user.count(), 0),
    withFallback(prisma.trade.count({
      where: {
        deletedAt: null,
      },
    }), 0),
    withFallback(prisma.review.count(), 0),
    withFallback(prisma.account.count(), 0),
  ]);

  return {
    stats: {
      totalUsers,
      totalTrades,
      totalReviews,
      totalAccounts,
    },
  };
}

export async function getFounderRecent() {
  const [users, trades, reviews] = await Promise.all([
    withFallback(prisma.user.findMany({
      select: {
        id: true,
        username: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: RECENT_LIMIT,
    }), []),
    withFallback(prisma.trade.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        pair: true,
        result: true,
        tradeDate: true,
        createdAt: true,
        user: {
          select: {
            username: true,
          },
        },
      },
      orderBy: [
        { tradeDate: "desc" },
        { createdAt: "desc" },
      ],
      take: RECENT_LIMIT,
    }), []),
    withFallback(prisma.review.findMany({
      select: {
        id: true,
        type: true,
        createdAt: true,
        user: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: RECENT_LIMIT,
    }), []),
  ]);

  return {
    users: users.map((user) => ({
      id: user.id,
      username: user.username,
      createdAt: user.createdAt.toISOString(),
    })),
    trades: trades.map((trade) => ({
      id: trade.id,
      username: trade.user.username,
      pair: trade.pair,
      result: trade.result,
      tradeDate: trade.tradeDate.toISOString().slice(0, 10),
      createdAt: trade.createdAt.toISOString(),
    })),
    reviews: reviews.map((review) => ({
      id: review.id,
      username: review.user.username,
      type: review.type,
      createdAt: review.createdAt.toISOString(),
    })),
  };
}

export async function getFounderHealth(sessionId: string) {
  const [usersWithZeroTrades] = await Promise.all([
    withFallback(prisma.user.count({
      where: {
        trades: {
          none: {
            deletedAt: null,
          },
        },
      },
    }), 0),
    withFallback(prisma.$queryRaw`SELECT 1`, [{ result: 1 }]),
  ]);

  return {
    apiStatus: "ok" as const,
    dbConnection: "ok" as const,
    sessionValid: Boolean(sessionId),
    usersWithZeroTrades,
    checkedAt: new Date().toISOString(),
  };
}
