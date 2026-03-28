import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { LandingReveal } from "@/components/landing/LandingReveal";
import { Button } from "@/components/ui/button";

type CTASectionProps = {
  ctaHref: string;
  ctaLabel: string;
};

export function CTASection({ ctaHref, ctaLabel }: CTASectionProps) {
  return (
    <section id="waitlist" className="px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
      <LandingReveal className="mx-auto w-full max-w-[1280px]">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-border/60 bg-[linear-gradient(135deg,rgba(29,78,216,0.12),rgba(214,164,72,0.12),rgba(255,255,255,0.7))] px-6 py-12 shadow-[0_32px_100px_-44px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:bg-[linear-gradient(135deg,rgba(29,78,216,0.18),rgba(214,164,72,0.14),rgba(255,255,255,0.03))] dark:shadow-[0_42px_120px_-52px_rgba(0,0,0,0.92)] sm:px-10 lg:px-14 lg:py-14">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.4),_transparent_35%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.08),_transparent_35%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">Final CTA</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">
                Start trading like a professional.
              </h2>
              <p className="mt-4 text-base leading-8 text-muted-foreground">
                No card required. Early users get priority access.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-xl bg-[linear-gradient(135deg,#1d4ed8_0%,#2563eb_45%,#d6a448_100%)] px-6 text-base text-white shadow-[0_24px_60px_-24px_rgba(37,99,235,0.78)] hover:brightness-110 dark:shadow-[0_28px_72px_-26px_rgba(37,99,235,0.55)]"
              >
                <Link to={ctaHref}>
                  {ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </LandingReveal>
    </section>
  );
}
