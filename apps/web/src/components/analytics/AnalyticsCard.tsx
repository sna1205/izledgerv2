import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function AnalyticsCard({
  title,
  description,
  children,
  insights,
  className,
  delay = 0,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  insights: string[];
  className?: string;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1], delay }}
      className={cn(
        "relative overflow-hidden rounded-[1.35rem] border border-border/70 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.10),transparent_34%),linear-gradient(180deg,hsl(var(--card)),hsl(var(--card)))] p-6 text-card-foreground shadow-[0_28px_80px_-36px_rgba(15,23,42,0.18)] dark:bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_34%),linear-gradient(180deg,hsl(var(--card)/0.98),hsl(var(--card)/0.94))] dark:shadow-[0_28px_80px_-36px_rgba(1,8,24,0.88)]",
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border/80 to-transparent" />
      <div className="flex h-full flex-col">
        <div>
          <h3 className="text-lg font-medium text-foreground">{title}</h3>
          {description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p> : null}
        </div>

        <div className="mt-6 flex-1">{children}</div>

        <div className="mt-6 border-t border-border/60 pt-4">
          <div className="grid gap-2">
            {insights.map((insight) => (
              <p key={insight} className="text-sm text-muted-foreground">
                {insight}
              </p>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
