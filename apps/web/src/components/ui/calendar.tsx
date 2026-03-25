import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/utils/class-names";

export type CalendarProps = DayPickerProps;

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-0", className)}
      classNames={{
        months: "flex flex-col gap-3",
        month: "space-y-3",
        caption: "flex items-center justify-between pt-1",
        caption_label: "text-sm font-semibold text-foreground",
        nav: "flex items-center gap-1",
        nav_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 rounded-lg border border-border/20 bg-background/60 p-0 text-foreground hover:bg-accent/50",
        ),
        nav_button_previous: "order-1",
        nav_button_next: "order-2",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell: "w-9 text-[11px] font-medium text-muted-foreground",
        row: "mt-1 flex w-full",
        cell: "relative h-9 w-9 p-0 text-center text-sm",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 rounded-lg p-0 text-sm font-normal text-foreground hover:bg-accent/55",
        ),
        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        day_today: "border border-primary/35 bg-primary/8 text-foreground",
        day_range_start: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        day_range_end: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        day_range_middle: "rounded-none bg-primary/12 text-foreground hover:bg-primary/18",
        day_outside: "text-muted-foreground/45 opacity-100",
        day_disabled: "text-muted-foreground/35",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
