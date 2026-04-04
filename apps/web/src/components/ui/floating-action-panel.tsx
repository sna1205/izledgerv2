import type { HTMLAttributes } from "react";
import { cn } from "@/utils/class-names";

export function FloatingActionPanel({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("bg-transparent p-0 shadow-none backdrop-blur-0", className)}
      {...props}
    />
  );
}
