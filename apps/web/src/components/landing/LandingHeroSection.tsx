import { ArrowRight, BarChart3, ClipboardCheck, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { LandingReveal } from "@/components/landing/LandingReveal";
import { LandingScreenshot } from "@/components/landing/LandingScreenshot";
import { Button } from "@/components/ui/button";

const proofItems = [
  { icon: ClipboardCheck, label: "Review-ready logging" },
  { icon: BarChart3, label: "Performance visibility" },
  { icon: ShieldCheck, label: "Rule-based execution" },
];

type LandingHeroSectionProps = {
  primaryHref: string;
  primaryLabel: string;
};

export function LandingHeroSection({ primaryHref, primaryLabel }: LandingHeroSectionProps) {
  return (
    <section className="relative px-4 pb-[4.5rem] pt-10 sm:px-6 sm:pb-24 sm:pt-14 lg:px-8 lg:pb-32 lg:pt-20">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col items-center gap-10 lg:gap-12">
        <LandingReveal className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
          <p className="inline-flex items-center rounded-full border border-border/70 bg-white/72 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground shadow-[0_16px_34px_-28px_rgba(15,23,42,0.12)] backdrop-blur dark:bg-white/[0.04]">
            Structured Trading Journal
          </p>

          <h1 className="mt-7 max-w-4xl text-5xl font-semibold tracking-[-0.075em] text-foreground sm:text-6xl lg:text-[5.15rem] lg:leading-[0.94]">
            Trade with structure. Review with clarity.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
            IZLedger helps you log trades, review performance, and build discipline with a workflow designed for
            real improvement.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
            <Button
              asChild
              size="lg"
              className="h-[54px] rounded-2xl bg-[linear-gradient(135deg,#1d4ed8_0%,#2563eb_42%,#d6a448_100%)] px-7 text-base text-white shadow-[0_28px_70px_-26px_rgba(37,99,235,0.72)] hover:brightness-110"
            >
              <Link to={primaryHref}>
                {primaryLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-[54px] rounded-2xl border-border/70 bg-white/70 px-7 text-base shadow-[0_18px_40px_-28px_rgba(15,23,42,0.24)] backdrop-blur dark:bg-white/[0.04]"
            >
              <a href="#analytics">View Demo</a>
            </Button>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">Built for discipline. Designed for review. Made for consistency.</p>
        </LandingReveal>

        <LandingReveal className="relative w-full" delay={0.08}>
          <div className="absolute left-[24%] top-[10%] h-44 w-44 rounded-full bg-sky-500/10 blur-3xl dark:bg-sky-500/12" />
          <div className="absolute right-[18%] top-[18%] h-52 w-52 rounded-full bg-amber-300/8 blur-3xl dark:bg-amber-300/8" />

          <div className="relative mx-auto max-w-[1180px] lg:translate-y-2">
            <div className="relative rounded-[2.8rem] border-0 bg-transparent p-0 shadow-none">
              <LandingScreenshot
                src="/img/hero-dashboard.png"
                darkSrc="/img/hero-dashboard-dark.png"
                alt="IZLedger dashboard screenshot"
                priority
                chrome={false}
                className="overflow-visible rounded-[2.6rem] border-0 bg-transparent p-0 shadow-[0_60px_120px_-52px_rgba(15,23,42,0.34)] hover:translate-y-0 dark:shadow-[0_60px_130px_-56px_rgba(0,0,0,0.88)]"
                imageClassName="aspect-[2.16/1] w-full rounded-[2rem]"
              />
            </div>
          </div>
        </LandingReveal>

        <div className="grid w-full max-w-5xl gap-3 sm:grid-cols-3 sm:gap-4">
          {proofItems.map((item, index) => {
            const Icon = item.icon;

            return (
              <LandingReveal
                key={item.label}
                delay={0.12 + index * 0.05}
                className="flex items-center justify-center gap-3 rounded-[1.3rem] border border-border/70 bg-white/58 px-4 py-4 text-center shadow-[0_18px_40px_-34px_rgba(15,23,42,0.14)] backdrop-blur dark:bg-white/[0.03]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/8 text-primary">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <p className="text-sm font-semibold leading-6 tracking-tight text-foreground">{item.label}</p>
              </LandingReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
