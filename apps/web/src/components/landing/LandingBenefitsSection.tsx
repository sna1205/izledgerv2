import { Eye, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { LandingReveal } from "@/components/landing/LandingReveal";

const benefits = [
  {
    icon: ShieldCheck,
    title: "Discipline tracking",
    body: "See whether you followed the process, not just whether the trade made money.",
  },
  {
    icon: Sparkles,
    title: "Rule-based journaling",
    body: "Keep setups, sessions, emotions, and notes structured enough to review properly.",
  },
  {
    icon: Eye,
    title: "Performance clarity",
    body: "Understand where your edge holds and where your execution starts drifting.",
  },
  {
    icon: TrendingUp,
    title: "Consistency growth",
    body: "Turn recurring reviews into a feedback loop that compounds over time.",
  },
];

export function LandingBenefitsSection() {
  return (
    <section className="px-4 pb-10 pt-20 sm:px-6 lg:px-8 lg:pb-12 lg:pt-24">
      <div className="mx-auto grid w-full max-w-[1280px] gap-10 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:items-start xl:gap-14">
        <LandingReveal className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/85">Why IZLedger</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-foreground sm:text-5xl lg:text-[3.2rem] lg:leading-[1.04]">
            Built to strengthen how you trade
          </h2>
          <p className="mt-5 text-base leading-8 text-muted-foreground sm:text-lg">
            Keep decisions reviewable, patterns visible, and your process structured enough to improve with intention.
          </p>
        </LandingReveal>

        <div className="grid gap-4 sm:grid-cols-2">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;

            return (
              <LandingReveal
                key={benefit.title}
                delay={0.05 + index * 0.04}
                className={`rounded-[2rem] border border-border/70 bg-white/65 p-6 shadow-[0_28px_80px_-46px_rgba(15,23,42,0.24)] backdrop-blur dark:bg-white/[0.03] sm:p-7 ${
                  index % 2 === 1 ? "sm:translate-y-8" : ""
                }`}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight text-foreground">{benefit.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{benefit.body}</p>
              </LandingReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
