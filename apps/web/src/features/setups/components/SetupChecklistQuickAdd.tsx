import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SetupChecklistQuickAdd({
  onAdd,
  disabled = false,
}: {
  onAdd: (title: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");

  const handleAdd = () => {
    const nextTitle = value.trim();

    if (!nextTitle) {
      return;
    }

    onAdd(nextTitle);
    setValue("");
  };

  return (
    <div className="rounded-[24px] border border-border/60 bg-background/70 p-4">
      <p className="text-label">Quick Add</p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Add a pre-trade rule..."
          disabled={disabled}
          aria-label="Add a pre-trade rule"
          className="h-11 rounded-2xl"
        />
        <Button type="button" onClick={handleAdd} disabled={disabled || !value.trim()}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
    </div>
  );
}
