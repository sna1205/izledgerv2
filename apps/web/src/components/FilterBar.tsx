import type { ReactNode } from "react";
import { cn } from "@/utils/class-names";

export function FilterBar({
  children,
  meta,
  className,
}: {
  children: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("surface p-4", className)}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {children}
        </div>
        {meta ? (
          <div className="surface-muted flex min-h-10 items-center px-4 text-sm text-muted-foreground xl:min-w-[180px] xl:justify-center">
            {meta}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function FilterField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-2", className)}>
      <p className="text-label">{label}</p>
      {children}
    </div>
  );
}
