import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SetupListItem } from "@/services/api/setups";
import { hexToRgb } from "@/utils/badge-colors";
import { cn } from "@/utils/class-names";
import { formatNumberDisplay } from "@/utils/analytics-rendering";
import { normalizeSetupColor } from "@/types";

const FALLBACK_SETUP_COLOR = "#10B981";

const clampStyle = {
  display: "-webkit-box",
  WebkitLineClamp: 1,
  WebkitBoxOrient: "vertical" as const,
  overflow: "hidden",
};

function resolveDisplayColor(color: string | null | undefined) {
  return normalizeSetupColor(color) ?? FALLBACK_SETUP_COLOR;
}

function getRuleCount(setup: SetupListItem) {
  return [setup.entryLogic, setup.confirmationLogic, setup.invalidationLogic].filter((item) => item?.trim()).length;
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
  const summary = setup.description.trim() || "No summary yet.";
  const ruleCount = getRuleCount(setup);
  const tradeCount = setup.tradeCount ?? 0;

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
        "group relative cursor-pointer overflow-hidden rounded-[30px] border border-border/60 bg-card/90 p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-border hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      style={accentRgb ? {
        backgroundImage: `radial-gradient(circle at top right, rgba(${accentRgb.red}, ${accentRgb.green}, ${accentRgb.blue}, 0.14), transparent 40%)`,
      } : undefined}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-3">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs font-medium text-foreground"
            >
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
              {setup.isArchived ? `Archived · ${accentColor}` : accentColor}
            </span>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">{setup.name}</h2>
            <p className="text-sm leading-6 text-muted-foreground" style={clampStyle}>
              {summary}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-full border border-border/60 bg-background/90 p-1 shadow-sm opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Edit ${setup.name}`}
            className="h-9 rounded-full px-3 hover:bg-foreground/[0.06]"
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
            aria-label={`Delete ${setup.name}`}
            className="h-9 rounded-full px-3 text-muted-foreground hover:bg-destructive/8 hover:text-destructive"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(setup);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-3 border-t border-border/50 pt-4 text-sm">
        <div>
          <p className="text-muted-foreground">Rules</p>
          <p className="mt-1 font-semibold text-foreground">{ruleCount}</p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground">Usage</p>
          <p className="mt-1 font-semibold text-foreground">{formatNumberDisplay(tradeCount)}</p>
        </div>
      </div>
    </section>
  );
}
