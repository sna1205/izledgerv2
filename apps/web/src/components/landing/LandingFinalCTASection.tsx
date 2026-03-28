import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { LandingReveal } from "@/components/landing/LandingReveal";
import { Button } from "@/components/ui/button";

type LandingFinalCTASectionProps = {
  ctaHref: string;
  ctaLabel: string;
};

export function LandingFinalCTASection({ ctaHref, ctaLabel }: LandingFinalCTASectionProps) {
  return (
    <section id="waitlist" className="px-4 pb-20 pt-8 sm:px-6 lg:px-8 lg:pb-28 lg:pt-12">
      <LandingReveal className="mx-auto w-full max-w-[1160px]">
        <div className="relative overflow-hidden rounded-[3.4rem] border border-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(238,244,251,0.96),rgba(245,239,227,0.92))] px-6 py-12 shadow-[0_42px_100px_-46px_rgba(15,23,42,0.24)] dark:border-slate-800 dark:bg-[linear-gradient(135deg,#06101d_0%,#0b1730_48%,#1c160e_100%)] dark:shadow-[0_50px_120px_-50px_rgba(2,6,23,0.96)] sm:px-10 sm:py-14 lg:px-16 lg:py-[4.5rem]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.14),transparent_28%),radial-gradient(circle_at_86%_22%,rgba(217,170,76,0.14),transparent_22%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.18),transparent_28%),radial-gradient(circle_at_86%_22%,rgba(217,170,76,0.18),transparent_22%)]" />
          <div className="pointer-events-none absolute inset-0 soft-grid opacity-[0.12] dark:opacity-[0.08]" />

          <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center text-foreground dark:text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/85 dark:text-sky-200/80">Final CTA</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] sm:text-5xl lg:text-[3.55rem] lg:leading-[1.02]">
              Start trading like a professional.
            </h2>
            <p className="mt-5 text-base leading-8 text-muted-foreground dark:text-slate-300 sm:text-lg">
              Build structure, review performance, and improve with clarity from the first logged trade to the final
              weekly review.
            </p>
            <p className="mt-4 text-sm text-muted-foreground dark:text-slate-300/90">No card required. Early users get priority access.</p>

            <div className="mt-8 flex flex-col items-center gap-4">
              <Button
                asChild
                size="lg"
                className="h-[58px] rounded-2xl bg-[linear-gradient(135deg,#1d4ed8_0%,#3b82f6_46%,#d6a448_100%)] px-8 text-base text-white shadow-[0_28px_70px_-26px_rgba(37,99,235,0.74)] hover:brightness-110"
              >
                <Link to={ctaHref}>
                  {ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground dark:text-slate-300/90">
                <span>Structured journaling</span>
                <span className="hidden h-1 w-1 rounded-full bg-primary/60 sm:block" />
                <span>Review-ready analytics</span>
                <span className="hidden h-1 w-1 rounded-full bg-primary/60 sm:block" />
                <span>Consistency that compounds</span>
              </div>
            </div>
          </div>
        </div>
      </LandingReveal>
    </section>
  );
}
