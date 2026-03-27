import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SetupColorPanel } from "@/features/setups/components/SetupColorPanel";
import { SetupPreviewCard } from "@/features/setups/components/SetupPreviewCard";
import { SetupStatusPanel } from "@/features/setups/components/SetupStatusPanel";
import type { StrategyFormState } from "@/features/setups/components/setup-form-state";

function RuleField({
  id,
  title,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  title: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-label" htmlFor={id}>{title}</Label>
      <Textarea
        id={id}
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function StrategySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-border bg-card/85 p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function SetupForm({
  form,
  onFormChange,
  previewColor,
  formColorLabel,
  onRegenerateColor,
}: {
  form: StrategyFormState;
  onFormChange: (updater: (current: StrategyFormState) => StrategyFormState) => void;
  previewColor: string;
  formColorLabel: string;
  onRegenerateColor: () => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_340px]">
      <div className="space-y-6">
        <StrategySection
          title="Identity"
        >
          <div className="grid gap-5">
            <div className="space-y-2">
              <Label className="text-label" htmlFor="setup-name">Setup Name</Label>
              <Input
                id="setup-name"
                value={form.name}
                onChange={(event) => onFormChange((current) => ({ ...current, name: event.target.value }))}
                placeholder="Liquidity Sweep Reversal"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-label" htmlFor="setup-description">Summary</Label>
              <Textarea
                id="setup-description"
                rows={4}
                value={form.description}
                onChange={(event) => onFormChange((current) => ({ ...current, description: event.target.value }))}
                placeholder="Short setup summary."
              />
            </div>
          </div>
        </StrategySection>

        <StrategySection
          title="Rules"
        >
          <div className="grid gap-4">
            <RuleField
              id="setup-entry-logic"
              title="Entry"
              value={form.entryLogic}
              placeholder="What puts this setup in play?"
              onChange={(value) => onFormChange((current) => ({ ...current, entryLogic: value }))}
            />

            <RuleField
              id="setup-confirmation-logic"
              title="Confirmation"
              value={form.confirmationLogic}
              placeholder="What confirms the setup?"
              onChange={(value) => onFormChange((current) => ({ ...current, confirmationLogic: value }))}
            />

            <RuleField
              id="setup-invalidation-logic"
              title="Invalidation"
              value={form.invalidationLogic}
              placeholder="What invalidates it?"
              onChange={(value) => onFormChange((current) => ({ ...current, invalidationLogic: value }))}
            />
          </div>
        </StrategySection>

        <StrategySection
          title="Notes"
        >
          <Textarea
            id="setup-notes"
            rows={6}
            value={form.notes}
            onChange={(event) => onFormChange((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Optional notes."
          />
        </StrategySection>
      </div>

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
    </div>
  );
}
