import type { ReactNode } from "react";
import { CircleDot } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/utils/class-names";
import {
  type EconomicCalendarImpactFilter,
} from "@/features/economic-calendar/utils";

interface EconomicCalendarToolbarProps {
  currencyFilter: string;
  onCurrencyFilterChange: (value: string) => void;
  currencyOptions: string[];
  impactFilter: EconomicCalendarImpactFilter;
  onImpactFilterChange: (value: EconomicCalendarImpactFilter) => void;
  relevantOnly: boolean;
  onRelevantOnlyChange: (value: boolean) => void;
  relevanceDisabled?: boolean;
}

function ToolbarSelect({
  value,
  onValueChange,
  children,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        className={cn(
          "h-7 min-w-[84px] rounded-md border-border/15 bg-transparent px-2.5 text-[11px] text-muted-foreground shadow-none",
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}

export function EconomicCalendarToolbar({
  currencyFilter,
  onCurrencyFilterChange,
  currencyOptions,
  impactFilter,
  onImpactFilterChange,
  relevantOnly,
  onRelevantOnlyChange,
  relevanceDisabled = false,
}: EconomicCalendarToolbarProps) {
  return (
    <section className="flex items-center gap-1.5">
      <ToolbarSelect
        value={currencyFilter}
        onValueChange={onCurrencyFilterChange}
        className="min-w-[74px]"
      >
        <SelectItem value="all">FX</SelectItem>
        {currencyOptions.map((currency) => (
          <SelectItem key={currency} value={currency}>
            {currency}
          </SelectItem>
        ))}
      </ToolbarSelect>

      <ToolbarSelect
        value={impactFilter}
        onValueChange={(value) => onImpactFilterChange(value as EconomicCalendarImpactFilter)}
        className="min-w-[88px]"
      >
        <SelectItem value="all">Impact</SelectItem>
        <SelectItem value="high">High</SelectItem>
        <SelectItem value="medium">Medium</SelectItem>
        <SelectItem value="low">Low</SelectItem>
        <SelectItem value="holiday">Holiday</SelectItem>
      </ToolbarSelect>

      <label className="flex h-7 min-w-0 items-center gap-1.5 rounded-md border border-border/15 px-2 text-[11px] text-muted-foreground">
        <CircleDot className="h-3.5 w-3.5" />
        <Switch
          checked={relevantOnly}
          onCheckedChange={onRelevantOnlyChange}
          disabled={relevanceDisabled}
          aria-label="Filter by relevant instruments"
          className="h-4.5 w-8 scale-[0.82] border-0 data-[state=unchecked]:bg-border/60 data-[state=checked]:bg-foreground"
        />
      </label>
    </section>
  );
}
