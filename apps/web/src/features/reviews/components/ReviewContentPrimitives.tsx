import { cn } from "@/utils/class-names";

interface ReviewMetricCardProps {
  label: string;
  value: string;
}

export function ReviewMetricCard({ label, value }: ReviewMetricCardProps) {
  return (
    <div className="rounded-xl border bg-background/70 p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

interface ReviewTextSectionProps {
  label: string;
  value?: string | null;
  emptyLabel?: string;
}

export function ReviewTextSection({
  label,
  value,
  emptyLabel = "None.",
}: ReviewTextSectionProps) {
  return (
    <div className="rounded-xl border bg-background/70 p-4">
      <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={cn("text-sm leading-relaxed text-foreground", !value && "text-muted-foreground")}>
        {value || emptyLabel}
      </p>
    </div>
  );
}
