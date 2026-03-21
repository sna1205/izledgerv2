import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import {
  getEmotionBadgeStyle,
  getSessionBadgeStyle,
  getSetupBadgeStyle,
} from "@/lib/badgeColors";
import { cn } from "@/lib/utils";

type TagChipKind = "setup" | "session" | "emotion";

interface TagChipProps {
  label: string;
  kind: TagChipKind;
  colorToken?: string | null;
  className?: string;
}

export function TagChip({ label, kind, colorToken, className }: TagChipProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const theme = mounted && resolvedTheme === "dark" ? "dark" : "light";
  const style = useMemo(() => {
    if (kind === "setup") {
      return getSetupBadgeStyle(colorToken, theme);
    }

    if (kind === "session") {
      return getSessionBadgeStyle(label, theme);
    }

    return getEmotionBadgeStyle(label, theme);
  }, [colorToken, kind, label, theme]);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium leading-none tracking-normal transition-colors",
        className,
      )}
      style={style}
    >
      {label}
    </span>
  );
}
