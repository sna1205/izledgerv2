import type { EconomicCalendarEvent } from "@/types";
import { DataBadge } from "@/components/DataBadge";
import { cn } from "@/utils/class-names";
import {
  getEconomicEventUpdatedLabel,
  getEconomicPendingValueLabel,
  isEconomicEventRecentlyUpdated,
} from "@/features/economic-calendar/economic-calendar-release-status";
import {
  formatEconomicEventTime,
  getEconomicCurrencyBadgeClassName,
  getEconomicEventRelevanceList,
  getEconomicImpactLabel,
  getEconomicImpactTone,
  getEconomicStatusLabel,
} from "@/features/economic-calendar/utils";

interface EconomicCalendarEventCardProps {
  event: EconomicCalendarEvent;
  instrumentUniverse?: string[];
  timeZone?: string;
  compact?: boolean;
}

function formatMetricValue(value: string | null) {
  return value ?? "\u2014";
}

export function EconomicCalendarEventCard({
  event,
  instrumentUniverse = [],
  timeZone,
  compact = false,
}: EconomicCalendarEventCardProps) {
  const relevance = getEconomicEventRelevanceList(event, instrumentUniverse, 1);
  const now = new Date();
  const updatedLabel = getEconomicEventUpdatedLabel(event, now);
  const recentlyUpdated = isEconomicEventRecentlyUpdated(event, now);

  return (
    <article
      className={cn(
        "grid grid-cols-[60px_minmax(0,1fr)_auto] gap-x-3 gap-y-1 border-b border-border/25 py-2 last:border-b-0 sm:grid-cols-[72px_minmax(0,1fr)_auto]",
        compact && "grid-cols-[56px_minmax(0,1fr)_auto] sm:grid-cols-[64px_minmax(0,1fr)_auto]",
        recentlyUpdated && "rounded-xl bg-emerald-500/5 px-2 ring-1 ring-emerald-500/15",
      )}
    >
      <div className="font-mono-price row-span-2 pt-0.5 text-[13px] font-semibold tracking-[-0.02em] text-foreground">
        {formatEconomicEventTime(event, timeZone)}
      </div>

      <div className="min-w-0">
        <h3 className={cn(
          "truncate text-sm font-medium leading-5 text-foreground sm:text-[14px]",
          compact && "text-[13px]",
        )}
        >
          {event.title}
        </h3>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-1.5 justify-self-end">
        <DataBadge tone={getEconomicImpactTone(event.impactLevel)} className="px-2 py-0.5 text-[10px]">
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
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[11px] leading-5 text-muted-foreground/90">
          <span>
            Prev
            {" "}
            <span className="font-medium text-foreground">{formatMetricValue(event.previousValue)}</span>
          </span>
          <span>
            Fcst
            {" "}
            <span className="font-medium text-foreground">{formatMetricValue(event.forecastValue)}</span>
          </span>
          <span>
            Act
            {" "}
            <span className="font-medium text-foreground">{event.actualValue ?? getEconomicPendingValueLabel(event, now)}</span>
          </span>
          {relevance[0] ? (
            <span className="truncate text-muted-foreground/75">
              {relevance[0].instrument}
            </span>
          ) : null}
          {updatedLabel ? <span className="text-emerald-700 dark:text-emerald-300">{updatedLabel}</span> : null}
        </div>
      </div>
    </article>
  );
}
