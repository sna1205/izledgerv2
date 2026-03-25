import { ArrowUpRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import type { EconomicCalendarEvent } from "@/types";
import { DataBadge } from "@/components/DataBadge";
import { cn } from "@/utils/class-names";
import { buildEconomicCalendarEventPath, buildEconomicCalendarEventState } from "@/features/economic-calendar/routes";
import {
  getEconomicEventUpdatedLabel,
  getEconomicPendingValueLabel,
  isEconomicEventRecentlyUpdated,
} from "@/features/economic-calendar/economic-calendar-release-status";
import {
  formatEconomicEventTime,
  getEconomicCurrencyBadgeClassName,
  getEconomicImpactLabel,
  getEconomicImpactTone,
  getEconomicStatusLabel,
} from "@/features/economic-calendar/utils";

interface EconomicCalendarEventRowProps {
  event: EconomicCalendarEvent;
  instrumentUniverse?: string[];
  timeZone?: string;
}

function formatMetricValue(value: string | null) {
  return value ?? "\u2014";
}

function getImpactAccentClass(impactLevel: EconomicCalendarEvent["impactLevel"]) {
  if (impactLevel === "high") {
    return "border-l-danger/55";
  }

  if (impactLevel === "medium") {
    return "border-l-amber-500/45";
  }

  if (impactLevel === "holiday") {
    return "border-l-border/35";
  }

  return "border-l-primary/25";
}

function getImpactBadgeClass(impactLevel: EconomicCalendarEvent["impactLevel"]) {
  if (impactLevel === "high") {
    return "border-danger/15 bg-danger/[0.04] text-danger/85";
  }

  if (impactLevel === "medium") {
    return "border-amber-500/15 bg-amber-500/[0.05] text-amber-700/85 dark:text-amber-300/85";
  }

  if (impactLevel === "holiday") {
    return "border-border/30 bg-background/55 text-muted-foreground";
  }

  return "border-primary/15 bg-primary/[0.04] text-primary/80";
}

export function EconomicCalendarEventRow({
  event,
  instrumentUniverse = [],
  timeZone,
}: EconomicCalendarEventRowProps) {
  const location = useLocation();
  const now = new Date();
  const updatedLabel = getEconomicEventUpdatedLabel(event, now);
  const recentlyUpdated = isEconomicEventRecentlyUpdated(event, now);

  return (
    <Link
      to={buildEconomicCalendarEventPath(event.id, location.search)}
      state={buildEconomicCalendarEventState(event)}
      className={cn(
        "group block min-w-0 rounded-2xl border-l-2 px-4 py-3 transition-colors hover:bg-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        getImpactAccentClass(event.impactLevel),
        recentlyUpdated && "bg-emerald-500/5",
      )}
    >
      <div className="min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 text-[15px] font-semibold leading-5 text-foreground transition-colors group-hover:text-primary sm:text-base">
            {event.title}
          </h3>
          <div className="flex shrink-0 items-center gap-2 pl-2">
            <DataBadge
              tone={getEconomicImpactTone(event.impactLevel)}
              className={cn(
                "px-2 py-0.5 text-[10px] font-medium shadow-none",
                getImpactBadgeClass(event.impactLevel),
              )}
            >
              {getEconomicImpactLabel(event.impactLevel)}
            </DataBadge>
            <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/55 opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] leading-5 text-muted-foreground/80">
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
          <span className="text-border/80">•</span>
          <span>{getEconomicStatusLabel(event.status)}</span>
          {updatedLabel ? (
            <>
              <span className="text-border/80">•</span>
              <span className="text-emerald-700/90 dark:text-emerald-300/85">{updatedLabel}</span>
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] leading-5 text-muted-foreground/72">
          <span>
            Prev <span className="font-medium text-foreground/82">{formatMetricValue(event.previousValue)}</span>
          </span>
          <span>
            Fcst <span className="font-medium text-foreground/82">{formatMetricValue(event.forecastValue)}</span>
          </span>
          <span>
            Act <span className="font-medium text-foreground/88">{event.actualValue ?? getEconomicPendingValueLabel(event, now)}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
