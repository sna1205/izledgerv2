import { AlertTriangle, CheckCircle2, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataBadge } from "@/components/DataBadge";
import { cn } from "@/utils/class-names";
import type { ChecklistEnforcementMode, ChecklistRule } from "@/types";

type ChecklistSelection = Record<string, { checked: boolean }>;

export function TradeChecklistCard({
  rules,
  selections,
  checklistMode,
  isLoading = false,
  errorMessage,
  onToggle,
  onCreateRule,
  title = "Pre-Trade Checklist",
  description = "Review your rules before logging this trade.",
  emptyTitle = "No checklist rules yet.",
  emptyDescription = "Create your first rule to bring discipline into each trade entry.",
  createLabel = "Create your first rule",
}: {
  rules: ChecklistRule[];
  selections: ChecklistSelection;
  checklistMode: ChecklistEnforcementMode;
  isLoading?: boolean;
  errorMessage?: string | null;
  onToggle: (ruleId: string, checked: boolean) => void;
  onCreateRule?: () => void;
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  createLabel?: string;
}) {
  const completedCount = rules.filter((rule) => selections[rule.id]?.checked).length;
  const requiredIncompleteCount = rules.filter((rule) => rule.isRequired && !selections[rule.id]?.checked).length;
  const isStrictBlocked = checklistMode === "strict" && requiredIncompleteCount > 0;
  const isSoftIncomplete = checklistMode === "soft" && requiredIncompleteCount > 0;

  return (
    <section className="surface space-y-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-background/80 text-muted-foreground">
              <ClipboardList className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-medium text-foreground">{title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
        </div>

        {!isLoading && rules.length > 0 ? (
          <div className="flex items-center gap-2">
            <DataBadge tone={completedCount === rules.length ? "success" : "neutral"}>
              {completedCount}
              {" "}
              of
              {" "}
              {rules.length}
              {" "}
              completed
            </DataBadge>
            <DataBadge tone={checklistMode === "strict" ? "warning" : "primary"}>
              {checklistMode === "strict" ? "Strict mode" : "Soft mode"}
            </DataBadge>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="surface-muted flex items-center gap-3 rounded-2xl p-4">
              <div className="h-5 w-5 rounded-md bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 rounded bg-muted" />
                <div className="h-3 w-64 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-2xl border border-danger/20 bg-danger/10 px-5 py-6 text-center">
          <p className="text-sm font-medium text-foreground">Checklist unavailable</p>
          <p className="mt-1 text-xs text-muted-foreground">{errorMessage}</p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && rules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-6 text-center">
          <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">{emptyDescription}</p>
          {onCreateRule ? (
            <Button variant="outline" size="sm" className="mt-4" onClick={onCreateRule}>
              {createLabel}
            </Button>
          ) : null}
        </div>
      ) : null}

      {!isLoading && rules.length > 0 && (isStrictBlocked || isSoftIncomplete) ? (
        <div
          className={cn(
            "flex items-start gap-3 rounded-2xl border px-4 py-3",
            isStrictBlocked
              ? "border-danger/20 bg-danger/10 text-danger"
              : "border-amber-400/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
          )}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="text-sm font-medium">{isStrictBlocked ? "Checklist incomplete" : "Required items still open"}</p>
            <p className="mt-1 text-xs opacity-90">
              {isStrictBlocked
                ? "You must complete all required rules before saving this trade."
                : "You can still save in soft mode, but the missed required rules will be recorded."}
            </p>
          </div>
        </div>
      ) : null}

      {!isLoading && rules.length > 0 ? (
        <div className="space-y-3">
          {rules.map((rule) => {
            const isChecked = selections[rule.id]?.checked ?? false;

            return (
              <label
                key={rule.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-4 transition-colors",
                  isChecked
                    ? "border-success/20 bg-success/5"
                    : "border-border/70 bg-background/70 hover:bg-muted/20",
                )}
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={(checked) => onToggle(rule.id, checked === true)}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{rule.title}</span>
                    {rule.isRequired ? <DataBadge tone="warning">Required</DataBadge> : <DataBadge tone="neutral">Optional</DataBadge>}
                    {isChecked ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Complete
                      </span>
                    ) : null}
                  </div>
                  {rule.description ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{rule.description}</p> : null}
                </div>
              </label>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
