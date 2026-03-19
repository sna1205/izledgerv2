import { Skeleton } from "@/components/ui/skeleton";
import {
  SkeletonFilterCard,
  SkeletonHeader,
  SkeletonShell,
} from "@/components/skeletons/SkeletonScaffold";

export function SetupsSkeleton() {
  return (
    <SkeletonShell>
      <div
        className="mx-auto w-full max-w-[1440px] space-y-6"
        role="status"
        aria-label="Loading setups"
        data-testid="setups-skeleton"
      >
        <SkeletonHeader actionWidth="sm:w-32" />
        <SkeletonFilterCard fields={4} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <article key={index} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-7 w-20 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-28 rounded-md" />
                    <Skeleton className="h-4 w-40 rounded-md" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-9 rounded-xl" />
                  <Skeleton className="h-9 w-9 rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-4/5 rounded-md" />
                <Skeleton className="h-4 w-1/2 rounded-md" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </SkeletonShell>
  );
}
