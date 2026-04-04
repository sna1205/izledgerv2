import { ClipboardList } from "lucide-react";

export function SetupChecklistEmptyState() {
  return (
    <div className="rounded-[24px] border border-dashed border-border bg-muted/15 px-5 py-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-background/80 text-muted-foreground">
        <ClipboardList className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm font-medium text-foreground">No pre-trade items yet</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Add the checks that should appear before you tag a trade with this setup.
      </p>
    </div>
  );
}
