import { ArrowRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import type { EconomicCalendarEvent } from "@/types";
import { DataBadge } from "@/components/DataBadge";
import { cn } from "@/utils/class-names";
import { buildEconomicCalendarEventPath, buildEconomicCalendarEventState } from "@/features/economic-calendar/routes";
import {
  formatEconomicCompactCountdown,
  formatEconomicEventTime,
  getEconomicCurrencyBadgeClassName,
  getEconomicImpactLabel,
} from "@/features/economic-calendar/utils";

interface EconomicCalendarNextEventPreviewProps {
  event: EconomicCalendarEvent | null;
  now?: Date;
  timeZone?: string;
}

export function EconomicCalendarNextEventPreview({
  event,
  now,
  timeZone,
}: EconomicCalendarNextEventPreviewProps) {
  const location = useLocation();

  if (!event) {
    return (
      <div className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/55">
          Upcoming Event
        </p>
        <p className="text-sm text-muted-foreground">
          No high-impact event queued.
        </p>
      </div>
    );
  }

  return (
    <Link
      to={buildEconomicCalendarEventPath(event.id, location.search)}
      state={buildEconomicCalendarEventState(event)}
      className="group block rounded-2xl py-1 transition-colors hover:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="min-w-0 space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/55">
            Upcoming Event
          </p>

          <div className="space-y-1.5">
            <h3 className="text-lg font-semibold tracking-[-0.03em] text-foreground transition-colors group-hover:text-primary sm:text-[1.35rem]">
              {event.title}
            </h3>

            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{formatEconomicEventTime(event, timeZone)}</span>
              <span className="text-border/80">•</span>
              <DataBadge
                tone="neutral"
                className={cn(
                  "px-2 py-0.5 text-[10px] font-semibold tracking-[0.04em]",
                  getEconomicCurrencyBadgeClassName(event.currency),
                )}
              >
                {event.currency}
              </DataBadge>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <DataBadge
                tone={event.impactLevel === "high" ? "danger" : event.impactLevel === "medium" ? "warning" : "neutral"}
                className="px-2 py-0.5 text-[10px]"
              >
                {getEconomicImpactLabel(event.impactLevel)}
              </DataBadge>
              <span className="text-sm font-medium text-foreground/88">
                {formatEconomicCompactCountdown(event, now)}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
      </div>
    </Link>
  );
}
