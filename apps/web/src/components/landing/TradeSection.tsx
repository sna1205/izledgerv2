import { Camera, CheckCircle2, ClipboardList, SearchCheck } from "lucide-react";
import { LandingReveal } from "@/components/landing/LandingReveal";
import { LandingScreenshot } from "@/components/landing/LandingScreenshot";
import { LandingSectionHeading } from "@/components/landing/LandingSectionHeading";

const loggingFeatures = [
  { icon: Camera, label: "Screenshot support" },
  { icon: ClipboardList, label: "Setup, emotion, session tracking" },
  { icon: SearchCheck, label: "Clean structured entries" },
];

export function TradeSection() {
  return (
    <section id="trade-log" className="px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center">
          <LandingReveal>
            <LandingSectionHeading
              kicker="Trade Logging"
              title="Log trades like a professional"
              description="Capture the full execution story in a workflow built for disciplined review, not fragmented note taking."
            />

            <div className="mt-8 space-y-4">
              {loggingFeatures.map((feature, index) => {
                const Icon = feature.icon;

                return (
                  <LandingReveal
                    key={feature.label}
                    delay={0.08 + index * 0.06}
                    className="flex items-center gap-4 rounded-[1.5rem] border border-border/60 bg-card/72 p-5 shadow-[0_16px_46px_-34px_rgba(15,23,42,0.24)] dark:bg-white/[0.03]"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-base font-semibold tracking-tight text-foreground">{feature.label}</p>
                  </LandingReveal>
                );
              })}
            </div>
          </LandingReveal>

          <div className="grid gap-4 md:grid-cols-2">
            <LandingReveal>
              <LandingScreenshot
                src="/img/trade-log1.png"
                darkSrc="/img/trade-log1-dark.png"
                alt="Trade log table screenshot"
                className="h-full"
                imageClassName="aspect-[1.22/1] w-full"
              />
            </LandingReveal>
            <LandingReveal delay={0.08} className="md:pt-12">
              <LandingScreenshot
                src="/img/trade-log2.png"
                darkSrc="/img/trade-log2-dark.png"
                alt="Trade log visual review screenshot"
                className="h-full"
                imageClassName="aspect-[1.22/1] w-full"
              />
            </LandingReveal>
          </div>
        </div>

        <div className="grid gap-12 lg:grid-cols-[minmax(520px,1.05fr)_minmax(0,0.95fr)] lg:items-center">
          <LandingReveal className="relative">
            <div className="absolute inset-0 rounded-[2.5rem] bg-[radial-gradient(circle,_rgba(37,99,235,0.14),_transparent_72%)] blur-3xl dark:bg-[radial-gradient(circle,_rgba(37,99,235,0.22),_transparent_72%)]" />
            <LandingScreenshot
              src="/img/trade-detail.png"
              darkSrc="/img/trade-detail-dark.png"
              alt="Trade detail screenshot"
              className="relative"
              imageClassName="aspect-[1.95/1] w-full"
            />
          </LandingReveal>

          <LandingReveal>
            <LandingSectionHeading
              kicker="Trade Detail"
              title="Deep dive every trade"
              description="Review execution, mistakes, and improvement areas in one place."
            />
            <div className="mt-8 rounded-[1.75rem] border border-border/60 bg-background/74 p-6 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.24)] dark:bg-white/[0.03]">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-primary" />
                <p className="text-base leading-8 text-muted-foreground">
                  Keep charts, context, and execution notes aligned so each trade becomes a concrete learning asset.
                </p>
              </div>
            </div>
          </LandingReveal>
        </div>
      </div>
    </section>
  );
}
