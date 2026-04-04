import { Button } from "@/components/ui/button";
import { DataBadge } from "@/components/DataBadge";
import type { SetupChecklistDraftItem } from "@/features/setups/components/SetupPreTradeSection";
import type { StrategyFormState } from "@/features/setups/components/setup-form-state";

function SummaryBlock({
  label,
  value,
  fallback,
}: {
  label: string;
  value: string;
  fallback: string;
}) {
  return (
    <div className="rounded-[24px] border border-border/60 bg-background/70 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm leading-6 text-foreground">{value.trim() || fallback}</p>
    </div>
  );
}

export function SetupReviewStep({
  form,
  checklistItems,
  canUseInTrade,
  onUseInTrade,
}: {
  form: StrategyFormState;
  checklistItems: SetupChecklistDraftItem[];
  canUseInTrade: boolean;
  onUseInTrade: () => void;
}) {
  const checklistCount = checklistItems.length;
  const activeChecklistCount = checklistItems.filter((item) => item.isActive).length;
  const requiredChecklistCount = checklistItems.filter((item) => item.isRequired).length;

  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-4">
          <SummaryBlock label="Setup Name" value={form.name} fallback="No setup name yet." />
          <SummaryBlock label="Summary" value={form.description} fallback="No summary yet." />
          <SummaryBlock label="Entry" value={form.entryLogic} fallback="No entry logic yet." />
          <SummaryBlock label="Confirmation" value={form.confirmationLogic} fallback="No confirmation logic yet." />
          <SummaryBlock label="Invalidation" value={form.invalidationLogic} fallback="No invalidation logic yet." />
          <SummaryBlock label="Notes" value={form.notes} fallback="No notes yet." />
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-border/60 bg-background/70 p-4">
            <div className="flex items-center gap-2">
              <DataBadge tone={form.isArchived ? "warning" : "primary"}>
                {form.isArchived ? "Archived" : "Active"}
              </DataBadge>
              <DataBadge tone="neutral">{checklistCount} items</DataBadge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-2xl font-semibold text-foreground">{checklistCount}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{activeChecklistCount}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">{requiredChecklistCount}</p>
                <p className="text-sm text-muted-foreground">Required</p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-border/60 bg-background/70 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Checklist</p>
            <div className="mt-3 space-y-2">
              {checklistItems.length > 0 ? checklistItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border/50 bg-card/70 px-3 py-3">
                  <p className="text-sm font-medium text-foreground">{item.title || "Untitled item"}</p>
                  {item.description ? <p className="mt-1 text-sm text-muted-foreground">{item.description}</p> : null}
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">No checklist items yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-border/60 bg-background/70 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Appearance</p>
            <div className="mt-4 flex items-center gap-3">
              <span
                aria-hidden="true"
                className="h-12 w-12 rounded-2xl border border-black/5 shadow-sm ring-1 ring-black/5"
                style={{ backgroundColor: form.color }}
              />
              <div>
                <p className="text-sm font-semibold text-foreground">{form.color}</p>
                <p className="text-sm text-muted-foreground">{form.isArchived ? "Archived" : "Active"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-border/60 bg-background/70 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Trade</p>
            <Button className="mt-4 w-full" variant="outline" onClick={onUseInTrade} disabled={!canUseInTrade}>
              Use in Trade
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
