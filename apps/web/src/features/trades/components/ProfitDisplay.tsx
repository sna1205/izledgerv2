import { cn } from "@/utils/class-names";
import { formatCurrencyDisplay, formatMoneyDisplay } from "@/utils/analytics-rendering";

export function ProfitDisplay({
  value,
  className,
  currency,
}: {
  value: number;
  className?: string;
  currency?: string | null;
}) {
  const formatted = currency
    ? formatMoneyDisplay(value, {
        currency,
        fallback: "0.00",
      })
    : formatCurrencyDisplay(value, {
        fallback: "0.00",
      });
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
