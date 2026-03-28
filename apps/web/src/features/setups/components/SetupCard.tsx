import { Pencil, Trash2 } from "lucide-react";
import { DataBadge } from "@/components/DataBadge";
import { Button } from "@/components/ui/button";
import type { SetupListItem } from "@/services/api/setups";
import { hexToRgb } from "@/utils/badge-colors";
import { cn } from "@/utils/class-names";
import { formatNumberDisplay } from "@/utils/analytics-rendering";
import { normalizeSetupColor } from "@/types";

const FALLBACK_SETUP_COLOR = "#10B981";

const descriptionClampStyle = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical" as const,
  overflow: "hidden",
};

const ruleClampStyle = {
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical" as const,
  overflow: "hidden",
};

function resolveDisplayColor(color: string | null | undefined) {
  return normalizeSetupColor(color) ?? FALLBACK_SETUP_COLOR;
}

function buildRuleGroups(setup: SetupListItem) {
  return [
    {
      label: "Entry",
      value: setup.entryLogic?.trim() ?? "",
    },
    {
      label: "Confirmation",
      value: setup.confirmationLogic?.trim() ?? "",
    },
    {
      label: "Invalidation",
      value: setup.invalidationLogic?.trim() ?? "",
    },
  ].filter((item) => item.value.length > 0);
}

export function SetupCard({
  setup,
  onEdit,
  onDelete,
  className,
}: {
  setup: SetupListItem;
  onEdit: (setup: SetupListItem) => void;
  onDelete: (setup: SetupListItem) => void;
  className?: string;
}) {
  const accentColor = resolveDisplayColor(setup.color);
  const accentRgb = hexToRgb(accentColor);
  const ruleGroups = buildRuleGroups(setup);
  const tradeCount = setup.tradeCount ?? 0;

  return (
    <section
      className={cn(
        "group relative overflow-hidden rounded-[30px] border border-border/70 bg-card/90 p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-border hover:shadow-lg",
        setup.isArchived && "bg-card/75",
        className,
      )}
      style={accentRgb ? {
        backgroundImage: `radial-gradient(circle at top right, rgba(${accentRgb.red}, ${accentRgb.green}, ${accentRgb.blue}, 0.16), transparent 42%)`,
      } : undefined}
    >
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1.5"
        style={{ backgroundColor: accentColor }}
      />

      <div className="flex h-full flex-col gap-5 pl-2">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <DataBadge tone={setup.isArchived ? "warning" : "primary"}>
                {setup.isArchived ? "Archived" : "Active"}
              </DataBadge>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">{setup.name}</h2>
              <p className="text-sm leading-6 text-muted-foreground" style={descriptionClampStyle}>
                {setup.description.trim() || "No summary yet."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
            <Button variant="outline" size="icon" aria-label={`Edit ${setup.name}`} onClick={() => onEdit(setup)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label={`Delete ${setup.name}`}
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(setup)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="rounded-[26px] border border-border/60 bg-background/65 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-label">Rules</p>
            <span className="text-xs text-muted-foreground">
              {ruleGroups.length > 0 ? `${ruleGroups.length} sections` : "Add rules"}
            </span>
          </div>

          {ruleGroups.length > 0 ? (
            <div className="space-y-3">
              {ruleGroups.map((group) => (
                <div key={group.label} className="rounded-[20px] border border-border/50 bg-card/70 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{group.label}</p>
                  <p className="mt-2 text-sm leading-6 text-foreground/90" style={ruleClampStyle}>
                    {group.value}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              No rules yet.
            </p>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between gap-4 border-t border-border/60 pt-4">
          <div className="space-y-1">
            <p className="text-label">Usage</p>
            <p className="text-sm font-medium text-foreground">
              {formatNumberDisplay(tradeCount)} {tradeCount === 1 ? "trade tagged" : "trades tagged"}
            </p>
          </div>

          <div className="text-right">
            <p className="text-label">Updated</p>
            <p className="text-sm text-muted-foreground">
              {new Date(setup.updatedAt).toLocaleDateString("en-US")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
