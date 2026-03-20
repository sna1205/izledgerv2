import { cn } from "@/lib/utils";
import { formatCurrencyDisplay } from "@/lib/analytics-rendering";

export function ProfitDisplay({ value, className }: { value: number; className?: string }) {
  const formatted = formatCurrencyDisplay(value);
  return (
    <span
      className={cn(
        "font-mono-price numeric-safe inline-block min-w-0 max-w-full text-right text-sm font-semibold",
        value > 0 ? "text-success" : value < 0 ? "text-danger" : "text-muted-foreground",
        className
      )}
    >
      {formatted}
    </span>
  );
}
