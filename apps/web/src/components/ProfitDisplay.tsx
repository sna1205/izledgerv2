import { cn } from "@/lib/utils";

export function ProfitDisplay({ value, className }: { value: number; className?: string }) {
  const formatted = value >= 0 ? `+$${value.toFixed(2)}` : `-$${Math.abs(value).toFixed(2)}`;
  return (
    <span
      className={cn(
        "font-mono-price text-sm font-semibold",
        value > 0 ? "text-success" : value < 0 ? "text-danger" : "text-muted-foreground",
        className
      )}
    >
      {formatted}
    </span>
  );
}
