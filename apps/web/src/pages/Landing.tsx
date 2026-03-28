import { LineChart } from "lucide-react";
import { Link } from "react-router-dom";
import { LandingAnalyticsSection } from "@/components/landing/LandingAnalyticsSection";
import { LandingBenefitsSection } from "@/components/landing/LandingBenefitsSection";
import { LandingConsistencySection } from "@/components/landing/LandingConsistencySection";
import { LandingFinalCTASection } from "@/components/landing/LandingFinalCTASection";
import { LandingHeroSection } from "@/components/landing/LandingHeroSection";
import { LandingReviewSection } from "@/components/landing/LandingReviewSection";
import { LandingTradeFlowSection } from "@/components/landing/LandingTradeFlowSection";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";

const navigationItems = [
  { label: "Analytics", href: "#analytics" },
  { label: "Consistency", href: "#consistency" },
  { label: "Trade Log", href: "#trade-log" },
  { label: "Reviews", href: "#reviews" },
  { label: "Waitlist", href: "#waitlist" },
];

export default function Landing() {
  const { user } = useAuth();
  const primaryHref = user ? "/dashboard" : "/register";
  const heroPrimaryLabel = user ? "Open Dashboard" : "Start Journaling Free";
  const finalCtaLabel = user ? "Open Dashboard" : "Join Waitlist";

  return (
    <div className="page-enter min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#edf3fb_30%,#f5f4ef_62%,#f2f0ea_100%)] text-foreground dark:bg-[linear-gradient(180deg,#04070d_0%,#08111f_34%,#0b1423_68%,#0e1620_100%)]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(30,64,175,0.14),_transparent_28%),radial-gradient(circle_at_84%_16%,_rgba(217,170,76,0.12),_transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.2),transparent_40%)] dark:bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.22),_transparent_32%),radial-gradient(circle_at_84%_16%,_rgba(217,170,76,0.12),_transparent_22%)]" />
        <div className="absolute inset-0 opacity-35 dark:opacity-16 soft-grid" />
        <div className="absolute left-[8%] top-[8%] h-72 w-72 rounded-full bg-sky-500/10 blur-3xl dark:bg-sky-500/12" />
        <div className="absolute bottom-[12%] right-[8%] h-80 w-80 rounded-full bg-amber-400/10 blur-3xl dark:bg-amber-300/8" />
      </div>

      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/72 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-card/80 shadow-[0_16px_40px_-24px_rgba(15,23,42,0.32)] dark:bg-white/[0.04] dark:shadow-[0_24px_50px_-28px_rgba(0,0,0,0.9)]">
              <LineChart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight text-foreground">IZLedger</p>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Trading Journal</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-muted-foreground lg:flex">
            {navigationItems.map((item) => (
              <a key={item.href} href={item.href} className="transition-colors hover:text-foreground">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Button asChild variant="ghost" className="hidden rounded-xl sm:inline-flex">
              <Link to="/login">Login</Link>
            </Button>
            <Button
              asChild
              className="rounded-xl bg-[linear-gradient(135deg,#1d4ed8_0%,#2563eb_48%,#d6a448_100%)] px-4 text-white shadow-[0_24px_54px_-24px_rgba(37,99,235,0.72)] hover:brightness-110 dark:shadow-[0_28px_70px_-26px_rgba(37,99,235,0.52)]"
            >
              <Link to={primaryHref}>{heroPrimaryLabel}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <LandingHeroSection primaryHref={primaryHref} primaryLabel={heroPrimaryLabel} />
        <LandingAnalyticsSection />
        <LandingConsistencySection />
        <LandingTradeFlowSection />
        <LandingReviewSection />
        <LandingBenefitsSection />
        <LandingFinalCTASection ctaHref={primaryHref} ctaLabel={finalCtaLabel} />
      </main>

      <footer className="border-t border-border/60 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-card/80">
              <LineChart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight text-foreground">IZLedger</p>
              <p className="text-sm text-muted-foreground">Structured journaling for serious traders.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {navigationItems.map((item) => (
              <a key={item.href} href={item.href} className="transition-colors hover:text-foreground">
                {item.label}
              </a>
            ))}
            <Link to="/login" className="transition-colors hover:text-foreground">
              Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
