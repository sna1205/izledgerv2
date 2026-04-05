import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SetupStrategyBlock({
  id,
  title,
  value,
  placeholder,
  rows = 4,
  onChange,
}: {
  id: string;
  title: string;
  value: string;
  placeholder: string;
  rows?: number;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-label" htmlFor={id}>{title}</Label>
      <Textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
