import { CalendarRange, Flame, ScanLine } from "lucide-react";
import { LandingReveal } from "@/components/landing/LandingReveal";
import { LandingScreenshot } from "@/components/landing/LandingScreenshot";

const consistencySignals = [
  { icon: Flame, label: "Spot streaks before they slip" },
  { icon: ScanLine, label: "See daily behavior patterns clearly" },
  { icon: CalendarRange, label: "Review routine over isolated outcomes" },
];

export function LandingConsistencySection() {
  return (
    <section id="consistency" className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <LandingReveal className="mx-auto w-full max-w-[1280px]">
        <div className="relative overflow-hidden rounded-[3.2rem] border border-border/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.82),rgba(244,247,252,0.68),rgba(244,240,232,0.72))] px-6 py-8 shadow-[0_32px_90px_-42px_rgba(15,23,42,0.26)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(10,16,28,0.94),rgba(12,20,34,0.88),rgba(20,18,14,0.86))] dark:shadow-[0_42px_100px_-48px_rgba(0,0,0,0.9)] sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="absolute right-[-8%] top-[-10%] h-64 w-64 rounded-full bg-sky-500/12 blur-3xl dark:bg-sky-500/14" />
          <div className="absolute bottom-[-16%] left-[10%] h-56 w-56 rounded-full bg-amber-400/10 blur-3xl dark:bg-amber-300/10" />

          <div className="relative grid gap-10 lg:grid-cols-[minmax(0,0.76fr)_minmax(0,1.24fr)] lg:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/85">Consistency View</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-foreground sm:text-5xl lg:text-[3.4rem] lg:leading-[1.02]">
                See your consistency over time
              </h2>
              <p className="mt-5 text-base leading-8 text-muted-foreground sm:text-lg">
                Focus on identifying streaks, habits, and daily performance patterns. The calendar becomes a review
                surface, not just a record of dates.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {consistencySignals.map((item, index) => {
                const Icon = item.icon;

                return (
                  <LandingReveal
                    key={item.label}
                    delay={0.08 + index * 0.04}
                    className="rounded-[1.75rem] border border-border/70 bg-white/64 p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.16)] dark:bg-white/[0.04]"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-base font-semibold tracking-tight text-foreground">{item.label}</p>
                  </LandingReveal>
                );
              })}
            </div>
          </div>

          <div className="relative mt-10 lg:mt-14">
            <div className="pointer-events-none absolute left-[4%] top-[10%] hidden rounded-[1.6rem] border border-white/70 bg-white/82 px-4 py-3 text-sm font-medium text-foreground shadow-[0_20px_44px_-30px_rgba(15,23,42,0.28)] backdrop-blur dark:border-white/10 dark:bg-slate-950/72 dark:text-white lg:block">
              28-day behavior map
            </div>
            <div className="pointer-events-none absolute bottom-[8%] right-[4%] hidden rounded-[1.6rem] border border-white/70 bg-white/82 px-4 py-3 text-sm font-medium text-foreground shadow-[0_20px_44px_-30px_rgba(15,23,42,0.28)] backdrop-blur dark:border-white/10 dark:bg-slate-950/72 dark:text-white lg:block">
              Review patterns, not isolated trades
            </div>
            <div className="rounded-[2.6rem] border border-white/60 bg-white/48 p-3 shadow-[0_30px_80px_-42px_rgba(15,23,42,0.2)] dark:border-white/10 dark:bg-white/[0.03] sm:p-4 lg:p-5">
              <LandingScreenshot
                src="/img/performance-calendar.png"
                darkSrc="/img/performance-calendar-dark.png"
                alt="IZLedger performance calendar screenshot"
                chrome={false}
                className="rounded-[2.6rem] border-white/60 bg-white/72 p-4 shadow-[0_32px_90px_-40px_rgba(15,23,42,0.34)] hover:translate-y-0 dark:border-white/10 dark:bg-slate-950/76 dark:shadow-[0_40px_100px_-44px_rgba(0,0,0,0.9)] lg:p-5"
                imageClassName="aspect-[2.18/1] w-full rounded-[1.75rem]"
              />
            </div>
          </div>
        </div>
      </LandingReveal>
    </section>
  );
}
