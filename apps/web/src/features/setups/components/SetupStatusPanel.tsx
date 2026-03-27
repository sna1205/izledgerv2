import { ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export function SetupStatusPanel({
  isArchived,
  onStatusChange,
}: {
  isArchived: boolean;
  onStatusChange: (nextArchived: boolean) => void;
}) {
  return (
    <div className="rounded-[28px] border border-border bg-card/85 p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-background/75 text-muted-foreground">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">Status</h2>
          <p className="text-sm text-muted-foreground">Keep active playbooks easy to scan while preserving old setup history safely.</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-[24px] border border-border/60 bg-background/60 px-4 py-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{isArchived ? "Archived" : "Active"}</p>
          <p className="text-xs leading-5 text-muted-foreground">
            Archived setups remain available on historical trades but fade from your current playbook stack.
          </p>
        </div>

        <Switch
          checked={!isArchived}
          onCheckedChange={(checked) => onStatusChange(!checked)}
          aria-label="Toggle setup active status"
        />
      </div>
    </div>
  );
}
