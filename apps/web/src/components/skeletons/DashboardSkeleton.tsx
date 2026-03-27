import { Skeleton } from "@/components/ui/skeleton";
import {
  SkeletonCardList,
  SkeletonShell,
  SkeletonStatGrid,
  SkeletonTable,
} from "@/components/skeletons/SkeletonScaffold";

export function DashboardSkeleton() {
  return (
    <SkeletonShell>
      <div
        className="mx-auto w-full max-w-[1440px] space-y-8"
        role="status"
        aria-label="Loading dashboard"
        data-testid="dashboard-skeleton"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-44 rounded-md sm:h-9 sm:w-52" />
            <Skeleton className="h-4 w-36 rounded-md" />
          </div>
          <Skeleton className="h-10 w-full rounded-xl lg:w-[220px]" />
        </div>

        <SkeletonStatGrid count={4} columnsClassName="grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" />

        <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-28 rounded-md" />
              <Skeleton className="h-4 w-48 rounded-md" />
            </div>
            <div className="space-y-2 sm:text-right">
              <Skeleton className="h-3 w-24 rounded-md" />
              <Skeleton className="h-7 w-28 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-[280px] w-full rounded-xl" />
        </section>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-28 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>
          <div className="hidden md:block">
            <SkeletonTable rows={5} columns={6} />
          </div>
          <SkeletonCardList
            count={4}
            className="md:hidden"
            renderItem={() => (
              <div className="space-y-3">
                <Skeleton className="h-5 w-24 rounded-md" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full rounded-md" />
              </div>
            )}
          />
        </div>
      </div>
    </SkeletonShell>
  );
}
