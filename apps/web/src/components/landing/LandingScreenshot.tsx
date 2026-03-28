import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/utils/class-names";

type LandingScreenshotProps = {
  src: string;
  darkSrc?: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  chrome?: boolean;
  fit?: "contain" | "cover";
};

export function LandingScreenshot({
  src,
  darkSrc,
  alt,
  className,
  imageClassName,
  priority = false,
  chrome = true,
  fit = "contain",
}: LandingScreenshotProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";
  const activeSrc = isDark && darkSrc ? darkSrc : src;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[30px] border border-border/60 bg-[linear-gradient(180deg,hsl(var(--card)/0.98),hsl(var(--background)/0.92))] p-2 shadow-[0_32px_90px_-42px_rgba(15,23,42,0.55)] transition-transform duration-300 hover:-translate-y-1 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] dark:shadow-[0_36px_100px_-46px_rgba(0,0,0,0.92)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-12 top-0 h-24 bg-[radial-gradient(circle,_rgba(37,99,235,0.16),_transparent_72%)] blur-3xl dark:bg-[radial-gradient(circle,_rgba(37,99,235,0.22),_transparent_72%)]" />
      <div className="relative overflow-hidden rounded-[24px] border border-border/60 bg-background/95 dark:bg-slate-950/85">
        {chrome ? (
          <div className="flex items-center gap-2 border-b border-border/60 bg-background/80 px-4 py-3 dark:bg-white/[0.04]">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
            <div className="ml-3 h-8 flex-1 rounded-full border border-border/60 bg-muted/55 dark:bg-white/[0.05]" />
          </div>
        ) : null}
        <img
          src={activeSrc}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className={cn("h-full w-full", fit === "contain" ? "object-contain object-center" : "object-cover object-top", imageClassName)}
        />
      </div>
    </div>
  );
}
