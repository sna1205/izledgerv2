import { Paintbrush, Sparkles } from "lucide-react";
import { DataBadge } from "@/components/DataBadge";
import { Input } from "@/components/ui/input";

export function SetupColorPanel({
  previewColor,
  formColorLabel,
  onColorChange,
  onRegenerateColor,
}: {
  previewColor: string;
  formColorLabel: string;
  onColorChange: (value: string) => void;
  onRegenerateColor: () => void;
}) {
  return (
    <div className="rounded-[28px] border border-border bg-card/85 p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-background/75 text-muted-foreground">
          <Paintbrush className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">Color Identity</h2>
          <p className="text-sm text-muted-foreground">Distinct by default, but still editable when you want a stronger visual system.</p>
        </div>
      </div>

      <div className="rounded-[24px] border border-border/60 bg-background/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="h-12 w-12 rounded-2xl border border-black/5 shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:ring-white/10"
              style={{ backgroundColor: previewColor }}
            />
            <div className="space-y-1">
              <p className="font-mono-price text-sm font-semibold text-foreground">{formColorLabel}</p>
              <p className="text-xs text-muted-foreground">Used across cards, trade tags, and saved snapshots.</p>
            </div>
          </div>

          <DataBadge tone="neutral">Distinct</DataBadge>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr]">
          <input
            aria-label="Setup color"
            type="color"
            value={previewColor}
            onChange={(event) => onColorChange(event.target.value.toUpperCase())}
            className="h-11 w-full cursor-pointer rounded-2xl border border-border bg-background p-1 sm:w-16"
          />
          <Input value={formColorLabel} readOnly aria-label="Setup color hex" />
        </div>

        <button
          type="button"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          onClick={onRegenerateColor}
        >
          <Sparkles className="h-4 w-4" />
          Regenerate distinct color
        </button>
      </div>
    </div>
  );
}
