import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EconomicCalendarModeSwitch } from "@/features/economic-calendar/components/EconomicCalendarModeSwitch";
import { EconomicCalendarCustomRangePicker } from "@/features/economic-calendar/components/EconomicCalendarCustomRangePicker";
import { EconomicCalendarPresetSelect } from "@/features/economic-calendar/components/EconomicCalendarPresetSelect";
import { EconomicCalendarToolbar } from "@/features/economic-calendar/components/EconomicCalendarToolbar";
import {
  formatRangeLabel,
  type EconomicCalendarRangePreset,
  type EconomicCalendarRangeState,
} from "@/features/economic-calendar/economicCalendarRange.utils";
import type { EconomicCalendarViewMode } from "@/features/economic-calendar/economicCalendarViewMode.utils";
import type { EconomicCalendarImpactFilter } from "@/features/economic-calendar/utils";

interface EconomicCalendarRangeToolbarProps {
  viewMode: EconomicCalendarViewMode;
  onViewModeChange: (value: EconomicCalendarViewMode) => void;
  range: EconomicCalendarRangeState;
  onShiftBackward: () => void;
  onShiftForward: () => void;
  onToday: () => void;
  onPresetChange: (preset: EconomicCalendarRangePreset) => void;
  onCustomRangeChange: (value: { startDate: string; endDate: string }) => void;
  currencyFilter: string;
  onCurrencyFilterChange: (value: string) => void;
  currencyOptions: string[];
  impactFilter: EconomicCalendarImpactFilter;
  onImpactFilterChange: (value: EconomicCalendarImpactFilter) => void;
  relevantOnly: boolean;
  onRelevantOnlyChange: (value: boolean) => void;
  relevanceDisabled?: boolean;
}

export function EconomicCalendarRangeToolbar({
  viewMode,
  onViewModeChange,
  range,
  onShiftBackward,
  onShiftForward,
  onToday,
  onPresetChange,
  onCustomRangeChange,
  currencyFilter,
  onCurrencyFilterChange,
  currencyOptions,
  impactFilter,
  onImpactFilterChange,
  relevantOnly,
  onRelevantOnlyChange,
  relevanceDisabled = false,
}: EconomicCalendarRangeToolbarProps) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <div className="inline-flex min-w-max items-center gap-1.5 rounded-xl border border-border/20 bg-card/30 px-2 py-1.5">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 shrink-0 rounded-md border-border/15 bg-transparent shadow-none"
          onClick={onShiftBackward}
          aria-label="Previous period"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>

        <div className="min-w-0 px-1">
          <p className="truncate text-[13px] font-semibold tracking-[-0.02em] text-foreground">
            {formatRangeLabel(range)}
          </p>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 shrink-0 rounded-md border-border/15 bg-transparent shadow-none"
          onClick={onShiftForward}
          aria-label="Next period"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>

        <div className="h-5 w-px bg-border/25" />

        <EconomicCalendarModeSwitch value={viewMode} onValueChange={onViewModeChange} />

        <Button
          variant="outline"
          className="h-7 rounded-md border-border/15 bg-transparent px-2.5 text-[11px] shadow-none"
          onClick={onToday}
        >
          Today
        </Button>
        <EconomicCalendarPresetSelect
          value={range.preset}
          onValueChange={onPresetChange}
          className="min-w-[84px]"
        />
        <EconomicCalendarCustomRangePicker range={range} onApply={onCustomRangeChange} />
        <EconomicCalendarToolbar
          currencyFilter={currencyFilter}
          onCurrencyFilterChange={onCurrencyFilterChange}
          currencyOptions={currencyOptions}
          impactFilter={impactFilter}
          onImpactFilterChange={onImpactFilterChange}
          relevantOnly={relevantOnly}
          onRelevantOnlyChange={onRelevantOnlyChange}
          relevanceDisabled={relevanceDisabled}
        />
      </div>
    </div>
  );
}
