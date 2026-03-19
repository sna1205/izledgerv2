import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
  description?: string;
  icon?: LucideIcon;
  tone?: "default" | "positive" | "negative" | "primary";
}

const toneClasses = {
  default: "text-foreground",
  positive: "text-success",
  negative: "text-danger",
  primary: "text-primary",
} as const;

export function StatCard({ label, value, subtext, description, icon: Icon, tone = "default" }: StatCardProps) {
  return (
    <div className="surface group relative overflow-hidden p-6">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-90" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-label mb-2">{label}</p>
          <p className={cn("text-3xl font-semibold tabular sm:text-[2rem]", toneClasses[tone])}>
            {value}
          </p>
          {subtext && (
            <p className="mt-2 text-sm text-muted-foreground">{subtext}</p>
          )}
        </div>
        {Icon ? (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-background/72 text-muted-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03)] transition-transform duration-200 group-hover:scale-105 dark:bg-white/[0.03] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
      {description ? (
        <div className="mt-5 border-t border-border/60 pt-4 text-xs text-muted-foreground">
          {description}
        </div>
      ) : null}
    </div>
  );
}
