import { Prisma, ReviewType } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { buildPagination, parseOrThrow } from "../../utils/http.js";
import { AppError } from "../../utils/errors.js";
import { createReviewSchema } from "./schemas.js";
import { toNumber } from "../../utils/decimal.js";
import { getReadUrl } from "../../lib/storage.js";
import { sessionFromDb } from "../../utils/domain-mappers.js";

async function buildTradeSnapshot(userId: string, tradeId: string) {
  const trade = await prisma.trade.findFirst({
    where: {
      id: tradeId,
      userId,
      deletedAt: null,
    },
    include: {
      screenshots: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!trade) {
    throw new AppError(404, "TRADE_NOT_FOUND", "Linked trade not found.");
  }

  return {
    id: trade.id,
    date: trade.tradeDate.toISOString().slice(0, 10),
    pair: trade.pair,
    direction: trade.direction,
    entry: toNumber(trade.entry),
    stopLoss: toNumber(trade.stopLoss),
    takeProfit: toNumber(trade.takeProfit),
    profit: toNumber(trade.profit),
    result: trade.result,
    setup: trade.setupNameSnapshot ?? "",
    session: sessionFromDb(trade.session),
    emotion: trade.emotion,
    notes: trade.notes,
    screenshots: trade.screenshots.map((item) => item.storageKey),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

export async function hydrateTradeSnapshot(snapshot: Prisma.JsonValue | null) {
  if (!isRecord(snapshot)) {
    return snapshot;
  }

  const screenshotsValue = snapshot.screenshots;

  if (!Array.isArray(screenshotsValue)) {
    return snapshot;
  }

  const screenshots = await Promise.all(
    screenshotsValue.map(async (item) => {
      if (typeof item !== "string" || isHttpUrl(item)) {
        return item;
      }

      return getReadUrl(item);
    }),
  );

  return {
    ...snapshot,
    screenshots,
  };
}

async function toReviewDto(review: Prisma.ReviewGetPayload<Record<string, never>>) {
  return {
    id: review.id,
    type: review.type,
    reviewScope: review.type,
    tradeId: review.tradeId,
    tradeSnapshot: await hydrateTradeSnapshot(review.tradeSnapshot),
    reviewDate: review.reviewDate?.toISOString().slice(0, 10),
    weekStart: review.weekStart?.toISOString().slice(0, 10),
    weekEnd: review.weekEnd?.toISOString().slice(0, 10),
    wentWell: review.wentWell,
    mistakes: review.mistakes,
    followedRules: review.followedRules,
    emotion: review.emotion,
    lessonLearned: review.lessonLearned,
    improvementPlan: review.improvementPlan,
    disciplineScore: review.disciplineScore,
    weeklySummary: review.weeklySummary,
    biggestWin: review.biggestWin,
    biggestMistake: review.biggestMistake,
    riskManagement: review.riskManagement,
    nextGoal: review.nextGoal,
    weeklyRating: review.weeklyRating,
    executionRating: review.executionRating,
    emotionRating: review.emotionRating,
    whatWentWell: review.whatWentWell,
    whatWentWrong: review.whatWentWrong,
    mistakesMade: review.mistakesMade,
    improvementForNextTrade: review.improvementForNextTrade,
    wouldTakeAgain: review.wouldTakeAgain,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}

async function getOwnedReview(userId: string, reviewId: string) {
  const review = await prisma.review.findFirst({
    where: {
      id: reviewId,
      userId,
    },
  });

  if (!review) {
    throw new AppError(404, "REVIEW_NOT_FOUND", "Review not found.");
  }

  return review;
}

export async function listReviews(userId: string, query: {
  type?: "daily" | "weekly" | "trade";
  tradeId?: string;
  page: number;
  pageSize: number;
  sortBy: "updatedAt" | "createdAt";
  sortOrder: "asc" | "desc";
}) {
  const where = {
    userId,
    type: query.type,
    tradeId: query.tradeId,
  } satisfies Prisma.ReviewWhereInput;
  const orderBy = query.sortBy === "createdAt"
    ? { createdAt: query.sortOrder }
    : { updatedAt: query.sortOrder };

  const [total, reviews] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    items: await Promise.all(reviews.map((review) => toReviewDto(review))),
    pagination: buildPagination(query.page, query.pageSize, total),
  };
}

export async function getReview(userId: string, reviewId: string) {
  const review = await getOwnedReview(userId, reviewId);
  return await toReviewDto(review);
}

export async function createReview(userId: string, input: unknown) {
  const body = parseOrThrow(createReviewSchema, input);

  const tradeSnapshot =
    body.type === "trade" && body.tradeId
      ? await buildTradeSnapshot(userId, body.tradeId)
      : null;

  try {
    const review = await prisma.review.create({
      data: {
        userId,
        type: body.type as ReviewType,
        tradeId: body.type === "trade" ? body.tradeId : null,
        tradeSnapshot: tradeSnapshot ?? Prisma.DbNull,
        reviewDate: "reviewDate" in body && body.reviewDate ? new Date(`${body.reviewDate}T00:00:00.000Z`) : null,
        weekStart: "weekStart" in body && body.weekStart ? new Date(`${body.weekStart}T00:00:00.000Z`) : null,
        weekEnd: "weekEnd" in body && body.weekEnd ? new Date(`${body.weekEnd}T00:00:00.000Z`) : null,
        wentWell: "wentWell" in body ? body.wentWell ?? null : null,
        mistakes: "mistakes" in body ? body.mistakes ?? null : null,
        followedRules: "followedRules" in body ? body.followedRules ?? null : null,
        emotion: "emotion" in body ? body.emotion ?? null : null,
        lessonLearned: "lessonLearned" in body ? body.lessonLearned ?? null : null,
        improvementPlan: "improvementPlan" in body ? body.improvementPlan ?? null : null,
        disciplineScore: "disciplineScore" in body ? body.disciplineScore ?? null : null,
        weeklySummary: "weeklySummary" in body ? body.weeklySummary ?? null : null,
        biggestWin: "biggestWin" in body ? body.biggestWin ?? null : null,
        biggestMistake: "biggestMistake" in body ? body.biggestMistake ?? null : null,
        riskManagement: "riskManagement" in body ? body.riskManagement ?? null : null,
        nextGoal: "nextGoal" in body ? body.nextGoal ?? null : null,
        weeklyRating: "weeklyRating" in body ? body.weeklyRating ?? null : null,
        executionRating: "executionRating" in body ? body.executionRating ?? null : null,
        emotionRating: "emotionRating" in body ? body.emotionRating ?? null : null,
        whatWentWell: "whatWentWell" in body ? body.whatWentWell ?? null : null,
        whatWentWrong: "whatWentWrong" in body ? body.whatWentWrong ?? null : null,
        mistakesMade: "mistakesMade" in body ? body.mistakesMade ?? null : null,
        improvementForNextTrade: "improvementForNextTrade" in body ? body.improvementForNextTrade ?? null : null,
        wouldTakeAgain: "wouldTakeAgain" in body ? body.wouldTakeAgain ?? null : null,
      },
    });

    return await toReviewDto(review);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(409, "TRADE_REVIEW_EXISTS", "This trade already has a review.");
    }

    throw error;
  }
}

export async function updateReview(userId: string, reviewId: string, patch: Record<string, unknown>) {
  const existing = await getOwnedReview(userId, reviewId);
  const merged = {
    ...(await toReviewDto(existing)),
    ...patch,
  };

  const normalized = parseOrThrow(createReviewSchema, merged);

  const tradeSnapshot =
    normalized.type === "trade" && normalized.tradeId
      ? await buildTradeSnapshot(userId, normalized.tradeId)
      : null;

  const review = await prisma.review.update({
    where: {
      id: reviewId,
    },
    data: {
      type: normalized.type as ReviewType,
      tradeId: normalized.type === "trade" ? normalized.tradeId : null,
      tradeSnapshot: tradeSnapshot ?? Prisma.DbNull,
      reviewDate: "reviewDate" in normalized && normalized.reviewDate ? new Date(`${normalized.reviewDate}T00:00:00.000Z`) : null,
      weekStart: "weekStart" in normalized && normalized.weekStart ? new Date(`${normalized.weekStart}T00:00:00.000Z`) : null,
      weekEnd: "weekEnd" in normalized && normalized.weekEnd ? new Date(`${normalized.weekEnd}T00:00:00.000Z`) : null,
      wentWell: "wentWell" in normalized ? normalized.wentWell ?? null : null,
      mistakes: "mistakes" in normalized ? normalized.mistakes ?? null : null,
      followedRules: "followedRules" in normalized ? normalized.followedRules ?? null : null,
      emotion: "emotion" in normalized ? normalized.emotion ?? null : null,
      lessonLearned: "lessonLearned" in normalized ? normalized.lessonLearned ?? null : null,
      improvementPlan: "improvementPlan" in normalized ? normalized.improvementPlan ?? null : null,
      disciplineScore: "disciplineScore" in normalized ? normalized.disciplineScore ?? null : null,
      weeklySummary: "weeklySummary" in normalized ? normalized.weeklySummary ?? null : null,
      biggestWin: "biggestWin" in normalized ? normalized.biggestWin ?? null : null,
      biggestMistake: "biggestMistake" in normalized ? normalized.biggestMistake ?? null : null,
      riskManagement: "riskManagement" in normalized ? normalized.riskManagement ?? null : null,
      nextGoal: "nextGoal" in normalized ? normalized.nextGoal ?? null : null,
      weeklyRating: "weeklyRating" in normalized ? normalized.weeklyRating ?? null : null,
      executionRating: "executionRating" in normalized ? normalized.executionRating ?? null : null,
      emotionRating: "emotionRating" in normalized ? normalized.emotionRating ?? null : null,
      whatWentWell: "whatWentWell" in normalized ? normalized.whatWentWell ?? null : null,
      whatWentWrong: "whatWentWrong" in normalized ? normalized.whatWentWrong ?? null : null,
      mistakesMade: "mistakesMade" in normalized ? normalized.mistakesMade ?? null : null,
      improvementForNextTrade: "improvementForNextTrade" in normalized ? normalized.improvementForNextTrade ?? null : null,
      wouldTakeAgain: "wouldTakeAgain" in normalized ? normalized.wouldTakeAgain ?? null : null,
    },
  });

  return await toReviewDto(review);
}

export async function deleteReview(userId: string, reviewId: string) {
  await getOwnedReview(userId, reviewId);
  await prisma.review.delete({
    where: { id: reviewId },
  });
}
