import { Archive, ClipboardList, Copy, Pencil } from "lucide-react";
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
  WebkitLineClamp: 1,
  WebkitBoxOrient: "vertical" as const,
  overflow: "hidden",
};

const ruleClampStyle = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical" as const,
  overflow: "hidden",
};

function resolveDisplayColor(color: string | null | undefined) {
  return normalizeSetupColor(color) ?? FALLBACK_SETUP_COLOR;
}

function buildRulesPreview(setup: SetupListItem) {
  return [
    setup.entryLogic?.trim() ? `Entry: ${setup.entryLogic.trim()}` : null,
    setup.confirmationLogic?.trim() ? `Confirmation: ${setup.confirmationLogic.trim()}` : null,
    setup.invalidationLogic?.trim() ? `Invalidation: ${setup.invalidationLogic.trim()}` : null,
  ].filter((item): item is string => Boolean(item)).join(" • ");
}

export function SetupCard({
  setup,
  onEdit,
  onArchive,
  onDuplicate,
  className,
}: {
  setup: SetupListItem;
  onEdit: (setup: SetupListItem) => void;
  onArchive: (setup: SetupListItem) => void;
  onDuplicate: (setup: SetupListItem) => void;
  className?: string;
}) {
  const accentColor = resolveDisplayColor(setup.color);
  const accentRgb = hexToRgb(accentColor);
  const rulesPreview = buildRulesPreview(setup);
  const checklistCount = setup.preTradeChecklist?.length ?? 0;
  const tradeCount = setup.tradeCount ?? 0;
  const summary = setup.description.trim() || "No summary yet.";

  return (
    <section
      role="link"
      tabIndex={0}
      aria-label={`Open ${setup.name}`}
      onClick={() => onEdit(setup)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onEdit(setup);
        }
      }}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-[30px] border border-border/70 bg-card/90 p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-border hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Setup
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">{setup.name}</h2>
              <p className="text-sm leading-6 text-muted-foreground" style={descriptionClampStyle}>
                {summary}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-full border border-border/70 bg-background/80 p-1 shadow-sm backdrop-blur-sm opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 rounded-full px-3 text-foreground hover:bg-foreground/[0.06]"
              aria-label={`Edit ${setup.name}`}
              onClick={(event) => {
                event.stopPropagation();
                onEdit(setup);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 rounded-full px-3 text-foreground hover:bg-foreground/[0.06]"
              aria-label={`Duplicate ${setup.name}`}
              onClick={(event) => {
                event.stopPropagation();
                onDuplicate(setup);
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              Duplicate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 rounded-full px-3 text-muted-foreground hover:bg-destructive/8 hover:text-destructive"
              aria-label={`Archive ${setup.name}`}
              onClick={(event) => {
                event.stopPropagation();
                onArchive(setup);
              }}
            >
              <Archive className="h-3.5 w-3.5" />
              Archive
            </Button>
          </div>
        </div>

        <div className="rounded-[26px] border border-border/60 bg-background/65 p-4">
          <p className="text-label">Key Rules</p>
          <p className="mt-2 text-sm leading-6 text-foreground/90" style={ruleClampStyle}>
            {rulesPreview || "Add entry, confirmation, and invalidation rules to define this setup."}
          </p>
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-4 border-t border-border/60 pt-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <span>{checklistCount} {checklistCount === 1 ? "rule" : "rules"}</span>
          </div>

          <div className="text-sm text-muted-foreground">
            Used in <span className="font-medium text-foreground">{formatNumberDisplay(tradeCount)}</span> {tradeCount === 1 ? "trade" : "trades"}
          </div>
        </div>
      </div>
    </section>
  );
}
