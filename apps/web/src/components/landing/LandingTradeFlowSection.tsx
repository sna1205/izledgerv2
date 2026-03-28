import { Camera, FileSearch, ListChecks } from "lucide-react";
import { LandingReveal } from "@/components/landing/LandingReveal";
import { LandingScreenshot } from "@/components/landing/LandingScreenshot";

const tradeFlowPoints = [
  {
    icon: ListChecks,
    title: "Log trades like a professional",
    body: "Capture setup, session, reasoning, screenshots, and result without breaking your execution rhythm.",
  },
  {
    icon: FileSearch,
    title: "Deep dive every trade",
    body: "Move from the clean log view into the full context of a single trade when it is time to review.",
  },
  {
    icon: Camera,
    title: "Keep the evidence attached",
    body: "Charts and notes stay linked so each lesson is grounded in what actually happened.",
  },
];

export function LandingTradeFlowSection() {
  return (
    <section id="trade-log" className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 lg:gap-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-end xl:gap-12">
          <LandingReveal className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/85">Trade Workflow</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-foreground sm:text-5xl lg:text-[3.55rem] lg:leading-[1.02]">
              Log the trade. Inspect the evidence. Review the decision.
            </h2>
            <p className="mt-5 text-base leading-8 text-muted-foreground sm:text-lg">
              The workflow starts with clean capture and moves into a higher-context inspection view so every lesson has
              enough evidence to matter.
            </p>
          </LandingReveal>

          <div className="grid gap-4 md:grid-cols-3">
            {tradeFlowPoints.map((point, index) => {
              const Icon = point.icon;

              return (
                <LandingReveal
                  key={point.title}
                  delay={0.06 + index * 0.04}
                  className="rounded-[1.8rem] border border-border/70 bg-white/66 p-5 shadow-[0_20px_48px_-36px_rgba(15,23,42,0.18)] backdrop-blur dark:bg-white/[0.04]"
                >
                  <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    <span>0{index + 1}</span>
                    <span className="h-px flex-1 bg-border/70" />
                  </div>
                  <div className="mt-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-base font-semibold tracking-tight text-foreground">{point.title}</p>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{point.body}</p>
                </LandingReveal>
              );
            })}
          </div>
        </div>

        <LandingReveal className="relative overflow-hidden rounded-[3.2rem] border border-border/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.86),rgba(242,246,252,0.82),rgba(245,240,231,0.78))] px-4 py-6 shadow-[0_38px_110px_-48px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(10,16,28,0.94),rgba(10,18,33,0.92),rgba(19,18,15,0.86))] dark:shadow-[0_42px_110px_-48px_rgba(0,0,0,0.92)] sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <div className="pointer-events-none absolute left-[18%] right-[18%] top-[48%] hidden h-px bg-[linear-gradient(90deg,transparent,rgba(37,99,235,0.28),rgba(214,164,72,0.32),transparent)] lg:block" />
          <div className="pointer-events-none absolute left-[32%] top-[18%] hidden h-[42%] w-px bg-[linear-gradient(180deg,rgba(37,99,235,0.14),rgba(214,164,72,0.24),transparent)] lg:block" />
          <div className="pointer-events-none absolute left-[14%] top-[10%] h-52 w-52 rounded-full bg-sky-500/12 blur-3xl dark:bg-sky-500/14" />
          <div className="pointer-events-none absolute bottom-[6%] right-[10%] h-48 w-48 rounded-full bg-amber-400/10 blur-3xl dark:bg-amber-300/10" />

          <div className="hidden min-h-[760px] lg:block">
            <div className="absolute left-[3%] top-[10%] z-10 w-[40%]">
              <span className="mb-3 inline-flex rounded-full border border-border/70 bg-white/78 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground shadow-[0_16px_34px_-24px_rgba(15,23,42,0.22)] dark:bg-slate-950/74">
                01 Log
              </span>
              <LandingScreenshot
                src="/img/trade-log1.png"
                darkSrc="/img/trade-log1-dark.png"
                alt="IZLedger trade log table screenshot"
                chrome={false}
                className="rounded-[2rem] border-white/60 bg-white/74 p-3 shadow-[0_26px_70px_-34px_rgba(15,23,42,0.34)] hover:translate-y-0 dark:border-white/10 dark:bg-slate-950/74"
                imageClassName="aspect-[1.95/1] w-full rounded-[1.3rem]"
              />
            </div>

            <div className="absolute right-[2%] top-[8%] z-20 w-[64%]">
              <span className="mb-3 inline-flex rounded-full border border-border/70 bg-white/78 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground shadow-[0_16px_34px_-24px_rgba(15,23,42,0.22)] dark:bg-slate-950/74">
                02 Inspect
              </span>
              <LandingScreenshot
                src="/img/trade-detail.png"
                darkSrc="/img/trade-detail-dark.png"
                alt="IZLedger trade detail screenshot"
                chrome={false}
                className="rounded-[2.4rem] border-white/60 bg-white/80 p-4 shadow-[0_38px_100px_-40px_rgba(15,23,42,0.42)] hover:translate-y-0 dark:border-white/10 dark:bg-slate-950/80 dark:shadow-[0_46px_110px_-48px_rgba(0,0,0,0.92)]"
                imageClassName="aspect-[1.98/1] w-full rounded-[1.6rem]"
              />
            </div>

            <div className="absolute bottom-[7%] left-[18%] z-30 w-[36%]">
              <span className="mb-3 inline-flex rounded-full border border-border/70 bg-white/78 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground shadow-[0_16px_34px_-24px_rgba(15,23,42,0.22)] dark:bg-slate-950/74">
                03 Review Support
              </span>
              <LandingScreenshot
                src="/img/trade-log2.png"
                darkSrc="/img/trade-log2-dark.png"
                alt="IZLedger trade log review screenshot"
                chrome={false}
                className="rounded-[2rem] border-white/60 bg-white/74 p-3 shadow-[0_26px_70px_-34px_rgba(15,23,42,0.34)] hover:translate-y-0 dark:border-white/10 dark:bg-slate-950/74"
                imageClassName="aspect-[1.95/1] w-full rounded-[1.3rem]"
              />
            </div>
          </div>

          <div className="grid gap-5 lg:hidden">
            <div className="space-y-3">
              <span className="inline-flex rounded-full border border-border/70 bg-white/78 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground dark:bg-slate-950/74">
                01 Log
              </span>
              <LandingScreenshot
                src="/img/trade-log1.png"
                darkSrc="/img/trade-log1-dark.png"
                alt="IZLedger trade log table screenshot"
                chrome={false}
                className="rounded-[2rem] border-white/60 bg-white/74 p-3 shadow-[0_26px_70px_-34px_rgba(15,23,42,0.34)] dark:border-white/10 dark:bg-slate-950/74"
                imageClassName="aspect-[1.95/1] w-full rounded-[1.3rem]"
              />
            </div>
            <div className="space-y-3">
              <span className="inline-flex rounded-full border border-border/70 bg-white/78 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground dark:bg-slate-950/74">
                02 Inspect
              </span>
              <LandingScreenshot
                src="/img/trade-detail.png"
                darkSrc="/img/trade-detail-dark.png"
                alt="IZLedger trade detail screenshot"
                chrome={false}
                className="rounded-[2rem] border-white/60 bg-white/80 p-3 shadow-[0_30px_80px_-36px_rgba(15,23,42,0.34)] dark:border-white/10 dark:bg-slate-950/80"
                imageClassName="aspect-[1.95/1] w-full rounded-[1.3rem]"
              />
            </div>
            <div className="space-y-3">
              <span className="inline-flex rounded-full border border-border/70 bg-white/78 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground dark:bg-slate-950/74">
                03 Review Support
              </span>
              <LandingScreenshot
                src="/img/trade-log2.png"
                darkSrc="/img/trade-log2-dark.png"
                alt="IZLedger trade log review screenshot"
                chrome={false}
                className="rounded-[2rem] border-white/60 bg-white/74 p-3 shadow-[0_26px_70px_-34px_rgba(15,23,42,0.34)] dark:border-white/10 dark:bg-slate-950/74"
                imageClassName="aspect-[1.95/1] w-full rounded-[1.3rem]"
              />
            </div>
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}
