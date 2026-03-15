import { useEffect, useState } from "react";
import { Check, Monitor, Moon, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const themeOptions = [
  { value: "light", label: "Light", icon: SunMedium },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function ThemeToggle({ className, showLabel = false }: { className?: string; showLabel?: boolean }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = mounted ? theme || "system" : "system";
  const displayTheme = mounted ? resolvedTheme || "light" : "light";
  const ActiveIcon = displayTheme === "dark" ? Moon : SunMedium;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-10 rounded-xl border-border/70 bg-background/80 px-3", className)}
        >
          <ActiveIcon className="h-4 w-4" />
          {showLabel ? (
            <span className="ml-2 text-sm">
              {themeOptions.find((option) => option.value === activeTheme)?.label || "Theme"}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 rounded-xl p-1">
        {themeOptions.map((option) => {
          const Icon = option.icon;
          const selected = activeTheme === option.value;

          return (
            <DropdownMenuItem
              key={option.value}
              className="rounded-lg px-3 py-2"
              onClick={() => setTheme(option.value)}
            >
              <Icon className="mr-2 h-4 w-4" />
              <span>{option.label}</span>
              {selected ? <Check className="ml-auto h-4 w-4 text-primary" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
