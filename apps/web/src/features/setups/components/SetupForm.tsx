import { SetupColorPanel } from "@/features/setups/components/SetupColorPanel";
import { SetupPreviewCard } from "@/features/setups/components/SetupPreviewCard";
import { SetupStatusPanel } from "@/features/setups/components/SetupStatusPanel";
import { CollapsibleEditorCard } from "@/features/setups/components/CollapsibleEditorCard";
import { SetupIdentityBlock } from "@/features/setups/components/SetupIdentityBlock";
import { SetupNotesBlock } from "@/features/setups/components/SetupNotesBlock";
import { SetupStrategyBlock } from "@/features/setups/components/SetupStrategyBlock";
import type { StrategyFormState } from "@/features/setups/components/setup-form-state";

export function SetupForm({
  form,
  validationErrors,
  onFormChange,
  previewColor,
  formColorLabel,
  onRegenerateColor,
  showSidePanels = true,
}: {
  form: StrategyFormState;
  validationErrors?: {
    name?: string;
  };
  onFormChange: (updater: (current: StrategyFormState) => StrategyFormState) => void;
  previewColor: string;
  formColorLabel: string;
  onRegenerateColor: () => void;
  showSidePanels?: boolean;
}) {
  const hasIdentity = Boolean(form.name.trim() || form.description.trim());
  const hasEntry = Boolean(form.entryLogic.trim());
  const hasConfirmation = Boolean(form.confirmationLogic.trim());
  const hasInvalidation = Boolean(form.invalidationLogic.trim());
  const hasNotes = Boolean(form.notes.trim());

  return (
    <div className={showSidePanels ? "grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_340px]" : "space-y-6"}>
      <div className="space-y-4">
        <CollapsibleEditorCard
          title="Setup Name"
          defaultOpen
          forceOpen={!hasIdentity}
        >
          <SetupIdentityBlock
            name={form.name}
            description={form.description}
            nameError={validationErrors?.name}
            onNameChange={(value) => onFormChange((current) => ({ ...current, name: value }))}
            onDescriptionChange={(value) => onFormChange((current) => ({ ...current, description: value }))}
          />
        </CollapsibleEditorCard>

        <CollapsibleEditorCard
          title="Entry"
          defaultOpen
          forceOpen={!hasEntry}
        >
          <SetupStrategyBlock
            id="setup-entry-logic"
            title="Entry"
            value={form.entryLogic}
            placeholder="What puts this setup in play?"
            onChange={(value) => onFormChange((current) => ({ ...current, entryLogic: value }))}
          />
        </CollapsibleEditorCard>

        <CollapsibleEditorCard
          title="Confirmation"
          defaultOpen={hasConfirmation}
          forceOpen={!hasConfirmation && !hasEntry}
        >
          <SetupStrategyBlock
            id="setup-confirmation-logic"
            title="Confirmation"
            value={form.confirmationLogic}
            placeholder="What confirms the setup?"
            onChange={(value) => onFormChange((current) => ({ ...current, confirmationLogic: value }))}
          />
        </CollapsibleEditorCard>

        <CollapsibleEditorCard
          title="Invalidation"
          defaultOpen={hasInvalidation}
          forceOpen={!hasInvalidation && !hasConfirmation && !hasEntry}
        >
          <SetupStrategyBlock
            id="setup-invalidation-logic"
            title="Invalidation"
            value={form.invalidationLogic}
            placeholder="What invalidates it?"
            onChange={(value) => onFormChange((current) => ({ ...current, invalidationLogic: value }))}
          />
        </CollapsibleEditorCard>

        <CollapsibleEditorCard
          title="Notes"
          defaultOpen={hasNotes}
        >
          <SetupNotesBlock
            value={form.notes}
            onChange={(value) => onFormChange((current) => ({ ...current, notes: value }))}
          />
        </CollapsibleEditorCard>
      </div>

      {showSidePanels ? (
        <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <SetupPreviewCard
            name={form.name}
            description={form.description}
            entryLogic={form.entryLogic}
            confirmationLogic={form.confirmationLogic}
            invalidationLogic={form.invalidationLogic}
            notes={form.notes}
            previewColor={previewColor}
            isArchived={form.isArchived}
          />

          <SetupColorPanel
            previewColor={previewColor}
            formColorLabel={formColorLabel}
            onColorChange={(value) => onFormChange((current) => ({ ...current, color: value }))}
            onRegenerateColor={onRegenerateColor}
          />

          <SetupStatusPanel
            isArchived={form.isArchived}
            onStatusChange={(nextArchived) => onFormChange((current) => ({ ...current, isArchived: nextArchived }))}
          />
        </div>
      ) : null}
    </div>
  );
}
