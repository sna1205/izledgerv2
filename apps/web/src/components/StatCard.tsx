interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
}

export function StatCard({ label, value, subtext }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm shadow-slate-200/40 dark:shadow-black/20">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </p>
      <p className="text-3xl font-semibold tabular text-card-foreground">
        {value}
      </p>
      {subtext && (
        <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
      )}
    </div>
  );
}
