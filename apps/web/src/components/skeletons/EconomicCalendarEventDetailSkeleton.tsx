import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonShell } from "@/components/skeletons/SkeletonScaffold";

export function EconomicCalendarEventDetailSkeleton() {
  return (
    <SkeletonShell>
      <div
        className="mx-auto w-full max-w-[1440px] space-y-6"
        role="status"
        aria-busy="true"
        aria-label="Loading economic calendar event"
        data-testid="economic-calendar-event-detail-skeleton"
      >
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-9 w-36 rounded-xl" />
          <Skeleton className="h-4 w-28 rounded-md" />
        </div>

        <header className="rounded-[1.5rem] border border-border/30 bg-card/40 p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-6 w-[4.5rem] rounded-full" />
                <Skeleton className="h-6 w-14 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-8 w-full max-w-[420px] rounded-md" />
              <Skeleton className="h-4 w-full max-w-[640px] rounded-md" />
              <Skeleton className="h-4 w-full max-w-[520px] rounded-md" />
            </div>
            <div className="min-w-[240px] space-y-3">
              <Skeleton className="h-4 w-40 rounded-md" />
              <Skeleton className="h-4 w-36 rounded-md" />
            </div>
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <section key={index} className="rounded-[1.25rem] border border-border/30 bg-card/35 p-4 shadow-sm">
                <Skeleton className="h-5 w-24 rounded-md" />
                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {Array.from({ length: index === 0 ? 4 : 2 }).map((__, metricIndex) => (
                    <div key={metricIndex} className="rounded-xl border border-border/25 bg-background/40 px-3 py-3">
                      <Skeleton className="h-3 w-16 rounded-md" />
                      <Skeleton className="mt-2 h-4 w-24 rounded-md" />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, index) => (
              <section key={index} className="rounded-[1.25rem] border border-border/30 bg-card/35 p-4 shadow-sm">
                <Skeleton className="h-5 w-28 rounded-md" />
                <div className="mt-3 space-y-3">
                  {Array.from({ length: 3 }).map((__, itemIndex) => (
                    <div key={itemIndex} className="rounded-xl border border-border/25 bg-background/40 px-4 py-3">
                      <Skeleton className="h-4 w-32 rounded-md" />
                      <Skeleton className="mt-2 h-3 w-full max-w-[220px] rounded-md" />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </SkeletonShell>
  );
}
