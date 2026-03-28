import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonShell } from "@/components/skeletons/SkeletonScaffold";

export function EconomicCalendarSkeleton() {
  return (
    <SkeletonShell>
      <div
        className="mx-auto w-full max-w-[1440px] space-y-6"
        role="status"
        aria-busy="true"
        aria-label="Loading economic calendar"
        data-testid="economic-calendar-skeleton"
      >
        <div className="surface space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid h-auto w-full grid-cols-3 gap-2 sm:max-w-[360px]">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-11 rounded-2xl" />
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-3 w-20 rounded-md" />
                  <Skeleton className="h-10 w-full rounded-xl lg:min-w-[140px]" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.95fr)_minmax(300px,1fr)] lg:items-start">
          <div className="order-2 space-y-3 lg:order-1">
            {Array.from({ length: 6 }).map((_, index) => (
              <article key={index} className="surface space-y-3 p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="h-5 w-full max-w-[320px] rounded-md" />
                <div className="grid gap-3 sm:grid-cols-3">
                  <Skeleton className="h-4 w-24 rounded-md" />
                  <Skeleton className="h-4 w-20 rounded-md" />
                  <Skeleton className="h-4 w-28 rounded-md" />
                </div>
              </article>
            ))}
          </div>

          <div className="order-1 space-y-4 lg:order-2">
            <section className="surface space-y-4 p-4 sm:p-5">
              <div className="space-y-2">
                <Skeleton className="h-6 w-32 rounded-md" />
                <Skeleton className="h-4 w-44 rounded-md" />
              </div>
              <Skeleton className="h-20 w-full rounded-2xl" />
              <div className="grid gap-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="rounded-2xl border bg-background/70 px-4 py-4">
                    <Skeleton className="h-3 w-16 rounded-md" />
                    <Skeleton className="mt-2 h-4 w-28 rounded-md" />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </SkeletonShell>
  );
}
