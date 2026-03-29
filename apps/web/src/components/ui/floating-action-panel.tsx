import type { HTMLAttributes } from "react";
import { cn } from "@/utils/class-names";

export function FloatingActionPanel({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-2xl border border-border bg-background/95 p-2 shadow-lg backdrop-blur", className)}
      {...props}
    />
  );
}
