import { useMemo, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/utils/class-names";

type GlobalDateSelectorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowClear?: boolean;
};

function toDate(value: string) {
  if (!value) {
    return undefined;
  }

  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
}

function formatDateValue(value: string, placeholder: string) {
  const parsed = toDate(value);
  return parsed ? format(parsed, "MM/dd/yyyy") : placeholder;
}

export function GlobalDateSelector({
  value,
  onChange,
  placeholder = "Select date",
  className,
  disabled = false,
  allowClear = false,
}: GlobalDateSelectorProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(() => toDate(value), [value]);

  const handleSelect = (date?: Date) => {
    if (!date) {
      return;
    }

    onChange(format(date, "yyyy-MM-dd"));
    setOpen(false);
  };

  const handleToday = () => {
    onChange(format(new Date(), "yyyy-MM-dd"));
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-12 w-full justify-between rounded-[22px] border-border/70 bg-background/78 px-3.5 text-left shadow-[0_16px_34px_-24px_rgba(15,23,42,0.28)] hover:bg-background",
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
              <CalendarDays className="h-4 w-4" />
            </span>
            <span className="truncate text-sm font-medium text-foreground">
              {formatDateValue(value, placeholder)}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto rounded-[26px] p-3">
        <div className="space-y-3">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            defaultMonth={selectedDate ?? new Date()}
          />
          <div className="flex items-center justify-between px-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-xl px-3 text-muted-foreground hover:text-foreground"
              onClick={handleClear}
              disabled={!allowClear || !value}
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-xl px-3 text-primary hover:text-primary"
              onClick={handleToday}
            >
              Today
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
