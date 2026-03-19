import { Skeleton } from "@/components/ui/skeleton";
import {
  SkeletonHeader,
  SkeletonShell,
  SkeletonStatGrid,
} from "@/components/skeletons/SkeletonScaffold";

export function AccountsSkeleton() {
  return (
    <SkeletonShell>
      <div
        className="mx-auto w-full max-w-[1440px] space-y-8"
        role="status"
        aria-label="Loading accounts"
        data-testid="accounts-skeleton"
      >
        <SkeletonHeader actionWidth="sm:w-32" />
        <SkeletonStatGrid count={3} columnsClassName="md:grid-cols-3" />
        <div className="grid gap-6 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <article key={index} className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-32 rounded-md" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-28 rounded-md" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-9 rounded-xl" />
                  <Skeleton className="h-9 w-9 rounded-xl" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((__, metricIndex) => (
                  <div key={metricIndex} className="rounded-2xl border bg-background/60 p-4">
                    <Skeleton className="h-3 w-20 rounded-md" />
                    <Skeleton className="mt-3 h-5 w-24 rounded-md" />
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </SkeletonShell>
  );
}
