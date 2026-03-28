import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonHeader, SkeletonShell, SkeletonStatGrid } from "@/components/skeletons/SkeletonScaffold";

export function ChecklistSettingsSkeleton() {
  return (
    <SkeletonShell>
      <div
        className="mx-auto w-full max-w-[1440px] space-y-6"
        role="status"
        aria-busy="true"
        aria-label="Loading checklist settings"
        data-testid="checklist-settings-skeleton"
      >
        <SkeletonHeader actionWidth="sm:w-36" />
        <SkeletonStatGrid count={3} columnsClassName="md:grid-cols-3" />

        <section className="surface space-y-4 p-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-28 rounded-md" />
            <Skeleton className="h-4 w-56 rounded-md" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="rounded-3xl border px-5 py-5">
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-4 w-14 rounded-md" />
                  <Skeleton className="h-6 w-14 rounded-full" />
                </div>
                <Skeleton className="mt-3 h-3 w-full max-w-[220px] rounded-md" />
              </div>
            ))}
          </div>
        </section>

        <section className="surface space-y-4 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-40 rounded-md" />
              <Skeleton className="h-4 w-64 rounded-md" />
            </div>
            <Skeleton className="h-10 w-full rounded-xl sm:w-32" />
          </div>

          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="rounded-2xl border bg-background/70 px-4 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Skeleton className="h-4 w-36 rounded-md" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-6 w-14 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-full max-w-[360px] rounded-md" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {Array.from({ length: 4 }).map((__, actionIndex) => (
                      <Skeleton key={actionIndex} className="h-10 w-10 rounded-xl" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </SkeletonShell>
  );
}
