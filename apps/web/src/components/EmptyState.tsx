import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/utils/class-names";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("surface soft-grid overflow-hidden px-6 py-12 text-center sm:px-10", className)}>
      <div className="mx-auto flex max-w-md flex-col items-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl border border-border/70 bg-background/90 shadow-sm">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground">{title}</h3>
        {description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p> : null}
        {action ? <div className="mt-6">{action}</div> : null}
      </div>
    </div>
  );
}
