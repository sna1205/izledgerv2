import { Button } from "@/components/ui/button";
import { SetupColorPanel } from "@/features/setups/components/SetupColorPanel";
import { SetupPreviewCard } from "@/features/setups/components/SetupPreviewCard";
import { SetupStatusPanel } from "@/features/setups/components/SetupStatusPanel";

export function SetupBuilderSummaryRail({
  name,
  description,
  entryLogic,
  confirmationLogic,
  invalidationLogic,
  notes,
  previewColor,
  formColorLabel,
  isArchived,
  checklistCount,
  activeChecklistCount,
  requiredChecklistCount,
  saveStateLabel,
  isSaving,
  isDisabled,
  showSavedActions,
  primaryButtonLabel,
  secondaryButtonLabel,
  onSave,
  onSaveAndCreateTrade,
  onDuplicate,
  onUseInTrade,
  onColorChange,
  onRegenerateColor,
  onStatusChange,
}: {
  name: string;
  description: string;
  entryLogic: string;
  confirmationLogic: string;
  invalidationLogic: string;
  notes: string;
  previewColor: string;
  formColorLabel: string;
  isArchived: boolean;
  checklistCount: number;
  activeChecklistCount: number;
  requiredChecklistCount: number;
  saveStateLabel: string;
  isSaving: boolean;
  isDisabled: boolean;
  showSavedActions: boolean;
  primaryButtonLabel: string;
  secondaryButtonLabel: string;
  onSave: () => void;
  onSaveAndCreateTrade: () => void;
  onDuplicate: () => void;
  onUseInTrade: () => void;
  onColorChange: (value: string) => void;
  onRegenerateColor: () => void;
  onStatusChange: (nextArchived: boolean) => void;
}) {
  return (
    <aside className="hidden space-y-4 lg:sticky lg:top-6 lg:block">
      <div className="rounded-[28px] border border-border bg-card/90 p-4 shadow-sm">
        <p className="text-sm font-semibold text-foreground">{saveStateLabel}</p>
        <div className="mt-4 rounded-[22px] border border-border/60 bg-background/70 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Checklist</p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div>
              <p className="text-lg font-semibold text-foreground">{checklistCount}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{activeChecklistCount}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{requiredChecklistCount}</p>
              <p className="text-xs text-muted-foreground">Required</p>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Button className="w-full" onClick={onSave} disabled={isSaving || isDisabled}>
            {isSaving ? "Saving..." : primaryButtonLabel}
          </Button>
          <Button variant="outline" className="w-full" onClick={onSaveAndCreateTrade} disabled={isSaving || isDisabled}>
            {isSaving ? "Saving..." : secondaryButtonLabel}
          </Button>
          {showSavedActions ? (
            <div className="grid grid-cols-2 gap-3">
              <Button variant="ghost" className="w-full" onClick={onDuplicate} disabled={isSaving}>
                Duplicate
              </Button>
              <Button variant="ghost" className="w-full" onClick={onUseInTrade} disabled={isSaving}>
                Use in Trade
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <SetupPreviewCard
        name={name}
        description={description}
        entryLogic={entryLogic}
        confirmationLogic={confirmationLogic}
        invalidationLogic={invalidationLogic}
        notes={notes}
        previewColor={previewColor}
        isArchived={isArchived}
      />

      <SetupColorPanel
        previewColor={previewColor}
        formColorLabel={formColorLabel}
        onColorChange={onColorChange}
        onRegenerateColor={onRegenerateColor}
      />

      <SetupStatusPanel
        isArchived={isArchived}
        onStatusChange={onStatusChange}
      />
    </aside>
  );
}
