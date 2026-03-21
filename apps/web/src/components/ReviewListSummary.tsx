import { format, parseISO } from "date-fns";
import { CameraOff } from "lucide-react";
import type { Review, Trade } from "@/lib/types";
import { getReviewScope } from "@/lib/reviews";
import { Progress } from "@/components/ui/progress";
import { ProfitDisplay } from "@/components/ProfitDisplay";
import { ResultBadge } from "@/components/ResultBadge";
import { cn } from "@/lib/utils";

function formatReviewTradeDate(value?: string | null) {
  if (!value) {
    return "Trade date";
  }

  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

function describeExecutionQuality(rating?: number | null) {
  if (!rating || rating <= 0) {
    return "Not rated";
  }

  if (rating >= 5) {
    return "Excellent";
  }

  if (rating >= 4) {
    return "Good";
  }

  if (rating >= 3) {
    return "Mixed";
  }

  if (rating >= 2) {
    return "Weak";
  }

  return "Poor";
}

function compactStatus(value?: string | null) {
  if (!value) {
    return "—";
  }

  if (value === "Yes") {
    return "✓";
  }

  if (value === "No") {
    return "✕";
  }

  if (value === "Partially") {
    return "±";
  }

  return value;
}

function compactSession(value?: string | null) {
  if (!value) {
    return "—";
  }

  if (value === "New York") {
    return "NY";
  }

  if (value === "London") {
    return "LDN";
  }

  if (value === "Overlap") {
    return "OVR";
  }

  return value;
}

function InlineMeta({
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

function ReflectionLine({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!value) {
    return null;
  }

  return (
    <p className="text-sm leading-6 text-muted-foreground">
      <span className="font-medium text-foreground">{label}:</span>{" "}
      {value}
    </p>
  );
}

function DailyReviewSummary({ review }: { review: Review }) {
  const takeaway = review.lessonLearned || review.improvementPlan || review.wentWell || review.mistakes;

  return (
    <div className="space-y-3">
      <InlineMeta
        items={[
          `${review.disciplineScore ?? 0}/10`,
          compactStatus(review.followedRules),
          review.emotion ?? "—",
        ]}
      />

      {takeaway ? <p className="text-sm leading-6 text-muted-foreground">{takeaway}</p> : null}
    </div>
  );
}

function WeeklyReviewSummary({ review }: { review: Review }) {
  const rating = review.weeklyRating ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xl font-semibold tracking-tight text-foreground">{rating}/10</p>
          <InlineMeta
            items={[
              compactStatus(review.riskManagement),
              review.nextGoal || "—",
            ]}
            className="mt-1"
          />
        </div>
        <div className="w-full sm:w-40">
          <Progress value={rating * 10} className="h-1.5 bg-muted/70 dark:bg-white/[0.06]" />
        </div>
      </div>

      <div className="space-y-2">
        <ReflectionLine label="Summary" value={review.weeklySummary} />
        <ReflectionLine label="Goal" value={review.nextGoal} />
      </div>
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

  const keyTakeaway = review.lessonLearned
    || review.improvementForNextTrade
    || review.mistakesMade
    || review.whatWentWrong
    || review.whatWentWell;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {trade.pair}
              <span className="font-normal text-muted-foreground"> · {formatReviewTradeDate(trade.date)}</span>
            </h2>
            <ResultBadge result={trade.result} />
          </div>
        </div>
        <ProfitDisplay value={trade.profit} className="text-xl font-semibold sm:text-2xl" />
      </div>

      <div className="border-l-2 border-primary/20 pl-3">
        <p className="text-[15px] leading-7 text-foreground">
          {keyTakeaway || "Add your review insight..."}
        </p>
      </div>

      <InlineMeta
        items={[
          trade.emotion || "—",
          compactSession(trade.session),
          `${review.disciplineScore ?? 0}/5`,
          describeExecutionQuality(review.executionRating),
        ]}
      />

      {(review.mistakesMade || review.whatWentWell || review.whatWentWrong) ? (
        <div className="space-y-2">
          <ReflectionLine label="Mistake" value={review.mistakesMade || review.whatWentWrong} />
          <ReflectionLine label="What went well" value={review.whatWentWell} />
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <InlineMeta
          items={[
            `E ${trade.entry}`,
            `SL ${trade.stopLoss}`,
            `TP ${trade.takeProfit}`,
          ]}
          className="font-mono-price text-[13px]"
        />

        {trade.screenshots[0] ? (
          <div className="group relative h-[68px] w-full overflow-hidden rounded-xl bg-background/60 sm:w-[104px] dark:bg-white/[0.03]">
            <img
              src={trade.screenshots[0]}
              alt={`${trade.pair} screenshot`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-slate-950/0 transition-colors duration-200 group-hover:bg-slate-950/10" />
          </div>
        ) : (
          <div className="flex h-[68px] w-full items-center justify-center rounded-xl border border-dashed border-border/60 text-muted-foreground sm:w-[104px]">
            <CameraOff className="h-4 w-4" />
          </div>
        )}
      </div>
    </div>
  );
}

interface ReviewListSummaryProps {
  review: Review;
  linkedTrade?: Trade | null;
}

export function ReviewListSummary({ review, linkedTrade }: ReviewListSummaryProps) {
  const scope = getReviewScope(review);

  if (scope === "daily") {
    return <DailyReviewSummary review={review} />;
  }

  if (scope === "weekly") {
    return <WeeklyReviewSummary review={review} />;
  }

  return <TradeReviewListSummary review={review} trade={linkedTrade} />;
}
