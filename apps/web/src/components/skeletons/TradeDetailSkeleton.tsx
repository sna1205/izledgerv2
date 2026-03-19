import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonCardList, SkeletonShell } from "@/components/skeletons/SkeletonScaffold";

function DetailSectionSkeleton({
  titleWidth,
  metricCount,
}: {
  titleWidth: string;
  metricCount: number;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className={`h-6 ${titleWidth} rounded-md`} />
          <Skeleton className="h-4 w-56 rounded-md" />
        </div>
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: metricCount }).map((_, index) => (
          <div key={index} className="rounded-2xl border bg-background/60 p-4">
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="mt-3 h-5 w-28 rounded-md" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function TradeDetailSkeleton() {
  return (
    <SkeletonShell>
      <div
        className="mx-auto w-full max-w-[1500px] space-y-6"
        role="status"
        aria-label="Loading trade detail"
        data-testid="trade-detail-skeleton"
      >
        <section className="rounded-[28px] border bg-card p-5 shadow-sm sm:p-6 lg:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-5">
              <Skeleton className="h-9 w-32 rounded-xl" />
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-10 w-36 rounded-md" />
                  <Skeleton className="h-7 w-16 rounded-full" />
                  <Skeleton className="h-7 w-24 rounded-full" />
                  <Skeleton className="h-7 w-20 rounded-full" />
                </div>
                <Skeleton className="h-4 w-48 rounded-md" />
                <div className="flex flex-wrap gap-4">
                  <Skeleton className="h-4 w-24 rounded-md" />
                  <Skeleton className="h-4 w-40 rounded-md" />
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col gap-4 xl:max-w-[420px] xl:items-end">
              <div className="w-full rounded-3xl border bg-background/70 p-5 xl:max-w-[360px]">
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="mt-4 h-10 w-32 rounded-md" />
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="rounded-2xl border bg-card px-3 py-3">
                      <Skeleton className="h-3 w-16 rounded-md" />
                      <Skeleton className="mt-3 h-5 w-20 rounded-md" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid w-full gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap xl:justify-end">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-9 w-full rounded-xl xl:w-28" />
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
          <div className="space-y-6">
            <DetailSectionSkeleton titleWidth="w-32" metricCount={4} />
            <DetailSectionSkeleton titleWidth="w-40" metricCount={4} />
            <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-28 rounded-md" />
                  <Skeleton className="h-4 w-64 rounded-md" />
                </div>
                <Skeleton className="h-9 w-24 rounded-xl" />
              </div>
              <SkeletonCardList count={3} />
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-40 rounded-md" />
                  <Skeleton className="h-4 w-64 rounded-md" />
                </div>
                <Skeleton className="h-9 w-36 rounded-xl" />
              </div>
              <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="aspect-[4/3] w-full rounded-xl" />
                ))}
              </div>
            </section>
            <SkeletonCardList count={2} />
          </div>
        </div>
      </div>
    </SkeletonShell>
  );
}
