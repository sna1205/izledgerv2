import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/utils/class-names";

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
        "surface flex h-full flex-col p-4 text-card-foreground",
        className,
      )}
    >
      <div className="flex h-full flex-col">
        <div>
          <h3 className="text-base font-medium text-foreground">{title}</h3>
          {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
        </div>

        <div className="mt-4 flex-1">{children}</div>

        <div className="mt-4 border-t border-border pt-4">
          <div className="grid gap-2">
            {insights.map((insight) => (
              <p key={insight} className="text-xs text-muted-foreground">
                {insight}
              </p>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
