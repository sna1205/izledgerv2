import { DataBadge } from "@/components/DataBadge";

const clampStyle = {
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical" as const,
  overflow: "hidden",
};

function buildRules(form: {
  entryLogic: string;
  confirmationLogic: string;
  invalidationLogic: string;
}) {
  return [
    {
      label: "Entry",
      value: form.entryLogic.trim(),
    },
    {
      label: "Confirmation",
      value: form.confirmationLogic.trim(),
    },
    {
      label: "Invalidation",
      value: form.invalidationLogic.trim(),
    },
  ].filter((item) => item.value.length > 0);
}

export function SetupPreviewCard({
  name,
  description,
  entryLogic,
  confirmationLogic,
  invalidationLogic,
  notes,
  previewColor,
  isArchived,
}: {
  name: string;
  description: string;
  entryLogic: string;
  confirmationLogic: string;
  invalidationLogic: string;
  notes: string;
  previewColor: string;
  isArchived: boolean;
}) {
  const rules = buildRules({
    entryLogic,
    confirmationLogic,
    invalidationLogic,
  });

  return (
    <div className="rounded-[28px] border border-border bg-card/85 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-label mb-2">Live Preview</p>
          <h2 className="text-base font-semibold text-foreground">How this playbook will read in the library</h2>
        </div>
        <DataBadge tone={isArchived ? "warning" : "primary"}>
          {isArchived ? "Archived" : "Active"}
        </DataBadge>
      </div>

      <div
        className="overflow-hidden rounded-[28px] border border-border/70 bg-background/80 shadow-sm"
        style={{
          backgroundImage: `radial-gradient(circle at top right, ${previewColor}26, transparent 38%)`,
        }}
      >
        <div className="h-1.5 w-full" style={{ backgroundColor: previewColor }} />
        <div className="space-y-5 p-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/90 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: previewColor }} />
                Playbook
              </span>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                {name.trim() || "Untitled Setup"}
              </h3>
              <p className="text-sm leading-6 text-muted-foreground" style={clampStyle}>
                {description.trim() || "Add a short summary so this setup is instantly recognizable during trade logging and review."}
              </p>
            </div>
          </div>

          <div className="rounded-[24px] border border-border/60 bg-card/70 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-label">Rule Snapshot</p>
              <span className="text-xs text-muted-foreground">{rules.length > 0 ? `${rules.length} sections` : "No rules yet"}</span>
            </div>

            {rules.length > 0 ? (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div key={rule.label} className="rounded-2xl border border-border/50 bg-background/80 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{rule.label}</p>
                    <p className="mt-2 text-sm leading-6 text-foreground">{rule.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                Entry, confirmation, and invalidation guidance will appear here once the strategy is filled in.
              </p>
            )}
          </div>

          <div className="rounded-[24px] border border-dashed border-border/70 bg-card/60 px-4 py-4">
            <p className="text-label mb-2">Notes</p>
            <p className="text-sm leading-6 text-muted-foreground" style={clampStyle}>
              {notes.trim() || "Optional nuance, reminders, or review context can live here without cluttering the main rules."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
