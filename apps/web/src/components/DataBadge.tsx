import { cn } from "@/lib/utils";

export function DataBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "danger" | "primary" | "warning";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        tone === "neutral" && "border-border/80 bg-background/80 text-muted-foreground dark:bg-white/[0.03]",
        tone === "success" && "border-success/20 bg-success/10 text-success",
        tone === "danger" && "border-danger/20 bg-danger/10 text-danger",
        tone === "primary" && "border-primary/20 bg-primary/10 text-primary",
        tone === "warning" && "border-amber-400/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        className,
      )}
    >
      {children}
    </span>
  );
}
