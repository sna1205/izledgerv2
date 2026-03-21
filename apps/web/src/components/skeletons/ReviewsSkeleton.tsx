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
        <div className="rounded-[1.75rem] border bg-card/70 p-4 sm:p-5">
          <Skeleton className="h-3 w-24 rounded-md" />
          <div className="mt-4 grid gap-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-2xl border p-4">
                <Skeleton className="h-8 w-8 rounded-xl" />
                <Skeleton className="h-4 flex-1 rounded-md" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid h-auto w-full grid-cols-4 gap-2 rounded-2xl sm:w-[420px]">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-11 rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-[180px] rounded-xl" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <article key={index} className="rounded-[1.6rem] border bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-28 rounded-md" />
                    <Skeleton className="h-3 w-24 rounded-md" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-14 rounded-xl" />
                    <Skeleton className="h-8 w-8 rounded-xl" />
                    <Skeleton className="h-8 w-8 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-8 w-32 rounded-md" />
                  <Skeleton className="h-6 w-40 rounded-md" />
                  <Skeleton className="h-5 w-52 rounded-md" />
                  <Skeleton className="h-4 w-full max-w-[420px] rounded-md" />
                  <Skeleton className="h-4 w-48 rounded-md" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </SkeletonShell>
  );
}
