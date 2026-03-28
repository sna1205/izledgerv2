import { ArrowRight, CalendarDays, LineChart } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/layouts/PageShell";

function PreviewSkeleton() {
  return (
    <div className="pointer-events-none absolute inset-0 hidden overflow-hidden rounded-[2.25rem] border border-border/40 bg-background/35 p-5 opacity-80 blur-[1.5px] lg:block">
      <div className="soft-grid absolute inset-0 opacity-35" />
      <div className="relative grid h-full gap-4 lg:grid-cols-[1.35fr_0.9fr]">
        <div className="space-y-4 rounded-[1.75rem] border border-border/40 bg-card/55 p-5">
          <div className="h-3 w-24 rounded-full bg-muted" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-border/30 bg-background/70 p-4">
                <div className="h-3 w-16 rounded-full bg-muted" />
                <div className="mt-4 h-4 w-28 rounded-full bg-muted/80" />
                <div className="mt-2 h-3 w-full rounded-full bg-muted/60" />
                <div className="mt-2 h-3 w-5/6 rounded-full bg-muted/50" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4 rounded-[1.75rem] border border-border/40 bg-card/55 p-5">
          <div className="h-3 w-20 rounded-full bg-muted" />
          <div className="rounded-2xl border border-border/30 bg-background/70 p-4">
            <div className="h-24 rounded-2xl bg-muted/70" />
            <div className="mt-4 h-3 w-24 rounded-full bg-muted" />
            <div className="mt-2 h-3 w-full rounded-full bg-muted/60" />
            <div className="mt-2 h-3 w-4/5 rounded-full bg-muted/50" />
          </div>
          <div className="rounded-2xl border border-border/30 bg-background/70 p-4">
            <div className="h-3 w-20 rounded-full bg-muted" />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-10 rounded-xl bg-muted/65" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EconomicCalendarComingSoonPage() {
  return (
    <PageShell size="wide">
      <section className="relative isolate overflow-hidden rounded-[2.5rem] border border-border/55 bg-gradient-to-br from-background via-background to-primary/5 px-4 py-8 sm:px-8 sm:py-12">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-10 h-56 w-56 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl dark:bg-primary/20" />
          <div className="absolute bottom-8 left-10 h-40 w-40 rounded-full bg-success/10 blur-3xl" />
          <div className="absolute right-10 top-20 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />
        </div>

        <div className="relative mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center">
          <div className="relative w-full max-w-5xl">
            <div className="absolute inset-x-10 top-8 -z-10 h-[28rem] rounded-[2.25rem]">
              <PreviewSkeleton />
            </div>

            <div className="mx-auto max-w-2xl rounded-[2.25rem] border border-border/60 bg-card/88 p-8 shadow-[0_24px_80px_-36px_hsl(var(--foreground)/0.4)] backdrop-blur-xl sm:p-10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
                <CalendarDays className="h-6 w-6" />
              </div>

              <div className="mt-6 text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                  <LineChart className="h-3.5 w-3.5" />
                  In Development
                </div>

                <h1 className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">
                  Economic Calendar
                </h1>
                <p className="mt-3 text-base text-muted-foreground sm:text-lg">
                  Track macro events, news releases, and market-moving data.
                </p>
                <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                  This feature is currently in development and will be available in a future update. We&apos;re
                  building a faster, cleaner, and more reliable experience.
                </p>
              </div>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="rounded-2xl px-6">
                  <Link to="/dashboard">Back to Dashboard</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-2xl px-6">
                  <Link to="/analytics">
                    Go to Analytics
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
