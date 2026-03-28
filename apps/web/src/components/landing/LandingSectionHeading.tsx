import { cn } from "@/utils/class-names";

type LandingSectionHeadingProps = {
  kicker: string;
  title: string;
  description?: string;
  center?: boolean;
};

export function LandingSectionHeading({
  kicker,
  title,
  description,
  center = false,
}: LandingSectionHeadingProps) {
  return (
    <div className={cn("max-w-3xl space-y-4", center && "mx-auto text-center")}>
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">{kicker}</p>
      <h2 className="text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl lg:text-[2.85rem]">
        {title}
      </h2>
      {description ? (
        <p className="text-base leading-8 text-muted-foreground sm:text-lg">{description}</p>
      ) : null}
    </div>
  );
}
