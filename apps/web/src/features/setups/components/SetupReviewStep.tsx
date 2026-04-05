import type { ReactNode } from "react";
import { DataBadge } from "@/components/DataBadge";
import type { SetupChecklistDraftItem } from "@/features/setups/components/SetupPreTradeSection";
import {
  buildRuleDrafts,
  type StrategyFormState,
  type SetupRuleType,
} from "@/features/setups/components/setup-form-state";

const RULE_LABELS: Record<SetupRuleType, string> = {
  entry: "Entry",
  confirmation: "Confirmation",
  invalidation: "Invalidation",
};

function SummaryBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 border-b border-border/50 pb-5 last:border-b-0 last:pb-0">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <div>{children}</div>
    </section>
  );
}

export function SetupReviewStep({
  form,
  checklistItems,
}: {
  form: StrategyFormState;
  checklistItems: SetupChecklistDraftItem[];
}) {
  const rules = buildRuleDrafts(form);

  return (
    <div className="grid gap-5">
      <SummaryBlock label="Name">
        <p className="text-base font-semibold text-foreground">{form.name.trim() || "Untitled setup"}</p>
      </SummaryBlock>

      <SummaryBlock label="Summary">
        <p className="text-sm leading-6 text-foreground">{form.description.trim() || "No short summary yet."}</p>
      </SummaryBlock>

      <SummaryBlock label="Rules">
        <div className="divide-y divide-border/50">
          {rules.length > 0 ? rules.map((rule) => (
            <div key={rule.type} className="grid gap-1 py-3 first:pt-0 last:pb-0 md:grid-cols-[140px_minmax(0,1fr)]">
              <p className="text-sm font-semibold text-foreground">{RULE_LABELS[rule.type]}</p>
              <p className="text-sm leading-6 text-muted-foreground">{rule.value.trim()}</p>
            </div>
          )) : (
            <p className="text-sm text-muted-foreground">No rules added yet.</p>
          )}
        </div>
      </SummaryBlock>

      <SummaryBlock label="Checklist">
        <div className="divide-y divide-border/50">
          {checklistItems.length > 0 ? checklistItems.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center gap-2 py-3 first:pt-0 last:pb-0">
              <p className="text-sm font-semibold text-foreground">{item.title || "Untitled item"}</p>
              {item.isRequired ? <DataBadge tone="warning">Required</DataBadge> : null}
              {item.description ? <p className="basis-full text-sm text-muted-foreground">{item.description}</p> : null}
            </div>
          )) : (
            <p className="text-sm text-muted-foreground">No checklist items added.</p>
          )}
        </div>
      </SummaryBlock>

      <SummaryBlock label="Color">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="h-11 w-11 rounded-2xl border border-black/5 shadow-sm ring-1 ring-black/5"
            style={{ backgroundColor: form.color }}
          />
          <p className="text-sm font-medium text-foreground">{form.color}</p>
        </div>
      </SummaryBlock>
    </div>
  );
}
