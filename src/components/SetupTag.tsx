interface SetupTagProps {
  label: string;
}

export function SetupTag({ label }: SetupTagProps) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground border">
      {label}
    </span>
  );
}
