import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils/class-names";

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
    <div className="surface min-h-[132px] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-label mb-2">{label}</p>
          <p className={cn("numeric-safe max-w-full text-2xl font-semibold tabular", toneClasses[tone])}>
            {value}
          </p>
          {subtext && (
            <p className="mt-2 text-xs text-muted-foreground">{subtext}</p>
          )}
        </div>
        {Icon ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-background/60 text-muted-foreground">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
      {description ? (
        <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
          {description}
        </div>
      ) : null}
    </div>
  );
}
