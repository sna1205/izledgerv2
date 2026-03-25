import { z } from "zod";
import { reviewEmotions, reviewRiskStatuses, reviewRuleStatuses } from "../../config/domain.js";
import { boundedIntSchema, numericBounds } from "../../utils/validation.js";
import { addWeeklyReviewScopeIssues, isoCalendarDateSchema, parseIsoCalendarDateUtc } from "../../utils/date-validation.js";

export const reviewParamsSchema = z.object({
  id: z.string().uuid(),
});

const reviewText = z.string().trim().max(10000).optional().nullable();
const dailyScoreSchema = boundedIntSchema(1, 10).optional().nullable();
const tradeScoreSchema = boundedIntSchema(1, 5).optional().nullable();
const reviewDateSchema = isoCalendarDateSchema("Invalid review date");
const weekStartSchema = isoCalendarDateSchema("Invalid week start date");
const weekEndSchema = isoCalendarDateSchema("Invalid week end date");

const dailyReviewSchema = z.object({
  type: z.literal("daily"),
  reviewDate: reviewDateSchema,
  wentWell: reviewText,
  mistakes: reviewText,
  followedRules: z.enum(reviewRuleStatuses).optional().nullable(),
  emotion: z.enum(reviewEmotions).optional().nullable(),
  lessonLearned: reviewText,
  improvementPlan: reviewText,
  disciplineScore: dailyScoreSchema,
});

const weeklyReviewSchema = z.object({
  type: z.literal("weekly"),
  weekStart: weekStartSchema,
  weekEnd: weekEndSchema,
  weeklySummary: reviewText,
  biggestWin: reviewText,
  biggestMistake: reviewText,
  riskManagement: z.enum(reviewRiskStatuses).optional().nullable(),
  nextGoal: reviewText,
  weeklyRating: dailyScoreSchema,
});

const tradeReviewSchema = z.object({
  type: z.literal("trade"),
  tradeId: z.string().uuid(),
  reviewDate: reviewDateSchema.optional().nullable(),
  lessonLearned: reviewText,
  disciplineScore: tradeScoreSchema,
  executionRating: tradeScoreSchema,
  emotionRating: tradeScoreSchema,
  whatWentWell: reviewText,
  whatWentWrong: reviewText,
  mistakesMade: reviewText,
  improvementForNextTrade: reviewText,
  wouldTakeAgain: z.boolean().optional().nullable(),
});

export const createReviewSchema = z.discriminatedUnion("type", [
  dailyReviewSchema,
  weeklyReviewSchema,
  tradeReviewSchema,
]).superRefine((value, ctx) => {
  if (value.type === "weekly") {
    addWeeklyReviewScopeIssues(value, ctx);
  }
});

export const updateReviewSchema = z.object({
  type: z.enum(["daily", "weekly", "trade"]).optional(),
  tradeId: z.string().uuid().optional().nullable(),
  reviewDate: reviewDateSchema.optional().nullable(),
  weekStart: weekStartSchema.optional().nullable(),
  weekEnd: weekEndSchema.optional().nullable(),
  wentWell: reviewText,
  mistakes: reviewText,
  followedRules: z.enum(reviewRuleStatuses).optional().nullable(),
  emotion: z.enum(reviewEmotions).optional().nullable(),
  lessonLearned: reviewText,
  improvementPlan: reviewText,
  disciplineScore: dailyScoreSchema,
  weeklySummary: reviewText,
  biggestWin: reviewText,
  biggestMistake: reviewText,
  riskManagement: z.enum(reviewRiskStatuses).optional().nullable(),
  nextGoal: reviewText,
  weeklyRating: dailyScoreSchema,
  executionRating: tradeScoreSchema,
  emotionRating: tradeScoreSchema,
  whatWentWell: reviewText,
  whatWentWrong: reviewText,
  mistakesMade: reviewText,
  improvementForNextTrade: reviewText,
  wouldTakeAgain: z.boolean().optional().nullable(),
}).refine((value) => Object.keys(value).length > 0, "At least one field is required.").superRefine((value, ctx) => {
  if (value.weekStart && value.weekEnd) {
    addWeeklyReviewScopeIssues({
      weekStart: value.weekStart,
      weekEnd: value.weekEnd,
    }, ctx);
  }
});

export const listReviewsQuerySchema = z.object({
  type: z.enum(["daily", "weekly", "trade"]).optional(),
  tradeId: z.string().uuid().optional(),
  dateFrom: isoCalendarDateSchema("Invalid review start date").optional(),
  dateTo: isoCalendarDateSchema("Invalid review end date").optional(),
  page: boundedIntSchema(1, numericBounds.maxPage).default(1),
  pageSize: boundedIntSchema(1, numericBounds.maxPageSize).default(20),
  sortBy: z.enum(["updatedAt", "createdAt", "reviewDate", "weekEnd"]).default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).superRefine((value, ctx) => {
  if (!value.dateFrom || !value.dateTo) {
    return;
  }

  const dateFrom = parseIsoCalendarDateUtc(value.dateFrom);
  const dateTo = parseIsoCalendarDateUtc(value.dateTo);

  if (!dateFrom || !dateTo || dateFrom.getTime() <= dateTo.getTime()) {
    return;
  }

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: ["dateTo"],
    message: "Review end date must be on or after the start date.",
  });
});
