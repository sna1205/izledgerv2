import { cn } from "@/utils/class-names";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "skeleton rounded-xl",
        className,
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

export { Skeleton };
