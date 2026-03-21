import { z } from "zod";

const ISO_CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function parseIsoCalendarDateUtc(value: string) {
  if (!ISO_CALENDAR_DATE_PATTERN.test(value)) {
    return null;
  }

  const [yearPart, monthPart, dayPart] = value.split("-");
  const year = Number.parseInt(yearPart, 10);
  const month = Number.parseInt(monthPart, 10);
  const day = Number.parseInt(dayPart, 10);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

export function isoCalendarDateSchema(message: string) {
  return z.string().regex(ISO_CALENDAR_DATE_PATTERN, message).refine(
    (value) => parseIsoCalendarDateUtc(value) !== null,
    message,
  );
}

export function toUtcMidnightDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = parseIsoCalendarDateUtc(value);

  if (!parsed) {
    throw new Error(`Invalid ISO calendar date: ${value}`);
  }

  return parsed;
}

function addUtcDays(date: Date, days: number) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export function addWeeklyReviewScopeIssues(
  value: {
    weekStart: string;
    weekEnd: string;
  },
  ctx: z.RefinementCtx,
) {
  const weekStart = parseIsoCalendarDateUtc(value.weekStart);
  const weekEnd = parseIsoCalendarDateUtc(value.weekEnd);

  if (!weekStart || !weekEnd) {
    return;
  }

  if (weekStart.getUTCDay() !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["weekStart"],
      message: "Week start must be a Monday.",
    });
  }

  if (weekEnd.getUTCDay() !== 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["weekEnd"],
      message: "Week end must be a Sunday.",
    });
  }

  if (weekEnd.getTime() !== addUtcDays(weekStart, 6).getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["weekEnd"],
      message: "Week end must be the Sunday for the same review week.",
    });
  }
}
