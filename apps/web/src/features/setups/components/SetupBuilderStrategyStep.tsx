import { SetupForm } from "@/features/setups/components/SetupForm";
import type { StrategyFormState } from "@/features/setups/components/setup-form-state";
import { SETUP_TEMPLATE_PRESETS } from "@/features/setups/setup-presets";

export function SetupBuilderStrategyStep({
  form,
  validationErrors,
  onFormChange,
  previewColor,
  formColorLabel,
  onRegenerateColor,
  onApplyTemplate,
}: {
  form: StrategyFormState;
  validationErrors?: {
    name?: string;
  };
  onFormChange: (updater: (current: StrategyFormState) => StrategyFormState) => void;
  previewColor: string;
  formColorLabel: string;
  onRegenerateColor: () => void;
  onApplyTemplate: (templateId: string) => void;
}) {
  const shouldShowTemplates = !form.name.trim()
    && !form.description.trim()
    && !form.entryLogic.trim()
    && !form.confirmationLogic.trim()
    && !form.invalidationLogic.trim()
    && !form.notes.trim();

  return (
    <div className="space-y-5">
      {shouldShowTemplates ? (
        <section className="rounded-[28px] border border-border bg-card/90 p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">Templates</p>
          </div>

          <div className="grid gap-3 xl:grid-cols-3">
            {SETUP_TEMPLATE_PRESETS.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => onApplyTemplate(template.id)}
                className="rounded-[22px] border border-border/60 bg-background/70 px-4 py-3 text-left transition-colors hover:border-border hover:bg-background"
              >
                <p className="text-sm font-semibold text-foreground">{template.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{template.summary}</p>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <SetupForm
        form={form}
        validationErrors={validationErrors}
        onFormChange={onFormChange}
        previewColor={previewColor}
        formColorLabel={formColorLabel}
        onRegenerateColor={onRegenerateColor}
        showSidePanels={false}
      />
    </div>
  );
}
