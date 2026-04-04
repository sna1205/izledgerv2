import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function SetupIdentityBlock({
  name,
  description,
  nameError,
  onNameChange,
  onDescriptionChange,
}: {
  name: string;
  description: string;
  nameError?: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-5">
      <div className="space-y-2">
        <Label className="text-label" htmlFor="setup-name">Setup Name</Label>
        <Input
          id="setup-name"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Liquidity Sweep Reversal"
          aria-invalid={Boolean(nameError)}
          className="h-12 text-base"
        />
        {nameError ? (
          <p className="text-sm text-destructive">{nameError}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label className="text-label" htmlFor="setup-description">Summary</Label>
        <Textarea
          id="setup-description"
          rows={3}
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="Short setup summary."
        />
      </div>
    </div>
  );
}
