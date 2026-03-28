import type { PropsWithChildren } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/utils/class-names";

type LandingRevealProps = PropsWithChildren<{
  className?: string;
  delay?: number;
  y?: number;
}>;

export function LandingReveal({ children, className, delay = 0, y = 28 }: LandingRevealProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
