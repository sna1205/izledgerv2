import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SetupColorPanel } from "@/features/setups/components/SetupColorPanel";
import { SetupPreviewCard } from "@/features/setups/components/SetupPreviewCard";
import { SetupStatusPanel } from "@/features/setups/components/SetupStatusPanel";
import type { StrategyFormState } from "@/features/setups/components/setup-form-state";

function RuleField({
  title,
  eyebrow,
  description,
  value,
  placeholder,
  onChange,
}: {
  title: string;
  eyebrow: string;
  description: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-[24px] border border-border/60 bg-background/60 p-4">
      <div className="mb-3 space-y-1">
        <p className="text-label">{eyebrow}</p>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      </div>

      <Textarea
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
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-border bg-card/85 p-5 sm:p-6">
      <div className="mb-5 space-y-2">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
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
          title="Setup Identity"
          description="Name the playbook clearly, give it a short summary, and make it easy to spot during fast trade logging."
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
              <Label className="text-label" htmlFor="setup-description">Description</Label>
              <Textarea
                id="setup-description"
                rows={4}
                value={form.description}
                onChange={(event) => onFormChange((current) => ({ ...current, description: event.target.value }))}
                placeholder="Short summary of the setup and the market conditions where it performs best."
              />
            </div>
          </div>
        </StrategySection>

        <StrategySection
          title="Playbook Rules"
          description="Structure the setup the way you think through it at execution time: what gets you interested, what confirms it, and what invalidates the idea."
        >
          <div className="grid gap-4">
            <RuleField
              eyebrow="Entry"
              title="What gets this trade on the radar?"
              description="Describe the price action, context, or trigger that makes the setup executable."
              value={form.entryLogic}
              placeholder="Price sweeps liquidity, reclaims the level, and closes back inside range before entry."
              onChange={(value) => onFormChange((current) => ({ ...current, entryLogic: value }))}
            />

            <RuleField
              eyebrow="Confirmation"
              title="What strengthens conviction?"
              description="Capture the extra evidence that keeps you from forcing a weak version of the setup."
              value={form.confirmationLogic}
              placeholder="Wait for displacement, volume expansion, or session confirmation before committing."
              onChange={(value) => onFormChange((current) => ({ ...current, confirmationLogic: value }))}
            />

            <RuleField
              eyebrow="Invalidation"
              title="What makes the setup a pass?"
              description="Define what must fail before you should stand down and protect discipline."
              value={form.invalidationLogic}
              placeholder="If the reclaim fails or higher-timeframe bias breaks, the playbook is invalid for this session."
              onChange={(value) => onFormChange((current) => ({ ...current, invalidationLogic: value }))}
            />
          </div>
        </StrategySection>

        <StrategySection
          title="Notes"
          description="Keep nuance, reminders, and review context here so the rules stay clean while the setup keeps its texture."
        >
          <Textarea
            id="setup-notes"
            rows={6}
            value={form.notes}
            onChange={(event) => onFormChange((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Optional nuance, execution reminders, common mistakes, or review lessons."
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
