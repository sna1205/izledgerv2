import { z } from "zod";
import { reviewEmotions, reviewRiskStatuses, reviewRuleStatuses } from "../../config/domain.js";

export const reviewParamsSchema = z.object({
  id: z.string().uuid(),
});

const reviewText = z.string().trim().max(10000).optional().nullable();

export const createReviewSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("daily"),
    reviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    wentWell: reviewText,
    mistakes: reviewText,
    followedRules: z.enum(reviewRuleStatuses).optional().nullable(),
    emotion: z.enum(reviewEmotions).optional().nullable(),
    lessonLearned: reviewText,
    improvementPlan: reviewText,
    disciplineScore: z.coerce.number().int().min(1).max(10).optional().nullable(),
  }),
  z.object({
    type: z.literal("weekly"),
    weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    weekEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    weeklySummary: reviewText,
    biggestWin: reviewText,
    biggestMistake: reviewText,
    riskManagement: z.enum(reviewRiskStatuses).optional().nullable(),
    nextGoal: reviewText,
    weeklyRating: z.coerce.number().int().min(1).max(10).optional().nullable(),
  }),
  z.object({
    type: z.literal("trade"),
    tradeId: z.string().uuid(),
    reviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    lessonLearned: reviewText,
    disciplineScore: z.coerce.number().int().min(1).max(5).optional().nullable(),
    executionRating: z.coerce.number().int().min(1).max(5).optional().nullable(),
    emotionRating: z.coerce.number().int().min(1).max(5).optional().nullable(),
    whatWentWell: reviewText,
    whatWentWrong: reviewText,
    mistakesMade: reviewText,
    improvementForNextTrade: reviewText,
    wouldTakeAgain: z.boolean().optional().nullable(),
  }),
]);

export const updateReviewSchema = z.object({
  type: z.enum(["daily", "weekly", "trade"]).optional(),
  tradeId: z.string().uuid().optional().nullable(),
  reviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  weekEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  wentWell: reviewText,
  mistakes: reviewText,
  followedRules: z.enum(reviewRuleStatuses).optional().nullable(),
  emotion: z.enum(reviewEmotions).optional().nullable(),
  lessonLearned: reviewText,
  improvementPlan: reviewText,
  disciplineScore: z.coerce.number().int().min(1).max(10).optional().nullable(),
  weeklySummary: reviewText,
  biggestWin: reviewText,
  biggestMistake: reviewText,
  riskManagement: z.enum(reviewRiskStatuses).optional().nullable(),
  nextGoal: reviewText,
  weeklyRating: z.coerce.number().int().min(1).max(10).optional().nullable(),
  executionRating: z.coerce.number().int().min(1).max(5).optional().nullable(),
  emotionRating: z.coerce.number().int().min(1).max(5).optional().nullable(),
  whatWentWell: reviewText,
  whatWentWrong: reviewText,
  mistakesMade: reviewText,
  improvementForNextTrade: reviewText,
  wouldTakeAgain: z.boolean().optional().nullable(),
}).refine((value) => Object.keys(value).length > 0, "At least one field is required.");

export const listReviewsQuerySchema = z.object({
  type: z.enum(["daily", "weekly", "trade"]).optional(),
  tradeId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});
