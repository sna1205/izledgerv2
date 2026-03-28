import { LandingReveal } from "@/components/landing/LandingReveal";
import { LandingScreenshot } from "@/components/landing/LandingScreenshot";

const reviewSteps = [
  {
    step: "01",
    title: "Review the week with structure",
    body: "Pull together results, behavior, and recurring lessons instead of relying on memory and emotion.",
  },
  {
    step: "02",
    title: "Name the pattern clearly",
    body: "Strengths, weaknesses, and next improvements stay visible so the process gets sharper over time.",
  },
  {
    step: "03",
    title: "Carry better rules forward",
    body: "Each review becomes part of a discipline loop that improves future execution, not just past commentary.",
  },
];

export function LandingReviewSection() {
  return (
    <section id="reviews" className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <LandingReveal className="mx-auto w-full max-w-[1280px]">
        <div className="relative overflow-hidden rounded-[3rem] border border-border/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(238,244,251,0.94),rgba(243,239,230,0.84))] px-6 py-8 shadow-[0_40px_100px_-44px_rgba(15,23,42,0.24)] dark:border-slate-800 dark:bg-[linear-gradient(145deg,#06101c_0%,#0b1627_42%,#0f1f35_100%)] dark:shadow-[0_46px_120px_-46px_rgba(2,6,23,0.92)] sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="absolute left-[10%] top-[-6%] h-56 w-56 rounded-full bg-sky-500/12 blur-3xl dark:bg-sky-500/16" />
          <div className="absolute bottom-[-14%] right-[6%] h-56 w-56 rounded-full bg-amber-400/10 blur-3xl dark:bg-amber-400/14" />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start xl:gap-12">
            <div className="max-w-xl text-foreground dark:text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/85 dark:text-sky-200/80">Review System</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] sm:text-5xl lg:text-[3.5rem] lg:leading-[1.02]">
                Review. Learn. Improve.
              </h2>
              <p className="mt-5 text-base leading-8 text-muted-foreground dark:text-slate-300 sm:text-lg">
                This is where the platform closes the loop. Review becomes a repeatable operating system for getting
                better, not a soft afterthought.
              </p>

            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {reviewSteps.map((step, index) => (
                <LandingReveal
                  key={step.step}
                  delay={0.08 + index * 0.04}
                  className="rounded-[1.8rem] border border-border/70 bg-white/62 p-5 shadow-[0_20px_48px_-36px_rgba(15,23,42,0.16)] backdrop-blur dark:border-white/12 dark:bg-white/[0.04]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-sm font-semibold text-primary dark:border-white/14 dark:bg-white/[0.05] dark:text-sky-100">
                    {step.step}
                  </div>
                  <p className="mt-5 text-base font-semibold tracking-tight text-foreground dark:text-white">{step.title}</p>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground dark:text-slate-300">{step.body}</p>
                </LandingReveal>
              ))}
            </div>
          </div>

          <div className="relative mt-10 lg:mt-12">
            <div className="pointer-events-none absolute right-6 top-6 hidden rounded-full border border-border/70 bg-white/72 px-4 py-2 text-sm font-medium text-foreground shadow-[0_18px_38px_-28px_rgba(15,23,42,0.22)] dark:border-white/10 dark:bg-slate-950/74 dark:text-white lg:block">
              Weekly review operating system
            </div>
            <div className="rounded-[2.5rem] border border-white/60 bg-white/42 p-3 shadow-[0_26px_74px_-40px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-white/[0.03] sm:p-4 lg:p-5">
              <LandingScreenshot
                src="/img/reviews-page.png"
                darkSrc="/img/reviews-page-dark.png"
                alt="IZLedger reviews page screenshot"
                chrome={false}
                className="rounded-[2.3rem] border-border/60 bg-white/72 p-4 shadow-[0_30px_80px_-38px_rgba(15,23,42,0.2)] hover:translate-y-0 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_34px_90px_-42px_rgba(0,0,0,0.94)]"
                imageClassName="aspect-[2.08/1] w-full rounded-[1.6rem]"
              />
            </div>
          </div>
        </div>
      </LandingReveal>
    </section>
  );
}
