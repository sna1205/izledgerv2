import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Clock3, Globe2 } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { PageErrorState } from "@/components/PageErrorState";
import { DataBadge } from "@/components/DataBadge";
import { Button } from "@/components/ui/button";
import { FEATURES } from "@/config/features";
import { PageShell } from "@/layouts/PageShell";
import { useAuth } from "@/features/auth/auth-context";
import { useUnauthorizedSessionGuard } from "@/features/auth/use-unauthorized-session-guard";
import { getEventContent } from "@/features/economic-calendar/economicEventContent";
import {
  getEconomicEventUpdatedLabel,
  getEconomicForecastComparison,
  getEconomicForecastComparisonCopy,
  getEconomicPendingValueLabel,
  getEconomicReleaseWaitingCopy,
} from "@/features/economic-calendar/economic-calendar-release-status";
import {
  buildEconomicCalendarEventPath,
  buildEconomicCalendarEventState,
  type EconomicCalendarEventRouteState,
} from "@/features/economic-calendar/routes";
import {
  formatEconomicCalendarTimeZoneMeta,
  formatEconomicCalendarTimeZoneLabel,
  formatEconomicEventTime,
  formatEconomicEventUtcTime,
  getEconomicCategoryLabel,
  getEconomicEventRelevanceList,
  getEconomicImpactLabel,
  getEconomicImpactTone,
  getEconomicStatusLabel,
  readEconomicCalendarTimeZonePreference,
} from "@/features/economic-calendar/utils";
import { getEconomicCalendarEventDetail } from "@/services/api/economic-calendar";
import { listTrades } from "@/services/api/trades";
import { privateQueryKey } from "@/services/query-client";
import { withMinimumDelay } from "@/utils/loading";
import { ApiError } from "@/services/api/client";
import EconomicCalendarComingSoonPage from "@/pages/EconomicCalendarComingSoonPage";
import type { EconomicCalendarEvent } from "@/types";

const RECENT_INSTRUMENT_LIMIT = 24;

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.25rem] border border-border/30 bg-card/35 p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function DetailMetric({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="rounded-xl border border-border/25 bg-background/40 px-3 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value ?? "\u2014"}</p>
    </div>
  );
}

function ContentMetric({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/25 bg-background/40 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
      <div className="mt-2 text-sm leading-5 text-foreground">
        {children}
      </div>
    </div>
  );
}

function EconomicCalendarEventDetailLivePage() {
  const { user } = useAuth();
  const { eventId = "" } = useParams<{ eventId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const timeZone = readEconomicCalendarTimeZonePreference();

  const recentTradesQuery = useQuery({
    queryKey: privateQueryKey(user.id, "economic-calendar", "detail", "recent-instruments"),
    queryFn: async () => {
      const response = await listTrades({
        page: 1,
        pageSize: RECENT_INSTRUMENT_LIMIT,
        sortBy: "date",
        sortOrder: "desc",
      });

      return response.items;
    },
  });

  const instrumentUniverse = useMemo(() => (
    Array.from(new Set((recentTradesQuery.data ?? []).map((trade) => trade.pair))).slice(0, 8)
  ), [recentTradesQuery.data]);

  const detailQuery = useQuery({
    queryKey: privateQueryKey(user.id, "economic-calendar", "detail", {
      eventId,
      live: true,
    }),
    queryFn: () => withMinimumDelay(() => getEconomicCalendarEventDetail(eventId, { live: true })),
    enabled: Boolean(eventId),
  });

  useUnauthorizedSessionGuard(detailQuery.error, recentTradesQuery.error);

  const locationState = location.state as EconomicCalendarEventRouteState | null;
  const fallbackEvent = locationState?.event?.id === eventId ? locationState.event : null;
  const canUseFallbackEvent = detailQuery.error instanceof ApiError && detailQuery.error.status === 404 && Boolean(fallbackEvent);

  const detailData = detailQuery.data ?? (canUseFallbackEvent
    ? {
        fetchedAtUtc: null,
        providerStatus: "stale" as const,
        cacheStatus: "stale" as const,
        event: fallbackEvent as EconomicCalendarEvent,
        navigation: {
          previousEventId: null,
          nextEventId: null,
        },
        sameTimeEvents: [],
        sameSessionEvents: [],
      }
    : null);

  if (detailQuery.isLoading && !detailData) {
    return (
      <PageShell size="wide">
        <div className="text-sm text-muted-foreground">Loading event details...</div>
      </PageShell>
    );
  }

  if ((detailQuery.isError && !canUseFallbackEvent) || !detailData) {
    const notFound = detailQuery.error instanceof ApiError && detailQuery.error.status === 404;

    return (
      <PageErrorState
        title={notFound ? "Event not found" : "Event detail unavailable"}
        description={notFound
          ? "This event is no longer available in the current provider window."
          : "The economic event could not be loaded right now."}
        onRetry={notFound ? undefined : () => void detailQuery.refetch()}
        isRetrying={detailQuery.isFetching}
        secondaryAction={{
          label: "Back to calendar",
          onClick: () => navigate(`/economic-calendar${location.search}`),
        }}
      />
    );
  }

  const { event, sameTimeEvents, sameSessionEvents, navigation } = detailData;
  const now = new Date();
  const eventContent = getEventContent(event.title);
  const relevance = getEconomicEventRelevanceList(event, instrumentUniverse, 4);
  const backPath = `/economic-calendar${location.search}`;
  const updatedLabel = getEconomicEventUpdatedLabel(event, now);
  const releaseWaitingCopy = getEconomicReleaseWaitingCopy(event, now);
  const comparisonCopy = getEconomicForecastComparisonCopy(getEconomicForecastComparison(event));

  return (
    <PageShell size="wide">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to={backPath}>
              <ArrowLeft className="h-4 w-4" />
              Back to calendar
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground">{formatEconomicCalendarTimeZoneMeta(timeZone)}</span>
        </div>

        <header className="rounded-[1.5rem] border border-border/30 bg-card/40 p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <DataBadge tone={getEconomicImpactTone(event.impactLevel)}>{getEconomicImpactLabel(event.impactLevel)}</DataBadge>
                <DataBadge tone="neutral">{event.currency}</DataBadge>
                <DataBadge tone="primary">{getEconomicStatusLabel(event.status)}</DataBadge>
                {updatedLabel ? <DataBadge tone="warning">{updatedLabel}</DataBadge> : null}
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">{event.title}</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{eventContent.description}</p>
              {releaseWaitingCopy ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  {releaseWaitingCopy}
                  {" "}
                  Scheduled for {formatEconomicEventTime(event, timeZone)} {formatEconomicCalendarTimeZoneLabel(timeZone)}.
                </p>
              ) : null}
              {comparisonCopy ? <p className="mt-3 text-sm font-medium text-foreground">{comparisonCopy}</p> : null}
            </div>

            <div className="min-w-[240px] space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock3 className="h-4 w-4" />
                <span className="font-medium text-foreground">{formatEconomicEventTime(event, timeZone)}</span>
                <span>{formatEconomicCalendarTimeZoneLabel(timeZone)}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe2 className="h-4 w-4" />
                <span className="font-medium text-foreground">{formatEconomicEventUtcTime(event)}</span>
                <span>UTC reference</span>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
          <div className="space-y-4">
            <DetailSection title="Overview">
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailMetric label="Country" value={event.country} />
                <DetailMetric label="Category" value={getEconomicCategoryLabel(event.category)} />
                <DetailMetric label="Currency" value={event.currency} />
                <DetailMetric label="Status" value={getEconomicStatusLabel(event.status)} />
              </div>
            </DetailSection>

            <DetailSection title="Values">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <DetailMetric label="Previous" value={event.previousValue} />
                <DetailMetric label="Forecast" value={event.forecastValue} />
                <DetailMetric label="Actual" value={event.actualValue ?? getEconomicPendingValueLabel(event, now)} />
                <DetailMetric label="Revised" value={event.revisedValue} />
              </div>
              {(releaseWaitingCopy || updatedLabel) ? (
                <div className="mt-4 rounded-xl border border-border/25 bg-background/40 px-4 py-3 text-sm text-muted-foreground">
                  {releaseWaitingCopy ?? updatedLabel}
                </div>
              ) : null}
            </DetailSection>

            <DetailSection title="Trader Breakdown">
              <div className="grid gap-3 lg:grid-cols-2">
                <ContentMetric title="What is this">
                  <p className="text-muted-foreground">{eventContent.description}</p>
                </ContentMetric>
                <ContentMetric title="Why it matters">
                  <p className="text-muted-foreground">{eventContent.whyItMatters}</p>
                </ContentMetric>
                <ContentMetric title="How it impacts">
                  <div className="space-y-2">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Bullish:</span> {eventContent.impact.bullish}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Bearish:</span> {eventContent.impact.bearish}
                    </p>
                  </div>
                </ContentMetric>
                <ContentMetric title="Market behavior">
                  <p className="text-muted-foreground">{eventContent.behavior}</p>
                </ContentMetric>
                <ContentMetric title="Affected instruments">
                  <div className="flex flex-wrap gap-2">
                    {eventContent.instruments.map((item) => (
                      <DataBadge key={item} tone="warning">{item}</DataBadge>
                    ))}
                  </div>
                </ContentMetric>
              </div>
            </DetailSection>

            {sameTimeEvents.length > 0 ? (
              <DetailSection title="Same Time Releases">
                <div className="space-y-1">
                  {sameTimeEvents.map((item) => (
                    <Link
                      key={item.id}
                      to={buildEconomicCalendarEventPath(item.id, location.search)}
                      state={buildEconomicCalendarEventState(item)}
                      className="flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors hover:bg-accent/35"
                    >
                      <span className="font-medium text-foreground">{item.title}</span>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>{item.currency}</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </Link>
                  ))}
                </div>
              </DetailSection>
            ) : null}
          </div>

          <div className="space-y-4">
            <DetailSection title="Relevance">
              {relevance.length > 0 ? (
                <div className="space-y-3">
                  {relevance.map((item) => (
                    <div key={item.instrument} className="rounded-xl border border-border/25 bg-background/40 px-3 py-3">
                      <div className="flex items-center gap-2">
                        <DataBadge tone="warning">{item.instrument}</DataBadge>
                        <span className="text-sm font-medium text-foreground">{item.badge}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.reason}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No watched instruments are currently matched to this release.</p>
              )}
            </DetailSection>

            {sameSessionEvents.length > 0 ? (
              <DetailSection title="Same Session Events">
                <div className="space-y-1">
                  {sameSessionEvents.map((item) => (
                    <Link
                      key={item.id}
                      to={buildEconomicCalendarEventPath(item.id, location.search)}
                      state={buildEconomicCalendarEventState(item)}
                      className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-accent/35"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{formatEconomicEventTime(item, timeZone)} · {item.currency}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </DetailSection>
            ) : null}

            <DetailSection title="Navigation">
              <div className="flex flex-col gap-2">
                {navigation.previousEventId ? (
                  <Button variant="outline" asChild className="justify-between">
                    <Link to={buildEconomicCalendarEventPath(navigation.previousEventId, location.search)}>
                      <span>Previous event</span>
                      <ArrowLeft className="h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}
                {navigation.nextEventId ? (
                  <Button variant="outline" asChild className="justify-between">
                    <Link to={buildEconomicCalendarEventPath(navigation.nextEventId, location.search)}>
                      <span>Next event</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}
                <Button variant="ghost" asChild className="justify-start">
                  <Link to={backPath}>Return to calendar</Link>
                </Button>
              </div>
            </DetailSection>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

export default function EconomicCalendarEventDetail() {
  if (FEATURES.economicCalendar === "hidden") {
    return <Navigate to="/dashboard" replace />;
  }

  if (FEATURES.economicCalendar === "development") {
    return <EconomicCalendarComingSoonPage />;
  }

  return <EconomicCalendarEventDetailLivePage />;
}
