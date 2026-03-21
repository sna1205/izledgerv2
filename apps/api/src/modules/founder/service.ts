import { prisma } from "../../lib/prisma.js";

const RECENT_LIMIT = 5;

export async function getFounderStats() {
  const [totalUsers, totalTrades, totalReviews, totalAccounts] = await Promise.all([
    prisma.user.count(),
    prisma.trade.count({
      where: {
        deletedAt: null,
      },
    }),
    prisma.review.count(),
    prisma.account.count(),
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
    prisma.user.findMany({
      select: {
        id: true,
        username: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: RECENT_LIMIT,
    }),
    prisma.trade.findMany({
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
    }),
    prisma.review.findMany({
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
    }),
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
    prisma.user.count({
      where: {
        trades: {
          none: {
            deletedAt: null,
          },
        },
      },
    }),
    prisma.$queryRaw`SELECT 1`,
  ]);

  return {
    apiStatus: "ok" as const,
    dbConnection: "ok" as const,
    sessionValid: Boolean(sessionId),
    usersWithZeroTrades,
    checkedAt: new Date().toISOString(),
  };
}
