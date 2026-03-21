import { format, parseISO } from "date-fns";
import type { Review, Trade } from "@/lib/types";
import { getReviewScope } from "@/lib/reviews";
import { Progress } from "@/components/ui/progress";
import { ProfitDisplay } from "@/components/ProfitDisplay";
import { formatPrice } from "@/lib/trade-sharing";
import { cn } from "@/lib/utils";

type JudgementTone = "good" | "bad" | "warn";

function formatShortDate(value?: string | null) {
  if (!value) {
    return "Review";
  }

  try {
    return format(parseISO(value), "MMM d");
  } catch {
    return value;
  }
}

function formatWeekWindow(review: Review) {
  if (!review.weekStart || !review.weekEnd) {
    return "Weekly review";
  }

  try {
    return `${format(parseISO(review.weekStart), "MMM d")} - ${format(parseISO(review.weekEnd), "MMM d")}`;
  } catch {
    return "Weekly review";
  }
}

function oneLine(value?: string | null, fallback = "Keep reviewing to sharpen the next decision.") {
  if (!value) {
    return fallback;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  const firstSentence = normalized.split(/(?<=[.!?])\s+/)[0] || normalized;

  if (firstSentence.length <= 92) {
    return firstSentence;
  }

  return `${firstSentence.slice(0, 89).trimEnd()}...`;
}

function compactSession(value?: string | null) {
  if (value === "New York") {
    return "NY";
  }

  if (value === "London") {
    return "LDN";
  }

  if (value === "Asia") {
    return "Asia";
  }

  return value ?? null;
}

function describeDailyDiscipline(score?: number | null) {
  if (score == null) {
    return "Discipline: Unrated";
  }

  if (score >= 8) {
    return "Discipline: High";
  }

  if (score >= 6) {
    return "Discipline: Steady";
  }

  if (score >= 4) {
    return "Discipline: Mixed";
  }

  return "Discipline: Low";
}

function describeWeeklyState(rating?: number | null) {
  if (rating == null) {
    return "Week still taking shape";
  }

  if (rating >= 7) {
    return "Strong week overall";
  }

  if (rating >= 5) {
    return "Solid week overall";
  }

  if (rating >= 4) {
    return "Mixed week overall";
  }

  return "Tough week overall";
}

function getDailyJudgement(review: Review): { tone: JudgementTone; text: string } {
  const score = review.disciplineScore ?? 0;

  if (score >= 8 && review.followedRules === "Yes") {
    return { tone: "good", text: "Good discipline" };
  }

  if (score <= 4 || review.followedRules === "No") {
    return { tone: "bad", text: "Bad discipline control" };
  }

  return { tone: "warn", text: "Warning: discipline felt uneven" };
}

function getWeeklyJudgement(review: Review): { tone: JudgementTone; text: string } {
  if (review.riskManagement === "Yes" && (review.weeklyRating ?? 0) >= 7) {
    return { tone: "good", text: "Good risk consistency" };
  }

  if (review.riskManagement === "No" || (review.weeklyRating ?? 10) <= 4) {
    return { tone: "bad", text: "Bad risk consistency" };
  }

  return { tone: "warn", text: "Warning: risk consistency drifted" };
}

function getTradeJudgement(review: Review): { tone: JudgementTone; text: string } {
  if ((review.executionRating ?? 0) >= 4 || review.whatWentWell) {
    return { tone: "good", text: "Good execution" };
  }

  if ((review.executionRating ?? 5) <= 2 || review.wouldTakeAgain === false) {
    return { tone: "bad", text: "Bad execution drift" };
  }

  return { tone: "warn", text: "Warning: execution had friction" };
}

function MetaRow({
  items,
  className,
}: {
  items: Array<string | null | undefined>;
  className?: string;
}) {
  const visibleItems = items.filter(Boolean) as string[];

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <p className={cn("text-sm leading-6 text-muted-foreground", className)}>
      {visibleItems.map((item, index) => (
        <span key={`${item}-${index}`}>
          {index > 0 ? <span aria-hidden="true"> · </span> : null}
          {item}
        </span>
      ))}
    </p>
  );
}

function JudgementIndicator({
  tone,
  value,
}: {
  tone: JudgementTone;
  value: string;
}) {
  const toneClasses = {
    good: "text-emerald-700 dark:text-emerald-300",
    bad: "text-rose-700 dark:text-rose-300",
    warn: "text-amber-700 dark:text-amber-300",
  } as const;

  const icon = {
    good: "✔",
    bad: "✖",
    warn: "⚠",
  } as const;

  return (
    <p className={cn("text-sm font-medium leading-6", toneClasses[tone])}>
      {icon[tone]} {value}
    </p>
  );
}

function TakeawayLine({
  value,
  fallback,
}: {
  value?: string | null;
  fallback: string;
}) {
  return (
    <p className="text-[15px] font-medium leading-7 text-foreground">
      → {oneLine(value, fallback)}
    </p>
  );
}

function DailyReviewSummary({ review }: { review: Review }) {
  const judgement = getDailyJudgement(review);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-[1.9rem] font-semibold tracking-tight text-foreground">
          {formatShortDate(review.reviewDate)}
        </h2>
        <p className="text-sm text-muted-foreground">
          {review.emotion ? `${review.emotion} session` : "Emotion not captured"}
        </p>
      </div>

      <p className="text-lg font-medium text-foreground">{describeDailyDiscipline(review.disciplineScore)}</p>
      <JudgementIndicator tone={judgement.tone} value={judgement.text} />
      <TakeawayLine
        value={review.mistakes || review.lessonLearned || review.improvementPlan || review.wentWell}
        fallback="Capture the turning point from the day."
      />
    </div>
  );
}

function WeeklyReviewSummary({
  review,
  weeklyDelta,
}: {
  review: Review;
  weeklyDelta?: number | null;
}) {
  const rating = review.weeklyRating ?? 0;
  const judgement = getWeeklyJudgement(review);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-[2rem] font-semibold tracking-tight text-foreground">{rating}/10</h2>
          <p className="text-sm text-muted-foreground">{formatWeekWindow(review)}</p>
        </div>
        {typeof weeklyDelta === "number" ? (
          <p
            className={cn(
              "pt-1 text-xs font-medium",
              weeklyDelta > 0 ? "text-emerald-700 dark:text-emerald-300" : weeklyDelta < 0 ? "text-rose-700 dark:text-rose-300" : "text-muted-foreground",
            )}
          >
            {weeklyDelta > 0 ? "+" : ""}
            {weeklyDelta} vs last week
          </p>
        ) : null}
      </div>

      <p className="text-lg font-medium text-foreground">{describeWeeklyState(rating)}</p>
      <Progress value={rating * 10} className="h-1.5 bg-muted/60 dark:bg-white/[0.06]" />
      <JudgementIndicator tone={judgement.tone} value={judgement.text} />
      <TakeawayLine
        value={review.nextGoal || review.biggestMistake || review.weeklySummary || review.biggestWin}
        fallback="Name the one improvement that carries into next week."
      />
    </div>
  );
}

function TradeReviewListSummary({
  review,
  trade,
}: {
  review: Review;
  trade?: Trade | null;
}) {
  if (!trade) {
    return (
      <p className="text-sm leading-6 text-amber-700 dark:text-amber-300">
        Linked trade not found. This review was preserved to protect journal history.
      </p>
    );
  }

  const judgement = getTradeJudgement(review);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {trade.pair}
            <span className="font-normal text-muted-foreground"> · {formatShortDate(trade.date)}</span>
          </h2>
        </div>
        <ProfitDisplay value={trade.profit} className="text-xl font-semibold sm:text-2xl" />
      </div>

      <JudgementIndicator tone={judgement.tone} value={judgement.text} />
      <TakeawayLine
        value={review.whatWentWrong || review.mistakesMade || review.improvementForNextTrade || review.lessonLearned || review.whatWentWell}
        fallback="Write the one adjustment that changes the replay."
      />
      <MetaRow
        items={[
          trade.emotion || null,
          compactSession(trade.session),
          review.disciplineScore != null ? `${review.disciplineScore}/5` : null,
        ]}
        className="text-[15px] text-muted-foreground"
      />
      <p className="font-mono-price text-xs text-muted-foreground">
        Entry {formatPrice(trade.entry)} | SL {formatPrice(trade.stopLoss)} | TP {formatPrice(trade.takeProfit)}
      </p>
    </div>
  );
}

interface ReviewListSummaryProps {
  review: Review;
  linkedTrade?: Trade | null;
  weeklyDelta?: number | null;
}

export function ReviewListSummary({ review, linkedTrade, weeklyDelta }: ReviewListSummaryProps) {
  const scope = getReviewScope(review);

  if (scope === "daily") {
    return <DailyReviewSummary review={review} />;
  }

  if (scope === "weekly") {
    return <WeeklyReviewSummary review={review} weeklyDelta={weeklyDelta} />;
  }

  return <TradeReviewListSummary review={review} trade={linkedTrade} />;
}
