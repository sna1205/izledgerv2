import { GripVertical, PauseCircle, PlayCircle, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DataBadge } from "@/components/DataBadge";
import { cn } from "@/utils/class-names";
import type { SetupChecklistDraftItem } from "@/features/setups/components/SetupPreTradeSection";

export function SetupChecklistItemRow({
  item,
  disabled = false,
  isDragging = false,
  onDragStart,
  onDragOver,
  onDrop,
  onTitleChange,
  onDescriptionChange,
  onRequiredChange,
  onActiveChange,
  onDelete,
}: {
  item: SetupChecklistDraftItem;
  disabled?: boolean;
  isDragging?: boolean;
  onDragStart: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onRequiredChange: (nextRequired: boolean) => void;
  onActiveChange: (nextActive: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <div
      draggable={!disabled}
      onDragStart={onDragStart}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver();
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
      className={cn(
        "rounded-[24px] border border-border/60 bg-background/70 p-4 transition-all",
        isDragging && "opacity-60 ring-2 ring-primary/20",
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-card/70 text-muted-foreground">
            <GripVertical className="h-3.5 w-3.5" />
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <DataBadge tone={item.isRequired ? "warning" : "neutral"}>
                {item.isRequired ? "Required" : "Optional"}
              </DataBadge>
              <DataBadge tone={item.isActive ? "success" : "neutral"}>
                {item.isActive ? "Active" : "Paused"}
              </DataBadge>
              {item.isLocalOnly ? <DataBadge tone="neutral">Draft</DataBadge> : null}
            </div>

            <Input
              value={item.title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="Checklist item title"
              disabled={disabled}
              className="h-11 rounded-2xl border-border/60 bg-background/80 shadow-none"
              aria-label="Checklist item title"
            />

            <Textarea
              value={item.description ?? ""}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder="Note"
              disabled={disabled}
              rows={3}
              aria-label="Checklist item note"
              className="rounded-2xl border-border/60 bg-background/80 shadow-none"
            />
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Delete ${item.title || "item"}`}
            onClick={onDelete}
            disabled={disabled}
            className="h-9 w-9 rounded-full text-muted-foreground hover:bg-destructive/8 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-foreground">Required</span>
            <Switch
              checked={item.isRequired}
              onCheckedChange={onRequiredChange}
              disabled={disabled}
              aria-label="Toggle required"
            />
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-border"
            onClick={() => onActiveChange(!item.isActive)}
            disabled={disabled}
          >
            {item.isActive ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
            {item.isActive ? "Pause" : "Activate"}
          </button>
        </div>
      </div>
    </div>
  );
}
