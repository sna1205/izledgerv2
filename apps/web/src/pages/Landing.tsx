import { ArrowRight, BarChart3, CalendarDays, CheckCircle2, ChevronRight, ClipboardList, Landmark, LineChart, Sparkles, Tags } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const heroStats = [
  { value: "Structured", label: "trade logging built for review" },
  { value: "Focused", label: "analytics designed for behavior" },
  { value: "Clear", label: "proof of progress over hype" },
];

const problemPoints = [
  "Trades get logged, but the lesson behind them gets lost.",
  "Most journals track numbers without improving decision making.",
  "Mistakes repeat because review systems are too messy or too shallow.",
];

const solutionPoints = [
  "Log trades with setups, session context, emotions, and screenshots.",
  "Review execution quality and capture the lesson while the trade is still fresh.",
  "See performance by account, session, setup, emotion, and calendar rhythm.",
];

const features = [
  {
    icon: ClipboardList,
    title: "Trade Logging",
    description: "Capture pair, direction, setup, session, emotion, screenshots, and result in one clean workflow.",
  },
  {
    icon: Sparkles,
    title: "Trade Detail Review",
    description: "Turn every execution into a review workspace with notes, screenshots, ratings, and lessons.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "See win rate, emotion performance, session edges, and setup quality at a glance.",
  },
  {
    icon: CalendarDays,
    title: "Calendar Review",
    description: "Track daily PnL, streaks, and weekly rhythm in a journal-first trading calendar.",
  },
  {
    icon: Tags,
    title: "Setup Tracking",
    description: "Measure how each trading setup actually performs across conditions and time.",
  },
  {
    icon: Landmark,
    title: "Account Tracking",
    description: "Separate funded, personal, challenge, and crypto accounts without losing clarity.",
  },
];

const audiences = [
  {
    title: "Day Traders",
    description: "Stay sharp on execution, review mistakes faster, and keep your process clean under pressure.",
  },
  {
    title: "Prop Firm Traders",
    description: "Track consistency, discipline, and account-level performance with structure that supports rules.",
  },
  {
    title: "Retail Traders Building Discipline",
    description: "Replace scattered notes with a system that makes reflection part of the trading routine.",
  },
  {
    title: "Review-Driven Performers",
    description: "Use every trade as feedback, not just another number in a spreadsheet.",
  },
];

const showcaseItems = [
  {
    title: "See the full picture",
    heading: "A dashboard that turns scattered execution into one clear performance view.",
    body: "Track your session activity, equity curve, and recent trades without digging through spreadsheets or screenshots. IZLedger gives serious traders an overview that feels operational, not decorative.",
    image: "/img/Dashboard.png",
    darkImage: "/img/Dashboard-dark.png",
    imageAlt: "IZLedger dashboard overview",
  },
  {
    title: "Log trades without friction",
    heading: "A premium journal ledger built to scan context, result, and review status in seconds.",
    body: "Trade logs are organized like a real execution dashboard. Pair, session, setup, emotion, review status, and position context stay visible so traders can move fast without losing detail.",
    image: "/img/Tradelog1.png",
    darkImage: "/img/Tradelog1-dark.png",
    imageAlt: "IZLedger trade log ledger",
  },
  {
    title: "Capture your workflow",
    heading: "From ledger to screenbook, every trade stays reviewable and visually grounded.",
    body: "Switch into a screenshot-first view when you want chart context and pattern recognition, not just rows. This makes journaling easier for traders who review visually.",
    image: "/img/Tradelog2.png",
    darkImage: "/img/Tradelog2-dark.png",
    imageAlt: "IZLedger trade screenbook",
  },
  {
    title: "Review trades with context",
    heading: "Trade detail pages built like execution reports, not flat data sheets.",
    body: "Bring screenshots, notes, review scores, emotional context, and structured reflection into one premium workspace that helps lessons stick.",
    image: "/img/Tradedetail.png",
    darkImage: "/img/Tradedetail-dark.png",
    imageAlt: "IZLedger trade detail review page",
  },
  {
    title: "Track progress over time",
    heading: "Calendar-based feedback that makes consistency visible day by day.",
    body: "See profitable days, losing days, inactivity, and weekly rhythm in one glance. The calendar makes behavior patterns obvious before they become expensive.",
    image: "/img/Calendar.png",
    darkImage: "/img/Calendar-dark.png",
    imageAlt: "IZLedger analytics calendar",
  },
];

function SectionHeading({
  kicker,
  title,
  description,
  center = false,
}: {
  kicker: string;
  title: string;
  description: string;
  center?: boolean;
}) {
  return (
    <div className={cn("max-w-3xl space-y-4", center && "mx-auto text-center")}>
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">{kicker}</p>
      <h2 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">{title}</h2>
      <p className="text-base leading-7 text-muted-foreground sm:text-lg">{description}</p>
    </div>
  );
}

function BrowserFrame({
  src,
  darkSrc,
  alt,
  className,
}: {
  src: string;
  darkSrc?: string;
  alt: string;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-[28px] border border-border/60 bg-card shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)] dark:shadow-[0_34px_70px_-34px_rgba(0,0,0,0.72)]", className)}>
      <div className="flex items-center gap-2 border-b border-border/60 bg-background/80 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        <div className="ml-3 h-8 flex-1 rounded-full border border-border/60 bg-muted/50" />
      </div>
      <img src={src} alt={alt} className={cn("h-full w-full object-cover object-top", darkSrc && "dark:hidden")} />
      {darkSrc ? <img src={darkSrc} alt={alt} className="hidden h-full w-full object-cover object-top dark:block" /> : null}
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const primaryHref = user ? "/dashboard" : "/register";
  const primaryLabel = user ? "Open App" : "Get Started";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.22),_transparent_42%)]" />
        <div className="absolute left-1/2 top-[280px] h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-card shadow-sm">
              <LineChart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight text-foreground">IZLedger</p>
              <p className="text-xs text-muted-foreground">Trading journal</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-muted-foreground lg:flex">
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#showcase" className="transition-colors hover:text-foreground">Reviews</a>
            <a href="#analytics" className="transition-colors hover:text-foreground">Analytics</a>
            <a href="#waitlist" className="transition-colors hover:text-foreground">Waitlist</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Button asChild variant="ghost" className="hidden rounded-xl sm:inline-flex">
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild className="rounded-xl px-4 shadow-lg shadow-primary/20">
              <Link to={primaryHref}>{primaryLabel}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pb-24">
          <div className="mx-auto grid w-full max-w-[1280px] gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(520px,0.95fr)] lg:items-center">
            <div className="max-w-2xl">
              <p className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Built for disciplined traders
              </p>
              <h1 className="mt-6 text-4xl font-semibold tracking-[-0.06em] text-foreground sm:text-5xl lg:text-6xl">
                Trade with structure. Review with clarity. Improve with proof.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
                IZLedger helps serious traders log trades, review mistakes, track performance, and build consistency with a cleaner workflow built around execution quality, not noise.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 rounded-xl px-6 text-base shadow-xl shadow-primary/20">
                  <Link to={primaryHref}>
                    {primaryLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 rounded-xl px-6 text-base">
                  <a href="#showcase">View Demo</a>
                </Button>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                {heroStats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
                    <p className="text-lg font-semibold tracking-tight text-foreground">{stat.value}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 rounded-[36px] bg-primary/12 blur-3xl" />
              <div className="relative">
                <BrowserFrame
                  src="/img/Dashboard.png"
                  darkSrc="/img/Dashboard-dark.png"
                  alt="IZLedger dashboard"
                  className="rotate-[-1.5deg] bg-card/95"
                />

                <div className="absolute -left-6 bottom-8 hidden w-[220px] lg:block">
                  <BrowserFrame src="/img/Tradedetail.png" darkSrc="/img/Tradedetail-dark.png" alt="IZLedger trade detail" className="rotate-[-7deg]" />
                </div>

                <div className="absolute -right-4 top-10 hidden w-[210px] lg:block">
                  <BrowserFrame src="/img/Calendar.png" darkSrc="/img/Calendar-dark.png" alt="IZLedger calendar" className="rotate-[6deg]" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border/60 bg-card/45 px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto grid w-full max-w-[1280px] gap-4 md:grid-cols-3">
            {[
              { title: "Built for serious execution", body: "Structured journaling designed for traders who care about process, not hype." },
              { title: "Review every mistake", body: "Capture discipline, emotional state, notes, screenshots, and the lesson in one place." },
              { title: "Measure consistency clearly", body: "See the patterns behind your results across sessions, setups, accounts, and time." },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-border/60 bg-background/70 p-5">
                <p className="text-lg font-semibold tracking-tight text-foreground">{item.title}</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid w-full max-w-[1280px] gap-12 lg:grid-cols-2">
            <div>
              <SectionHeading
                kicker="The problem"
                title="Most traders collect trade data without creating better behavior."
                description="Spreadsheets, screenshots, and scattered notes create activity, but they rarely create improvement. Traders keep repeating mistakes because the review loop is weak."
              />
            </div>
            <div className="space-y-4">
              {problemPoints.map((point) => (
                <div key={point} className="rounded-2xl border border-border/60 bg-card p-5">
                  <p className="text-base leading-7 text-foreground">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-border/60 bg-card/40 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid w-full max-w-[1280px] gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
            <SectionHeading
              kicker="The solution"
              title="IZLedger gives traders a review system built for structure, reflection, and measurable improvement."
              description="Every part of the product is designed to connect execution data with reflection, so the journal becomes a feedback loop that actually changes how you trade."
            />

            <div className="space-y-4">
              {solutionPoints.map((point) => (
                <div key={point} className="flex gap-4 rounded-2xl border border-border/60 bg-background/70 p-5">
                  <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-primary" />
                  <p className="text-base leading-7 text-foreground">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1280px]">
            <SectionHeading
              kicker="Core capabilities"
              title="A premium workflow for logging, reviewing, and improving."
              description="IZLedger gives traders the structure to move from random trade notes to a serious performance system."
              center
            />

            <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;

                return (
                  <div key={feature.title} className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm transition-transform duration-300 hover:-translate-y-1">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold tracking-tight text-foreground">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="showcase" className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1280px]">
            <SectionHeading
              kicker="Product preview"
              title="Built like a premium trading product, not a generic journal."
              description="Every screen is designed to reduce friction, raise clarity, and make reflection part of the process."
              center
            />

            <div className="mt-14 space-y-16">
              {showcaseItems.map((item, index) => (
                <div
                  key={item.title}
                  className={cn(
                    "grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center",
                    index % 2 === 1 && "lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]",
                  )}
                >
                  <div className={cn(index % 2 === 1 && "lg:order-2")}>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">{item.title}</p>
                    <h3 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground">{item.heading}</h3>
                    <p className="mt-4 max-w-xl text-base leading-8 text-muted-foreground">{item.body}</p>
                    <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-foreground">
                      Explore the workflow
                      <ChevronRight className="h-4 w-4 text-primary" />
                    </div>
                  </div>

                  <div className={cn("relative", index % 2 === 1 && "lg:order-1")}>
                    <div className="absolute inset-0 rounded-[34px] bg-primary/10 blur-3xl" />
                    <BrowserFrame src={item.image} darkSrc={item.darkImage} alt={item.imageAlt} className="relative" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="analytics" className="border-y border-border/60 bg-card/45 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1280px]">
            <SectionHeading
              kicker="How it works"
              title="A simple loop that turns every trade into useful feedback."
              description="IZLedger keeps the workflow minimal enough to use every day, but structured enough to actually improve performance."
              center
            />

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {[
                { step: "01", title: "Log your trades", body: "Capture execution details, screenshots, setups, account, and emotional context immediately." },
                { step: "02", title: "Review your decisions", body: "Score the trade, document mistakes, and record the lesson while it still feels real." },
                { step: "03", title: "Improve your consistency", body: "Use dashboards, analytics, and calendar rhythm to spot patterns that matter." },
              ].map((item) => (
                <div key={item.step} className="rounded-3xl border border-border/60 bg-background/70 p-6">
                  <p className="text-sm font-semibold tracking-[0.24em] text-primary">{item.step}</p>
                  <h3 className="mt-4 text-xl font-semibold tracking-tight text-foreground">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1280px]">
            <SectionHeading
              kicker="Who it's for"
              title="Designed for traders who want structure, not noise."
              description="Whether you are trading a funded account, refining an edge, or building discipline from scratch, IZLedger is built to support process."
              center
            />

            <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {audiences.map((audience) => (
                <div key={audience.title} className="rounded-3xl border border-border/60 bg-card p-6">
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">{audience.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{audience.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="waitlist" className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1280px]">
            <div className="overflow-hidden rounded-[36px] border border-border/60 bg-card px-6 py-12 shadow-[0_28px_70px_-38px_rgba(15,23,42,0.55)] sm:px-10 lg:px-14">
              <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">Final CTA</p>
                  <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">
                    Turn every trade into useful feedback.
                  </h2>
                  <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
                    Stop guessing. Start reviewing with structure, context, and proof. IZLedger is built for traders who want measurable improvement in execution and consistency.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                  <Button asChild size="lg" className="h-12 rounded-xl px-6 text-base">
                    <Link to={primaryHref}>{primaryLabel}</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="h-12 rounded-xl px-6 text-base">
                    <Link to="/login">Login</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-[1280px] gap-8 md:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.6fr))]">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-card">
                <LineChart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-tight text-foreground">IZLedger</p>
                <p className="text-xs text-muted-foreground">Trading journal platform</p>
              </div>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-7 text-muted-foreground">
              Premium journaling, review, and performance tracking for traders who want clarity, discipline, and measurable improvement.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Product</p>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <a href="#features" className="block hover:text-foreground">Features</a>
              <a href="#showcase" className="block hover:text-foreground">Showcase</a>
              <a href="#analytics" className="block hover:text-foreground">How it works</a>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Access</p>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <Link to="/login" className="block hover:text-foreground">Login</Link>
              <Link to="/register" className="block hover:text-foreground">Get Started</Link>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Legal</p>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <span className="block">Privacy</span>
              <span className="block">Terms</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
