import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyChartState({
  message = "No data yet.",
  variant = "bars",
  className,
}: {
  message?: string;
  variant?: "bars" | "donut";
  className?: string;
}) {
  return (
    <div className={cn("flex h-[260px] flex-col items-center justify-center rounded-2xl border border-border/60 bg-background/60 px-6 text-center dark:bg-[linear-gradient(180deg,hsl(var(--background)/0.76),hsl(var(--secondary)/0.54))]", className)}>
      <div className="relative mb-5 flex h-28 w-full max-w-[280px] items-end justify-center gap-3 opacity-40">
        {variant === "bars" ? (
          <>
            <div className="h-10 w-10 rounded-t-2xl bg-border/70" />
            <div className="h-16 w-10 rounded-t-2xl bg-border/70" />
            <div className="h-20 w-10 rounded-t-2xl bg-border/70" />
            <div className="h-12 w-10 rounded-t-2xl bg-border/70" />
          </>
        ) : (
          <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-[12px] border-border/60">
            <div className="h-16 w-16 rounded-full bg-background" />
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <BarChart3 className="h-4 w-4" />
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}
