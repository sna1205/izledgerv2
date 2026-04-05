import { GripVertical, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useState } from "react";
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
  const [showNote, setShowNote] = useState(Boolean(item.description));

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
        "border-b border-border/50 py-3 transition-all last:border-b-0",
        isDragging && "opacity-60 ring-2 ring-primary/20",
      )}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground">
            <GripVertical className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <Input
                value={item.title}
                onChange={(event) => onTitleChange(event.target.value)}
                placeholder="Structure confirmed"
                disabled={disabled}
                className="h-10 flex-1 rounded-2xl border-border/60 bg-background shadow-none"
                aria-label="Checklist item title"
              />
              <DataBadge tone={item.isRequired ? "warning" : "neutral"}>
                {item.isRequired ? "Required" : "Optional"}
              </DataBadge>
            </div>
          </div>

          <Switch
            checked={item.isActive}
            onCheckedChange={onActiveChange}
            disabled={disabled}
            aria-label="Toggle checklist item"
          />

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

        <div className="flex flex-wrap items-center justify-between gap-3 pl-12">
          <div className="flex items-center gap-4">
            <Switch
              checked={item.isRequired}
              onCheckedChange={onRequiredChange}
              disabled={disabled}
              aria-label="Toggle required"
            />
            <span className="text-sm text-foreground">Required</span>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setShowNote((current) => !current)}
            >
              {showNote ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Note
            </button>
          </div>

        </div>

        {showNote ? (
          <div className="pl-12">
            <Textarea
              value={item.description ?? ""}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder="Note"
              disabled={disabled}
              rows={2}
              aria-label="Checklist item note"
              className="rounded-2xl border-border/60 bg-background shadow-none"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
