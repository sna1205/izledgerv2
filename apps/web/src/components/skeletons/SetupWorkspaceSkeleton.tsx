import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonShell } from "@/components/skeletons/SkeletonScaffold";

function WorkspaceSectionSkeleton({
  titleWidth,
  textareaRows = 1,
}: {
  titleWidth: string;
  textareaRows?: number;
}) {
  return (
    <section className="rounded-[30px] border border-border bg-card/85 p-5 sm:p-6">
      <Skeleton className={`mb-5 h-6 ${titleWidth} rounded-md`} />
      <div className="space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24 rounded-md" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        {Array.from({ length: textareaRows }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-24 rounded-md" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        ))}
      </div>
    </section>
  );
}

function SidebarCardSkeleton({
  heightClassName,
}: {
  heightClassName: string;
}) {
  return <Skeleton className={`w-full rounded-[28px] ${heightClassName}`} />;
}

export function SetupWorkspaceSkeleton() {
  return (
    <SkeletonShell>
      <div
        className="mx-auto w-full max-w-[1440px] space-y-6"
        role="status"
        aria-busy="true"
        aria-label="Loading setup workspace"
        data-testid="setup-workspace-skeleton"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-44 rounded-md sm:h-9 sm:w-56" />
            <Skeleton className="h-4 w-36 rounded-md" />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Skeleton className="h-10 w-full rounded-xl sm:w-36" />
            <Skeleton className="h-10 w-full rounded-xl sm:w-32" />
          </div>
        </div>

        <div className="rounded-[32px] border border-border bg-card/70 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
            <div className="grid h-auto w-full grid-cols-2 gap-2 lg:w-[280px]">
              <Skeleton className="h-10 rounded-2xl" />
              <Skeleton className="h-10 rounded-2xl" />
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_340px]">
          <div className="space-y-6">
            <WorkspaceSectionSkeleton titleWidth="w-24" textareaRows={1} />
            <WorkspaceSectionSkeleton titleWidth="w-20" textareaRows={3} />
            <WorkspaceSectionSkeleton titleWidth="w-20" textareaRows={1} />
          </div>

          <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <SidebarCardSkeleton heightClassName="h-[280px]" />
            <SidebarCardSkeleton heightClassName="h-[180px]" />
            <SidebarCardSkeleton heightClassName="h-[140px]" />
          </div>
        </div>

        <div className="sticky bottom-4 z-10 flex justify-end">
          <div className="rounded-2xl border border-border bg-background/95 p-2 shadow-lg backdrop-blur">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Skeleton className="h-10 w-full rounded-xl sm:w-24" />
              <Skeleton className="h-10 w-full rounded-xl sm:w-28" />
            </div>
          </div>
        </div>
      </div>
    </SkeletonShell>
  );
}
