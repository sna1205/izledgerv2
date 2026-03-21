import { cn } from "@/lib/utils";
import { Result } from "@/lib/types";

export function ResultBadge({ result }: { result: Result }) {
  const tone =
    result === "Win"
      ? "border-success/20 bg-success/10 text-success"
      : result === "Loss"
        ? "border-danger/20 bg-danger/10 text-danger"
        : "border-border bg-muted/60 text-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        tone,
      )}
    >
      {result}
    </span>
  );
}
