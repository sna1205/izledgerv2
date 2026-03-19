import { Skeleton } from "@/components/ui/skeleton";

export function AuthPageSkeleton() {
  return (
    <main
      className="page-enter flex min-h-screen items-center justify-center px-4 py-10"
      role="status"
      aria-label="Loading authentication"
    >
      <div className="w-full max-w-md rounded-[28px] border bg-card p-8 shadow-sm">
        <div className="space-y-3">
          <Skeleton className="h-8 w-36 rounded-md" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
        <div className="mt-8 space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-24 rounded-md" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
          <Skeleton className="h-11 w-full rounded-xl" />
          <div className="flex items-center justify-center gap-2">
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>
        </div>
      </div>
    </main>
  );
}
