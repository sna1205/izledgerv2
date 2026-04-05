import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SetupNotesBlock({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-label" htmlFor="setup-notes">Notes</Label>
      <Textarea
        id="setup-notes"
        rows={5}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Optional notes."
      />
    </div>
  );
}
