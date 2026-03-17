import { cn } from "@/lib/utils";
import { Review } from "@/lib/types";

interface TradeReviewContentProps {
  review: Review;
  orphaned?: boolean;
}

export function TradeReviewContent({ review, orphaned = false }: TradeReviewContentProps) {
  return (
    <div className="space-y-4">
      {orphaned && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          Linked trade not found. This review was preserved to protect journal history.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-background/70 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Execution</p>
          <p className="mt-2 text-sm font-medium text-foreground">{review.executionRating || 0}/5</p>
        </div>
        <div className="rounded-xl border bg-background/70 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Discipline</p>
          <p className="mt-2 text-sm font-medium text-foreground">{review.disciplineScore || 0}/5</p>
        </div>
        <div className="rounded-xl border bg-background/70 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Emotion</p>
          <p className="mt-2 text-sm font-medium text-foreground">{review.emotionRating || 0}/5</p>
        </div>
        <div className="rounded-xl border bg-background/70 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Take Again?</p>
          <p className="mt-2 text-sm font-medium text-foreground">{review.wouldTakeAgain === false ? "No" : "Yes"}</p>
        </div>
      </div>

      {[
        ["What Went Well", review.whatWentWell],
        ["What Went Wrong", review.whatWentWrong],
        ["Mistakes Made", review.mistakesMade],
        ["Lesson Learned", review.lessonLearned],
        ["Improve Next Time", review.improvementForNextTrade],
      ].map(([label, value]) => (
        <div key={label} className="rounded-xl border bg-background/70 p-4">
          <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          <p className={cn("text-sm leading-relaxed text-foreground", !value && "text-muted-foreground")}>
            {value || "No notes recorded yet."}
          </p>
        </div>
      ))}
    </div>
  );
}
