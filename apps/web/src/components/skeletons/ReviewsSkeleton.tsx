import { Skeleton } from "@/components/ui/skeleton";
import {
  SkeletonHeader,
  SkeletonShell,
} from "@/components/skeletons/SkeletonScaffold";

export function ReviewsSkeleton() {
  return (
    <SkeletonShell>
      <div
        className="mx-auto w-full max-w-[1440px] space-y-6"
        role="status"
        aria-label="Loading reviews"
        data-testid="reviews-skeleton"
      >
        <SkeletonHeader actionWidth="sm:w-44" />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid h-auto w-full grid-cols-4 gap-2 rounded-2xl sm:w-[420px]">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-11 rounded-2xl" />
            ))}
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-3 w-16 rounded-md" />
                <Skeleton className="h-10 w-[180px] rounded-xl" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <article key={index} className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-5 w-40 rounded-md" />
                  <Skeleton className="h-4 w-full max-w-[560px] rounded-md" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-9 rounded-xl" />
                  <Skeleton className="h-9 w-9 rounded-xl" />
                  <Skeleton className="h-9 w-9 rounded-xl" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </SkeletonShell>
  );
}
