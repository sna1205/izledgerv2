import { CheckCircle2, LineChart, Radar, ScanSearch } from "lucide-react";
import { LandingReveal } from "@/components/landing/LandingReveal";
import { LandingScreenshot } from "@/components/landing/LandingScreenshot";
import { LandingSectionHeading } from "@/components/landing/LandingSectionHeading";

const analyticsPoints = [
  { icon: LineChart, title: "Win rate, profit factor, consistency" },
  { icon: Radar, title: "Behavior tracking" },
  { icon: ScanSearch, title: "Real performance insights" },
];

const analyticsCards = [
  {
    title: "Setup performance",
    src: "/img/analytics-breakdown1.png",
    darkSrc: "/img/analytics-breakdown1-dark.png",
    alt: "Analytics breakdown by performance category",
  },
  {
    title: "Behavior segmentation",
    src: "/img/analytics-breakdown2.png",
    darkSrc: "/img/analytics-breakdown2-dark.png",
    alt: "Analytics breakdown insight card",
  },
  {
    title: "PnL distribution",
    src: "/img/analytics-breakdown3.png",
    darkSrc: "/img/analytics-breakdown3-dark.png",
    alt: "Analytics breakdown panel",
  },
  {
    title: "Execution detail",
    src: "/img/analytics-breakdown4.png",
    darkSrc: "/img/analytics-breakdown4-dark.png",
    alt: "Analytics breakdown detail view",
  },
];

export function AnalyticsSection() {
  return (
    <section id="analytics" className="border-y border-border/60 bg-card/[0.38] px-4 py-20 backdrop-blur-[2px] sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-16 lg:gap-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.76fr)_minmax(0,1.24fr)] lg:items-start">
          <LandingReveal>
            <LandingSectionHeading
              kicker="See Everything"
              title="Your performance. Fully visible."
              description="A premium analytics layer that makes process, behavior, and edge obvious before mistakes compound."
            />

            <div className="mt-8 space-y-3">
              {analyticsPoints.map((point, index) => {
                const Icon = point.icon;

                return (
                  <LandingReveal
                    key={point.title}
                    delay={0.08 + index * 0.06}
                    className="flex items-start gap-4 rounded-[1.35rem] border border-border/60 bg-background/72 p-5 shadow-[0_14px_36px_-28px_rgba(15,23,42,0.18)] dark:bg-white/[0.03]"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="pt-1 text-base font-semibold tracking-tight text-foreground">{point.title}</p>
                  </LandingReveal>
                );
              })}
            </div>
          </LandingReveal>

          <LandingReveal className="rounded-[2rem] border border-border/60 bg-background/54 p-4 shadow-[0_20px_56px_-36px_rgba(15,23,42,0.16)] dark:bg-white/[0.025]">
            <div className="mb-4 px-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Overview</p>
              <p className="mt-1 text-sm text-muted-foreground">
                One clean view of performance, volume, and account behavior.
              </p>
            </div>
            <LandingScreenshot
              src="/img/analytics-overview.png"
              darkSrc="/img/analytics-overview-dark.png"
              alt="Analytics overview screenshot"
              className="rounded-[1.6rem] p-1.5"
              imageClassName="aspect-[1.78/1] w-full"
            />
          </LandingReveal>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.76fr)_minmax(0,1.24fr)] lg:items-start">
          <LandingReveal>
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">Breakdowns</p>
              <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-[2rem]">
                Slice performance from every angle
              </h3>
              <p className="mt-4 text-base leading-8 text-muted-foreground">
                Drill into setups, behavior, and execution quality without losing the high-level picture.
              </p>
            </div>
          </LandingReveal>

          <div className="grid gap-4 sm:grid-cols-2">
            {analyticsCards.map((item, index) => (
              <LandingReveal key={item.title} delay={0.06 + index * 0.04}>
                <div className="rounded-[1.75rem] border border-border/60 bg-background/58 p-3 shadow-[0_16px_42px_-32px_rgba(15,23,42,0.16)] dark:bg-white/[0.025]">
                  <p className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {item.title}
                  </p>
                  <LandingScreenshot
                    src={item.src}
                    darkSrc={item.darkSrc}
                    alt={item.alt}
                    className="rounded-[1.3rem] p-1"
                    imageClassName="aspect-[1.62/1] w-full"
                  />
                </div>
              </LandingReveal>
            ))}
          </div>
        </div>

        <div className="grid gap-12 lg:grid-cols-[minmax(520px,1.05fr)_minmax(0,0.95fr)] lg:items-center">
          <LandingReveal className="relative">
            <div className="absolute inset-0 rounded-[2.5rem] bg-[radial-gradient(circle,_rgba(217,170,76,0.14),_transparent_72%)] blur-3xl dark:bg-[radial-gradient(circle,_rgba(217,170,76,0.18),_transparent_72%)]" />
            <LandingScreenshot
              src="/img/performance-calendar.png"
              darkSrc="/img/performance-calendar-dark.png"
              alt="Performance calendar screenshot"
              className="relative"
              imageClassName="aspect-[1.95/1] w-full"
            />
          </LandingReveal>

          <LandingReveal>
            <LandingSectionHeading
              kicker="Performance Calendar"
              title="See your consistency over time"
              description="Daily performance mapped visually so you instantly spot patterns."
            />
            <div className="mt-8 rounded-[1.75rem] border border-border/60 bg-background/74 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.25)] dark:bg-white/[0.03]">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-primary" />
                <p className="text-base leading-8 text-muted-foreground">
                  Quickly see streaks, off days, and recovery periods without digging through rows of trade history.
                </p>
              </div>
            </div>
          </LandingReveal>
        </div>
      </div>
    </section>
  );
}
