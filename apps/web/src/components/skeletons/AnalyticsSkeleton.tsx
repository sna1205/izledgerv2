import { Skeleton } from "@/components/ui/skeleton";
import {
  SkeletonFilterCard,
  SkeletonShell,
  SkeletonStatGrid,
} from "@/components/skeletons/SkeletonScaffold";

export function AnalyticsSkeleton() {
  return (
    <SkeletonShell className="w-full min-w-0">
      <div
        className="space-y-6"
        role="status"
        aria-label="Loading analytics"
        data-testid="analytics-skeleton"
      >
        <div className="sticky top-0 z-20 mb-6 bg-background/95 pb-4 pt-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid h-auto w-full grid-cols-3 gap-2 rounded-2xl sm:w-[320px]">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-11 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-10 w-full rounded-xl lg:w-[220px]" />
          </div>
        </div>

        <SkeletonStatGrid count={4} columnsClassName="grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" />

        <div className="grid gap-6 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <section key={index} className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="mb-4 space-y-2">
                <Skeleton className="h-5 w-36 rounded-md" />
                <Skeleton className="h-4 w-52 rounded-md" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((__, rowIndex) => (
                  <div key={rowIndex} className="rounded-xl border bg-background/70 px-4 py-3">
                    <Skeleton className="h-4 w-28 rounded-md" />
                    <Skeleton className="mt-2 h-3 w-36 rounded-md" />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </SkeletonShell>
  );
}
