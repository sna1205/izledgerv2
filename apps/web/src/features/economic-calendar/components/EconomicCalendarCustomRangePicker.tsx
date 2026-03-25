import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  clampEconomicCalendarRange,
  type EconomicCalendarRangeState,
} from "@/features/economic-calendar/economicCalendarRange.utils";

interface EconomicCalendarCustomRangePickerProps {
  range: Pick<EconomicCalendarRangeState, "startDate" | "endDate" | "mode">;
  onApply: (value: { startDate: string; endDate: string }) => void;
}

export function EconomicCalendarCustomRangePicker({
  range,
  onApply,
}: EconomicCalendarCustomRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(range.startDate);
  const [endDate, setEndDate] = useState(range.endDate);
  const [displayMonth, setDisplayMonth] = useState(() => parseISO(`${range.startDate}T00:00:00.000Z`));

  useEffect(() => {
    if (!open) {
      setStartDate(range.startDate);
      setEndDate(range.endDate);
      setDisplayMonth(parseISO(`${range.startDate}T00:00:00.000Z`));
    }
  }, [open, range.endDate, range.startDate]);

  const selectedRange: DateRange | undefined = startDate && endDate
    ? {
        from: parseISO(`${startDate}T00:00:00.000Z`),
        to: parseISO(`${endDate}T00:00:00.000Z`),
      }
    : undefined;

  const displayStartDate = format(parseISO(`${startDate}T00:00:00.000Z`), "MM/dd/yyyy");
  const displayEndDate = format(parseISO(`${endDate}T00:00:00.000Z`), "MM/dd/yyyy");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label={range.mode === "custom" ? "Edit custom range" : "Open custom range"}
          className="h-7 w-7 rounded-md border-border/15 bg-transparent shadow-none"
        >
          <CalendarRange className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        collisionPadding={16}
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="w-[min(344px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-[1.25rem] p-4"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Choose a custom range</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Select a start and end date. Long ranges are capped to 31 days to keep scans fast.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-border/25 bg-background/45 px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Start</p>
              <p className="mt-1 text-sm font-medium text-foreground">{displayStartDate}</p>
            </div>
            <div className="rounded-xl border border-border/25 bg-background/45 px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">End</p>
              <p className="mt-1 text-sm font-medium text-foreground">{displayEndDate}</p>
            </div>
          </div>

          <div className="rounded-xl border border-border/20 bg-background/35 p-3">
            <Calendar
              mode="range"
              defaultMonth={selectedRange?.from}
              month={displayMonth}
              onMonthChange={setDisplayMonth}
              selected={selectedRange}
              onSelect={(nextRange) => {
                if (!nextRange?.from) {
                  return;
                }

                const nextStartDate = format(nextRange.from, "yyyy-MM-dd");
                const nextEndDate = format(nextRange.to ?? nextRange.from, "yyyy-MM-dd");

                setStartDate(nextStartDate);
                setEndDate(nextEndDate);
                setDisplayMonth(nextRange.from);
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 text-xs"
                onClick={() => {
                  setStartDate(range.startDate);
                  setEndDate(range.endDate);
                }}
              >
                Reset
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 text-xs"
                onClick={() => {
                  const today = format(new Date(), "yyyy-MM-dd");
                  setStartDate(today);
                  setEndDate(today);
                }}
              >
                Today
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const nextRange = clampEconomicCalendarRange(startDate, endDate);
                  onApply(nextRange);
                  setOpen(false);
                }}
                disabled={!startDate || !endDate}
              >
                Apply range
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
