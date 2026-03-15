import { cn } from "@/lib/utils";
import { Result } from "@/lib/types";

export function ResultBadge({ result }: { result: Result }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        result === "Win"
          ? "bg-success/10 text-success"
          : "bg-danger/10 text-danger"
      )}
    >
      {result}
    </span>
  );
}
