import { CheckCircle2, Eye, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { LandingReveal } from "@/components/landing/LandingReveal";
import { LandingScreenshot } from "@/components/landing/LandingScreenshot";
import { LandingSectionHeading } from "@/components/landing/LandingSectionHeading";

const reviewPoints = [
  "Daily / Weekly reviews",
  "Lessons learned tracking",
  "Behavior improvement loop",
];

const benefitCards = [
  {
    icon: ShieldCheck,
    title: "Discipline tracking",
    body: "Measure whether you are actually following the plan, not just whether you made money.",
  },
  {
    icon: Sparkles,
    title: "Rule-based trading",
    body: "Build a cleaner routine around setups, sessions, and emotional control.",
  },
  {
    icon: Eye,
    title: "Performance clarity",
    body: "See where your edge holds up and where your process starts slipping.",
  },
  {
    icon: TrendingUp,
    title: "Consistency growth",
    body: "Use repeated reviews to turn scattered lessons into a compounding feedback loop.",
  },
];

export function ReviewSection() {
  return (
    <section id="reviews" className="border-y border-border/60 bg-card/[0.34] px-4 py-20 backdrop-blur-[2px] sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-16">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)] lg:items-center">
          <LandingReveal>
            <LandingSectionHeading
              kicker="Review System"
              title="Review. Learn. Improve."
              description="A focused review workflow that turns raw trade history into better behavior over time."
            />

            <div className="mt-8 space-y-4">
              {reviewPoints.map((point, index) => (
                <LandingReveal
                  key={point}
                  delay={0.08 + index * 0.06}
                  className="flex items-start gap-4 rounded-[1.5rem] border border-border/60 bg-background/74 p-5 shadow-[0_16px_48px_-34px_rgba(15,23,42,0.24)] dark:bg-white/[0.03]"
                >
                  <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-primary" />
                  <p className="text-base font-semibold tracking-tight text-foreground">{point}</p>
                </LandingReveal>
              ))}
            </div>
          </LandingReveal>

          <LandingReveal className="relative" delay={0.08}>
            <div className="absolute inset-0 rounded-[2.5rem] bg-[radial-gradient(circle,_rgba(217,170,76,0.14),_transparent_72%)] blur-3xl dark:bg-[radial-gradient(circle,_rgba(217,170,76,0.2),_transparent_72%)]" />
            <LandingScreenshot
              src="/img/reviews-page.png"
              darkSrc="/img/reviews-page-dark.png"
              alt="Reviews page screenshot"
              className="relative"
              imageClassName="aspect-[1.95/1] w-full"
            />
          </LandingReveal>
        </div>

        <LandingReveal>
          <LandingSectionHeading
            kicker="Benefits"
            title="Built to strengthen how you trade"
            description="Clear, structured feedback that supports better discipline and more repeatable execution."
            center
          />

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {benefitCards.map((benefit, index) => {
              const Icon = benefit.icon;

              return (
                <LandingReveal
                  key={benefit.title}
                  delay={0.05 + index * 0.05}
                  className="rounded-[1.75rem] border border-border/60 bg-background/74 p-6 shadow-[0_18px_48px_-34px_rgba(15,23,42,0.22)] transition-transform duration-300 hover:-translate-y-1 dark:bg-white/[0.03]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight text-foreground">{benefit.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{benefit.body}</p>
                </LandingReveal>
              );
            })}
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}
