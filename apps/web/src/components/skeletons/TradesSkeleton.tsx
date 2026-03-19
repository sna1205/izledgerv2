import { Skeleton } from "@/components/ui/skeleton";
import {
  SkeletonFilterCard,
  SkeletonHeader,
  SkeletonShell,
  SkeletonTable,
  SkeletonTabsRow,
} from "@/components/skeletons/SkeletonScaffold";

export function TradesSkeleton() {
  return (
    <SkeletonShell>
      <div
        className="mx-auto w-full max-w-[1600px] space-y-5"
        role="status"
        aria-label="Loading trades"
        data-testid="trades-skeleton"
      >
        <SkeletonHeader actionWidth="sm:w-32" />
        <SkeletonFilterCard fields={6} />
        <SkeletonTabsRow />
        <SkeletonTable rows={6} columns={7} />
      </div>
    </SkeletonShell>
  );
}
