import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SETUP_TEMPLATE_PRESETS } from "@/features/setups/setup-presets";
import type { StrategyFormState } from "@/features/setups/components/setup-form-state";
import { cn } from "@/utils/class-names";

export function SetupBasicInfoStep({
  form,
  validationErrors,
  onFormChange,
  onApplyTemplate,
}: {
  form: StrategyFormState;
  validationErrors?: {
    name?: string;
  };
  onFormChange: (updater: (current: StrategyFormState) => StrategyFormState) => void;
  onApplyTemplate: (templateId: string) => void;
}) {
  return (
    <div className="space-y-8">
      <div className="grid gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="setup-name">Setup Name</Label>
          <Input
            id="setup-name"
            value={form.name}
            onChange={(event) => onFormChange((current) => ({ ...current, name: event.target.value }))}
            placeholder="Opening range reclaim"
            className={cn("h-11 rounded-2xl bg-background shadow-none", validationErrors?.name && "border-destructive")}
          />
          {validationErrors?.name ? <p className="text-sm text-destructive">{validationErrors.name}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="setup-description">Short Summary</Label>
          <Textarea
            id="setup-description"
            value={form.description}
            onChange={(event) => onFormChange((current) => ({ ...current, description: event.target.value }))}
            placeholder="Liquidity sweep into reclaim"
            rows={2}
            className="min-h-[84px] rounded-2xl border-border/60 bg-background shadow-none"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="setup-notes">Notes</Label>
          <Textarea
            id="setup-notes"
            value={form.notes}
            onChange={(event) => onFormChange((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Session bias, HTF context"
            rows={3}
            className="min-h-[104px] rounded-2xl border-border/60 bg-background shadow-none"
          />
        </div>
      </div>

      <div className="border-t border-border/50 pt-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-foreground">Templates</p>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Optional</p>
        </div>

        <div className="mt-3 flex flex-wrap gap-2.5">
          {SETUP_TEMPLATE_PRESETS.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onApplyTemplate(template.id)}
              className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-4 py-2.5 text-left text-sm transition-colors hover:border-border hover:bg-accent/40"
            >
              <span className="font-semibold text-foreground">{template.label}</span>
              <span className="text-muted-foreground">{template.summary}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
