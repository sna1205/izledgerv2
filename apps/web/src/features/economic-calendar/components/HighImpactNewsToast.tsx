import { BellRing, CalendarDays, X } from "lucide-react";
import type { EconomicCalendarEvent } from "@/types";
import { Button } from "@/components/ui/button";
import { DataBadge } from "@/components/DataBadge";
import { cn } from "@/utils/class-names";
import { getEconomicEventUpdatedLabel } from "@/features/economic-calendar/economic-calendar-release-status";
import {
  formatEconomicCountdown,
  formatEconomicEventTime,
  getEconomicCurrencyBadgeClassName,
  getEconomicImpactLabel,
  getEconomicStatusLabel,
} from "@/features/economic-calendar/utils";

interface HighImpactNewsToastProps {
  event: EconomicCalendarEvent;
  timeZone: string;
  relevanceLabel: string | null;
  contextLabel: string | null;
  now?: Date;
  onDismiss: () => void;
  onViewEvent: () => void;
  onViewCalendar?: () => void;
}

export function HighImpactNewsToast({
  event,
  timeZone,
  relevanceLabel,
  contextLabel,
  now,
  onDismiss,
  onViewEvent,
  onViewCalendar,
}: HighImpactNewsToastProps) {
  const updatedLabel = getEconomicEventUpdatedLabel(event, now ?? new Date());
  const headline = event.status === "pending_release"
    ? "Release window active"
    : event.status === "released" || event.status === "revised"
      ? "Actual posted"
      : "High-impact news coming up";

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-auto w-[min(380px,calc(100vw-1.5rem))] rounded-[1.25rem] border border-border/60 bg-background/94 p-4 shadow-[0_28px_90px_-34px_rgba(15,23,42,0.45)] backdrop-blur-xl animate-in fade-in-0 zoom-in-95 slide-in-from-top-3 sm:slide-in-from-right-5 dark:shadow-[0_28px_90px_-34px_rgba(1,8,24,0.9)]"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-danger/20 bg-danger/10 text-danger shadow-inner">
          <BellRing className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold tracking-tight text-foreground">{headline}</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{event.title}</p>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Dismiss high-impact news alert"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <DataBadge tone="danger" className="px-2 py-0.5 text-[10px]">
              {getEconomicImpactLabel(event.impactLevel)}
            </DataBadge>
            <DataBadge
              tone="neutral"
              className={cn(
                "px-2 py-0.5 text-[10px] font-semibold tracking-[0.04em]",
                getEconomicCurrencyBadgeClassName(event.currency),
              )}
            >
              {event.currency}
            </DataBadge>
            <DataBadge tone="primary" className="px-2 py-0.5 text-[10px]">
              {getEconomicStatusLabel(event.status)}
            </DataBadge>
            <DataBadge tone="warning" className="px-2 py-0.5 text-[10px]">
              {formatEconomicCountdown(event, now)}
            </DataBadge>
          </div>

          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {formatEconomicEventTime(event, timeZone)}
            {" "}
            local time
            {relevanceLabel ? ` · ${relevanceLabel}` : ""}
          </p>
          {contextLabel ? <p className="mt-1 text-xs leading-5 text-muted-foreground/90">{contextLabel}</p> : null}
          {updatedLabel ? <p className="mt-1 text-xs leading-5 text-emerald-700 dark:text-emerald-300">{updatedLabel}</p> : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button size="sm" className="h-8 rounded-full px-3 text-xs" onClick={onViewEvent}>
              View event
            </Button>
            {onViewCalendar ? (
              <Button size="sm" variant="ghost" className="h-8 rounded-full px-3 text-xs" onClick={onViewCalendar}>
                <CalendarDays className="h-3.5 w-3.5" />
                View calendar
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
