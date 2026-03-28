import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonHeader, SkeletonShell } from "@/components/skeletons/SkeletonScaffold";

function FormSectionSkeleton({
  titleWidth,
  fieldCount,
  includeTextarea = false,
}: {
  titleWidth: string;
  fieldCount: number;
  includeTextarea?: boolean;
}) {
  return (
    <section className="surface space-y-4 p-4 sm:p-5">
      <Skeleton className={`h-6 ${titleWidth} rounded-md`} />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: fieldCount }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
        {includeTextarea ? (
          <div className="space-y-2 md:col-span-2">
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SummaryPanelSkeleton() {
  return (
    <aside className="surface space-y-4 p-4 sm:p-5">
      <Skeleton className="h-6 w-24 rounded-md" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-border/70 bg-background/70 p-3">
            <Skeleton className="h-3 w-16 rounded-md" />
            <Skeleton className="mt-2 h-4 w-28 rounded-md" />
            {index === 2 ? <Skeleton className="mt-2 h-3 w-32 rounded-md" /> : null}
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
        <Skeleton className="h-3 w-24 rounded-md" />
        <Skeleton className="mt-2 h-3 w-full rounded-md" />
      </div>
    </aside>
  );
}

function ChecklistSectionSkeleton() {
  return (
    <section className="surface space-y-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-10 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-28 rounded-md" />
            <Skeleton className="h-3 w-44 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-14 rounded-full" />
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="surface-muted flex items-start gap-3 rounded-2xl p-4">
            <Skeleton className="mt-0.5 h-5 w-5 rounded-md" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40 rounded-md" />
              <Skeleton className="h-3 w-full max-w-[320px] rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ScreenshotSectionSkeleton() {
  return (
    <section className="surface space-y-4 p-4 sm:p-5">
      <div className="space-y-2">
        <Skeleton className="h-6 w-32 rounded-md" />
        <Skeleton className="h-3 w-44 rounded-md" />
      </div>
      <div className="rounded-2xl border-2 border-dashed border-border p-8">
        <div className="flex flex-col items-center text-center">
          <Skeleton className="h-6 w-6 rounded-md" />
          <Skeleton className="mt-4 h-4 w-48 rounded-md" />
          <Skeleton className="mt-2 h-3 w-20 rounded-md" />
          <Skeleton className="mt-2 h-3 w-40 rounded-md" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    </section>
  );
}

export function TradeFormSkeleton() {
  return (
    <SkeletonShell>
      <div
        className="mx-auto w-full max-w-[1500px] space-y-6"
        role="status"
        aria-busy="true"
        aria-label="Loading trade form"
        data-testid="trade-form-skeleton"
      >
        <SkeletonHeader actionWidth="sm:w-40" />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <FormSectionSkeleton titleWidth="w-20" fieldCount={8} />
            <FormSectionSkeleton titleWidth="w-24" fieldCount={8} />
            <FormSectionSkeleton titleWidth="w-24" fieldCount={0} includeTextarea />
            <ScreenshotSectionSkeleton />
          </div>

          <div className="space-y-6">
            <SummaryPanelSkeleton />
            <ChecklistSectionSkeleton />
          </div>
        </div>
      </div>
    </SkeletonShell>
  );
}
