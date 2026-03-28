import { ArrowRight, BadgeCheck, CandlestickChart, ShieldCheck } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LandingReveal } from "@/components/landing/LandingReveal";
import { LandingScreenshot } from "@/components/landing/LandingScreenshot";

const proofCards = [
  { title: "Rule-aware logging", body: "Capture setup, session, and emotion without the clutter." },
  { title: "Review-ready context", body: "Screenshots, notes, and outcomes stay linked to execution." },
  { title: "Clear analytics", body: "Turn every trade into patterns you can actually act on." },
];

const signalPills = [
  { icon: ShieldCheck, label: "Discipline tracking" },
  { icon: BadgeCheck, label: "Behavior visibility" },
  { icon: CandlestickChart, label: "Performance proof" },
];

type HeroSectionProps = {
  primaryHref: string;
  primaryLabel: string;
};

export function HeroSection({ primaryHref, primaryLabel }: HeroSectionProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="px-4 pb-18 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pb-24 lg:pt-20">
      <div className="mx-auto grid w-full max-w-[1280px] gap-14 lg:grid-cols-[minmax(0,0.94fr)_minmax(500px,0.98fr)] lg:items-center xl:gap-16">
        <LandingReveal className="max-w-2xl">
          <p className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Built for serious traders
          </p>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-[-0.065em] text-foreground sm:text-5xl lg:text-[4.25rem] lg:leading-[1.02]">
            Trade with structure. Review with clarity.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
            Track every trade, enforce discipline, and improve performance with data, not emotion.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-xl bg-[linear-gradient(135deg,#1d4ed8_0%,#2563eb_45%,#d6a448_100%)] px-6 text-base text-white shadow-[0_24px_60px_-24px_rgba(37,99,235,0.78)] hover:brightness-110 dark:shadow-[0_28px_72px_-26px_rgba(37,99,235,0.55)]"
            >
              <Link to={primaryHref}>
                {primaryLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-xl px-6 text-base">
              <a href="#analytics">View Demo</a>
            </Button>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {proofCards.map((item, index) => (
              <LandingReveal
                key={item.title}
                delay={0.08 + index * 0.06}
                className="rounded-[1.5rem] border border-border/60 bg-card/75 p-5 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.25)] backdrop-blur-sm dark:bg-white/[0.04]"
              >
                <p className="text-sm font-semibold tracking-tight text-foreground">{item.title}</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.body}</p>
              </LandingReveal>
            ))}
          </div>
        </LandingReveal>

        <LandingReveal className="relative lg:pl-4 xl:pl-6" delay={0.1}>
          <div className="absolute inset-x-14 top-12 h-[58%] rounded-full bg-[radial-gradient(circle,_rgba(37,99,235,0.22),_transparent_64%)] blur-3xl dark:bg-[radial-gradient(circle,_rgba(37,99,235,0.28),_transparent_64%)]" />
          <div className="absolute bottom-4 right-14 h-28 w-28 rounded-full bg-amber-400/18 blur-3xl dark:bg-amber-300/12" />
          <motion.div
            animate={shouldReduceMotion ? undefined : { y: [0, -10, 0] }}
            transition={shouldReduceMotion ? undefined : { duration: 7.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            className="relative mx-auto max-w-[760px] xl:max-w-[780px]"
          >
            <LandingScreenshot
              src="/img/hero-dashboard.png"
              darkSrc="/img/hero-dashboard-dark.png"
              alt="IZLedger hero dashboard"
              priority
              className="bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(248,250,252,0.94))] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(2,6,23,0.9))]"
              imageClassName="aspect-[1.12/1] w-full"
            />
          </motion.div>

          <div className="pointer-events-none absolute left-3 bottom-10 hidden max-w-[210px] xl:left-2 xl:bottom-12 xl:max-w-[220px] lg:block">
            <div className="rounded-[1.35rem] border border-white/50 bg-white/88 px-4 py-4 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.38)] backdrop-blur dark:border-white/10 dark:bg-slate-950/76">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/85">Execution Layer</p>
              <p className="mt-2 text-sm leading-6 text-foreground">See process and outcome in one disciplined workflow.</p>
            </div>
          </div>

          <div className="pointer-events-none absolute right-2 top-12 hidden space-y-2.5 xl:right-1 xl:top-14 lg:block">
            {signalPills.map((pill, index) => {
              const Icon = pill.icon;

              return (
                <motion.div
                  key={pill.label}
                  animate={shouldReduceMotion ? undefined : { y: [0, index % 2 === 0 ? -6 : 6, 0] }}
                  transition={shouldReduceMotion ? undefined : { duration: 6 + index, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                  className="rounded-full border border-white/55 bg-white/90 px-4 py-2 shadow-[0_18px_48px_-30px_rgba(15,23,42,0.32)] backdrop-blur dark:border-white/10 dark:bg-slate-950/76"
                >
                  <div className="flex items-center gap-2 text-[15px] text-foreground">
                    <Icon className="h-4 w-4 text-primary" />
                    <span>{pill.label}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}
