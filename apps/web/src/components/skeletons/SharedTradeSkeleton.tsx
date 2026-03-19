import { Skeleton } from "@/components/ui/skeleton";

export function SharedTradeSkeleton() {
  return (
    <main
      className="page-enter min-h-screen bg-[linear-gradient(180deg,#f7fbff_0%,#eef4fb_32%,#f7efe2_100%)] px-4 py-8 dark:bg-[linear-gradient(180deg,#06101d_0%,#0d1828_46%,#1b1420_100%)]"
      role="status"
      aria-label="Loading shared trade"
      data-testid="shared-trade-skeleton"
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-4">
            <Skeleton className="h-8 w-40 rounded-full" />
            <Skeleton className="h-12 w-72 rounded-md" />
            <Skeleton className="h-4 w-full max-w-2xl rounded-md" />
          </div>
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-9 w-36 rounded-full" />
            <Skeleton className="h-9 w-28 rounded-full" />
          </div>
        </header>

        <section className="rounded-[30px] border border-white/65 bg-white/82 p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.45)] backdrop-blur dark:border-white/10 dark:bg-white/5">
          <Skeleton className="aspect-[16/8] w-full rounded-[24px]" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-[24px] border border-white/60 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
                <Skeleton className="h-3 w-16 rounded-md" />
                <Skeleton className="mt-3 h-5 w-24 rounded-md" />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32 rounded-md" />
            <Skeleton className="h-4 w-56 rounded-md" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rounded-[24px] border border-white/60 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
                <Skeleton className="h-3 w-20 rounded-md" />
                <Skeleton className="mt-3 h-5 w-28 rounded-md" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
