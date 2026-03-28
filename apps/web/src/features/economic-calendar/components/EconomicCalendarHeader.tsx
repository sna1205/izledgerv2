import { EconomicCalendarRangeToolbar } from "@/features/economic-calendar/components/EconomicCalendarRangeToolbar";
import { EconomicCalendarTimezoneSelect } from "@/features/economic-calendar/components/EconomicCalendarTimezoneSelect";
import type { EconomicCalendarRangePreset, EconomicCalendarRangeState } from "@/features/economic-calendar/economicCalendarRange.utils";
import type { EconomicCalendarViewMode } from "@/features/economic-calendar/economicCalendarViewMode.utils";
import type { EconomicCalendarImpactFilter } from "@/features/economic-calendar/utils";

interface EconomicCalendarHeaderProps {
  viewMode: EconomicCalendarViewMode;
  onViewModeChange: (value: EconomicCalendarViewMode) => void;
  timeZone: string;
  onTimeZoneChange: (value: string) => void;
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

export function EconomicCalendarHeader({
  viewMode,
  onViewModeChange,
  timeZone,
  onTimeZoneChange,
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
}: EconomicCalendarHeaderProps) {
  return (
    <header className="space-y-2">
      <div className="flex flex-col gap-1.5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-label">Macro Calendar</p>
          <h1 className="mt-2 text-[1.75rem] font-semibold tracking-[-0.03em] text-foreground sm:text-[1.9rem]">
            Economic Calendar
          </h1>
        </div>

        <EconomicCalendarTimezoneSelect
          value={timeZone}
          onValueChange={onTimeZoneChange}
          className="self-start"
        />
      </div>

      <EconomicCalendarRangeToolbar
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        range={range}
        onShiftBackward={onShiftBackward}
        onShiftForward={onShiftForward}
        onToday={onToday}
        onPresetChange={onPresetChange}
        onCustomRangeChange={onCustomRangeChange}
        currencyFilter={currencyFilter}
        onCurrencyFilterChange={onCurrencyFilterChange}
        currencyOptions={currencyOptions}
        impactFilter={impactFilter}
        onImpactFilterChange={onImpactFilterChange}
        relevantOnly={relevantOnly}
        onRelevantOnlyChange={onRelevantOnlyChange}
        relevanceDisabled={relevanceDisabled}
      />
    </header>
  );
}
