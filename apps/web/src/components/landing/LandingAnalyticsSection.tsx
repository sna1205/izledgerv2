import { BarChart3, Eye, ShieldCheck, TrendingUp } from "lucide-react";
import { LandingReveal } from "@/components/landing/LandingReveal";
import { LandingScreenshot } from "@/components/landing/LandingScreenshot";

const analyticsPoints = [
  {
    icon: Eye,
    title: "See edge, drag, and discipline in one place",
    body: "High-level performance and execution behavior stay connected instead of living in separate tools.",
  },
  {
    icon: TrendingUp,
    title: "Find what is actually driving performance",
    body: "Identify which setups, sessions, and habits are compounding results over time.",
  },
  {
    icon: ShieldCheck,
    title: "Review before mistakes compound",
    body: "Spot weak streaks early and tighten the process before they become expensive.",
  },
];

const breakdownShots = [
  {
    label: "Setup performance",
    src: "/img/analytics-breakdown1.png",
    darkSrc: "/img/analytics-breakdown1-dark.png",
    alt: "Analytics breakdown by setup performance",
  },
  {
    label: "Behavior segmentation",
    src: "/img/analytics-breakdown2.png",
    darkSrc: "/img/analytics-breakdown2-dark.png",
    alt: "Analytics behavior segmentation screenshot",
  },
  {
    label: "PnL distribution",
    src: "/img/analytics-breakdown3.png",
    darkSrc: "/img/analytics-breakdown3-dark.png",
    alt: "Analytics PnL distribution screenshot",
  },
  {
    label: "Execution detail",
    src: "/img/analytics-breakdown4.png",
    darkSrc: "/img/analytics-breakdown4-dark.png",
    alt: "Analytics execution detail screenshot",
  },
];

export function LandingAnalyticsSection() {
  return (
    <section id="analytics" className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 lg:gap-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:items-end xl:gap-12">
          <LandingReveal className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/85">Platform Visibility</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-foreground sm:text-5xl lg:text-[3.75rem] lg:leading-[1.02]">
              Your performance, fully visible.
            </h2>
            <p className="mt-5 text-base leading-8 text-muted-foreground sm:text-lg">
              A trader should not have to guess whether progress is real. IZLedger makes performance, process, and
              consistency readable at a glance.
            </p>
          </LandingReveal>

          <div className="grid gap-4 md:grid-cols-3">
            {analyticsPoints.map((point, index) => {
              const Icon = point.icon;

              return (
                <LandingReveal
                  key={point.title}
                  delay={0.06 + index * 0.04}
                  className="rounded-[1.8rem] border border-border/70 bg-white/66 p-5 shadow-[0_22px_54px_-38px_rgba(15,23,42,0.18)] backdrop-blur dark:bg-white/[0.04]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-5 text-base font-semibold tracking-tight text-foreground">{point.title}</p>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{point.body}</p>
                </LandingReveal>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] xl:gap-6">
          <LandingReveal className="relative overflow-hidden rounded-[3rem] border border-border/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(239,244,251,0.94),rgba(243,239,230,0.84))] p-4 shadow-[0_42px_120px_-48px_rgba(15,23,42,0.24)] dark:border-slate-800 dark:bg-[linear-gradient(145deg,#08111f_0%,#0d1728_55%,#111d31_100%)] dark:shadow-[0_42px_120px_-48px_rgba(15,23,42,0.78)] sm:p-5 lg:p-6">
            <div className="absolute inset-x-[18%] top-6 h-36 rounded-full bg-sky-500/18 blur-3xl dark:bg-sky-500/16" />
            <div className="relative flex flex-wrap items-center justify-between gap-3 px-1 pb-5 pt-1 text-foreground/78 dark:text-white/72">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/85 dark:text-sky-200/80">Performance Layer</p>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground dark:text-slate-300">
                  Start with the account view, then move into the supporting breakdowns that explain what is driving it.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-white/66 px-4 py-2 text-sm font-medium text-foreground/80 shadow-[0_16px_34px_-24px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-white/[0.04] dark:text-white/82 dark:shadow-none">
                <BarChart3 className="h-4 w-4 text-primary dark:text-sky-300" />
                Reviewable analytics
              </div>
            </div>

            <LandingScreenshot
              src="/img/analytics-overview.png"
              darkSrc="/img/analytics-overview-dark.png"
              alt="IZLedger analytics overview screenshot"
              chrome={false}
              className="rounded-[2.2rem] border-border/60 bg-white/70 p-3 shadow-[0_26px_70px_-38px_rgba(15,23,42,0.18)] hover:translate-y-0 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_26px_70px_-38px_rgba(2,6,23,0.95)]"
              imageClassName="aspect-[2.02/1] w-full rounded-[1.55rem]"
            />
          </LandingReveal>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {breakdownShots.map((shot, index) => (
              <LandingReveal
                key={shot.label}
                delay={0.08 + index * 0.03}
                className="rounded-[1.9rem] border border-border/60 bg-white/62 p-3 shadow-[0_18px_44px_-30px_rgba(15,23,42,0.14)] backdrop-blur dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none"
              >
                <p className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground dark:text-slate-300/86">
                  {shot.label}
                </p>
                <LandingScreenshot
                  src={shot.src}
                  darkSrc={shot.darkSrc}
                  alt={shot.alt}
                  chrome={false}
                  className="rounded-[1.45rem] border-border/50 bg-white/72 p-2 shadow-none hover:translate-y-0 dark:border-white/10 dark:bg-white/[0.03]"
                  imageClassName="aspect-[1.95/1] w-full rounded-[1.05rem]"
                />
              </LandingReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
