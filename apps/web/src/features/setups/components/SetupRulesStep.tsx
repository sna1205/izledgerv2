import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SetupRuleDraft, SetupRuleType } from "@/features/setups/components/setup-form-state";

const RULE_LABELS: Record<SetupRuleType, string> = {
  entry: "Entry",
  confirmation: "Confirmation",
  invalidation: "Invalidation",
};

export function SetupRulesStep({
  rules,
  availableRuleTypes,
  onAddRule,
  onRuleChange,
  onRuleTypeChange,
  onRemoveRule,
}: {
  rules: SetupRuleDraft[];
  availableRuleTypes: readonly SetupRuleType[];
  onAddRule: () => void;
  onRuleChange: (type: SetupRuleType, value: string) => void;
  onRuleTypeChange: (currentType: SetupRuleType, nextType: SetupRuleType) => void;
  onRemoveRule: (type: SetupRuleType) => void;
}) {
  const canAddRule = availableRuleTypes.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          {rules.length} {rules.length === 1 ? "rule" : "rules"}
        </div>
        <Button type="button" onClick={onAddRule} disabled={!canAddRule} className="rounded-full px-4">
          <Plus className="h-4 w-4" />
          Add Rule
        </Button>
      </div>

      <div className="divide-y divide-border/50">
        {rules.length > 0 ? rules.map((rule) => (
          <article key={rule.type} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <Select value={rule.type} onValueChange={(value) => onRuleTypeChange(rule.type, value as SetupRuleType)}>
              <SelectTrigger className="h-11 w-[150px] rounded-2xl border-border/60 bg-background shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[rule.type, ...availableRuleTypes].map((type) => (
                  <SelectItem key={type} value={type}>{RULE_LABELS[type]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              value={rule.value}
              onChange={(event) => onRuleChange(rule.type, event.target.value)}
              placeholder={
                rule.type === "entry"
                  ? "Retest level mapped"
                  : rule.type === "confirmation"
                    ? "Structure confirmed"
                    : "Reclaim fails"
              }
              className="h-11 flex-1 rounded-2xl border-border/60 bg-background shadow-none"
              aria-label={`${RULE_LABELS[rule.type]} rule`}
            />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemoveRule(rule.type)}
              className="h-11 w-11 rounded-full text-muted-foreground hover:bg-destructive/8 hover:text-destructive"
              aria-label={`Remove ${RULE_LABELS[rule.type]} rule`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </article>
        )) : (
          <div className="py-8 text-sm text-muted-foreground">
            No rules added.
          </div>
        )}
      </div>
    </div>
  );
}
