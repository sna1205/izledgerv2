import { ThemeToggle } from "@/components/ThemeToggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthPageShellProps {
  eyebrow: string;
  title: string;
  description?: string;
  cardTitle: string;
  cardDescription?: string;
  children: React.ReactNode;
}

export function AuthPageShell({
  eyebrow,
  title,
  description,
  cardTitle,
  cardDescription,
  children,
}: AuthPageShellProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--secondary)/0.45))] px-4 py-6 dark:bg-background sm:py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_transparent_42%)] dark:hidden" />
        <div className="absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top,_hsl(var(--foreground)/0.04),_transparent_52%)] dark:bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.24),_transparent_52%)]" />
        <div className="absolute left-1/2 top-24 h-52 w-52 -translate-x-1/2 rounded-full bg-secondary/80 blur-3xl dark:bg-primary/15" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-muted/70 blur-3xl dark:bg-muted/35" />
        <div className="absolute bottom-8 right-0 h-72 w-72 rounded-full bg-card/70 blur-3xl dark:bg-card/30" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-4 flex justify-end">
          <ThemeToggle />
        </div>

        <div className="mb-8 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">{eyebrow}</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
          {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
        </div>

        <Card className="rounded-3xl border-border/70 bg-card/90 backdrop-blur-xl shadow-[0_24px_70px_-32px_hsl(var(--foreground)/0.28)] dark:shadow-[0_28px_80px_-34px_rgba(0,0,0,0.72)]">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">{cardTitle}</CardTitle>
            {cardDescription ? <CardDescription>{cardDescription}</CardDescription> : null}
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}
