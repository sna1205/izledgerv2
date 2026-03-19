import type { CSSProperties, ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function getStaggerStyle(index: number): CSSProperties {
  return {
    animationDelay: `${index * 70}ms`,
  };
}

export function SkeletonShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("page-enter p-4 sm:p-6", className)}>{children}</div>;
}

export function SkeletonHeader({
  actionWidth = "w-28",
  compact = false,
}: {
  actionWidth?: string;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-2">
        <Skeleton className={cn("h-8 w-40 sm:h-9 sm:w-48", compact && "h-7 w-32")} />
        <Skeleton className="h-4 w-64 max-w-[80vw]" />
      </div>
      <Skeleton className={cn("h-10 w-full rounded-xl sm:w-auto", actionWidth)} />
    </div>
  );
}

export function SkeletonStatGrid({
  count,
  columnsClassName,
}: {
  count: number;
  columnsClassName: string;
}) {
  return (
    <div className={cn("grid gap-4", columnsClassName)}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border bg-card p-5 shadow-sm"
          style={getStaggerStyle(index)}
        >
          <Skeleton className="h-3 w-28 rounded-md" />
          <Skeleton className="mt-4 h-8 w-24 rounded-md" />
          <Skeleton className="mt-3 h-3 w-32 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonFilterCard({
  fields,
  summaryWidth = "w-36",
}: {
  fields: number;
  summaryWidth?: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: fields }).map((_, index) => (
            <div key={index} className="space-y-2" style={getStaggerStyle(index)}>
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
        <Skeleton className={cn("h-12 rounded-2xl xl:min-w-[172px]", summaryWidth)} />
      </div>
    </div>
  );
}

export function SkeletonTabsRow({
  tabsWidth = "sm:max-w-[320px]",
}: {
  tabsWidth?: string;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className={cn("grid h-11 w-full grid-cols-2 gap-2 rounded-2xl", tabsWidth)}>
        <Skeleton className="h-11 rounded-2xl" />
        <Skeleton className="h-11 rounded-2xl" />
      </div>
    </div>
  );
}

export function SkeletonTable({
  rows,
  columns,
}: {
  rows: number;
  columns: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="border-b bg-muted/30 px-4 py-4">
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={index} className="h-3 w-16 rounded-md" />
          ))}
        </div>
      </div>
      <div className="space-y-0">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-3 border-b px-4 py-4 last:border-b-0"
            style={{
              ...getStaggerStyle(rowIndex),
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: columns }).map((__, columnIndex) => (
              <Skeleton
                key={columnIndex}
                className={cn(
                  "h-4 rounded-md",
                  columnIndex === 1 ? "w-24" : "w-full",
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonCardList({
  count,
  className,
  itemClassName = "rounded-2xl border bg-card p-5 shadow-sm",
  renderItem,
}: {
  count: number;
  className?: string;
  itemClassName?: string;
  renderItem?: (index: number) => ReactNode;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={itemClassName} style={getStaggerStyle(index)}>
          {renderItem ? renderItem(index) : (
            <div className="space-y-3">
              <Skeleton className="h-4 w-32 rounded-md" />
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-2/3 rounded-md" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function SkeletonSidebar() {
  return (
    <aside className="hidden w-[280px] shrink-0 border-r bg-sidebar lg:block">
      <div className="flex h-full flex-col justify-between p-4">
        <div className="space-y-5">
          <div className="space-y-2 px-2 py-1">
            <Skeleton className="h-5 w-24 rounded-md" />
            <Skeleton className="h-3 w-20 rounded-md" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-xl px-2 py-2.5" style={getStaggerStyle(index)}>
                <Skeleton className="h-9 w-9 rounded-xl" />
                <Skeleton className="h-4 w-24 rounded-md" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-background/70 px-3 py-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-3 w-16 rounded-md" />
          </div>
        </div>
      </div>
    </aside>
  );
}

export function SkeletonTopBar({
  pageTitleWidth = "w-28",
}: {
  pageTitleWidth?: string;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className={cn("h-4 rounded-md", pageTitleWidth)} />
          <Skeleton className="hidden h-3 w-16 rounded-md sm:block" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>
    </header>
  );
}
