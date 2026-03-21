import { TagChip } from "@/components/ui/TagChip";

interface SetupTagProps {
  label: string;
  color?: string | null;
  className?: string;
}

export function SetupTag({ label, color, className }: SetupTagProps) {
  return <TagChip label={label} kind="setup" colorToken={color} className={className} />;
}
