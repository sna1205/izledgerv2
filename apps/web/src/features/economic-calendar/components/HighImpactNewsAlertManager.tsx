import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/auth-context";
import { HighImpactNewsToast } from "@/features/economic-calendar/components/HighImpactNewsToast";
import { buildEconomicCalendarEventPath, buildEconomicCalendarEventState } from "@/features/economic-calendar/routes";
import {
  dismissHighImpactNewsAlert,
  markHighImpactNewsAlertShown,
  shouldSuppressHighImpactNewsAlert,
} from "@/features/economic-calendar/high-impact-news-alert.storage";
import {
  formatHighImpactNewsAlertContext,
  formatHighImpactNewsAlertRelevance,
  selectHighImpactNewsAlertCandidate,
  type HighImpactNewsAlertCandidate,
} from "@/features/economic-calendar/high-impact-news-alert.selector";
import { readEconomicCalendarTimeZonePreference } from "@/features/economic-calendar/utils";
import { getEconomicCalendarList } from "@/services/api/economic-calendar";
import { listTrades } from "@/services/api/trades";
import { privateQueryKey } from "@/services/query-client";

const RECENT_INSTRUMENT_LIMIT = 24;
const HIGH_IMPACT_NEWS_BOOT_DELAY_MS = 1400;
const HIGH_IMPACT_NEWS_AUTO_HIDE_MS = 15000;

interface HighImpactNewsAlertManagerProps {
  bootDelayMs?: number;
  autoHideMs?: number;
  candidateOverride?: HighImpactNewsAlertCandidate | null;
}

export function HighImpactNewsAlertManager({
  bootDelayMs = HIGH_IMPACT_NEWS_BOOT_DELAY_MS,
  autoHideMs = HIGH_IMPACT_NEWS_AUTO_HIDE_MS,
  candidateOverride,
}: HighImpactNewsAlertManagerProps = {}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const hasCheckedRef = useRef(false);
  const [visibleEventId, setVisibleEventId] = useState<string | null>(null);

  const recentTradesQuery = useQuery({
    queryKey: privateQueryKey(user.id, "high-impact-news-alert", "recent-instruments"),
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

  const eventsQuery = useQuery({
    queryKey: privateQueryKey(user.id, "high-impact-news-alert", "events", { live: true }),
    queryFn: () => getEconomicCalendarList({
      range: "week",
      impacts: ["high"],
      live: true,
    }),
  });

  const instrumentUniverse = useMemo(() => (
    Array.from(new Set((recentTradesQuery.data ?? []).map((trade) => trade.pair))).slice(0, 8)
  ), [recentTradesQuery.data]);

  const queryCandidate = useMemo(() => selectHighImpactNewsAlertCandidate({
    events: eventsQuery.data?.items ?? [],
    instruments: instrumentUniverse,
  }), [eventsQuery.data?.items, instrumentUniverse]);
  const candidate = candidateOverride ?? queryCandidate;
  const isLoading = candidateOverride === undefined
    ? recentTradesQuery.isLoading || eventsQuery.isLoading
    : false;

  const timeZone = useMemo(() => readEconomicCalendarTimeZonePreference(), []);
  const relevanceLabel = candidate ? formatHighImpactNewsAlertRelevance(candidate) : null;
  const contextLabel = candidate ? formatHighImpactNewsAlertContext(candidate) : null;

  useEffect(() => {
    if (hasCheckedRef.current) {
      return;
    }

    if (isLoading) {
      return;
    }

    hasCheckedRef.current = true;

    if (!candidate || shouldSuppressHighImpactNewsAlert(candidate.event)) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (shouldSuppressHighImpactNewsAlert(candidate.event)) {
        return;
      }

      markHighImpactNewsAlertShown(candidate.event);
      setVisibleEventId(candidate.event.id);
    }, bootDelayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [bootDelayMs, candidate, isLoading]);

  useEffect(() => {
    if (!visibleEventId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setVisibleEventId((currentId) => (currentId === visibleEventId ? null : currentId));
    }, autoHideMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [autoHideMs, visibleEventId]);

  if (!candidate || visibleEventId !== candidate.event.id) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[5.25rem] z-40 flex justify-center px-3 sm:left-auto sm:right-6 sm:top-[5.75rem] sm:block sm:px-0">
      <HighImpactNewsToast
        event={candidate.event}
        timeZone={timeZone}
        relevanceLabel={relevanceLabel}
        contextLabel={contextLabel}
        onDismiss={() => {
          dismissHighImpactNewsAlert(candidate.event);
          setVisibleEventId(null);
        }}
        onViewEvent={() => {
          setVisibleEventId(null);
          navigate(buildEconomicCalendarEventPath(candidate.event.id), {
            state: buildEconomicCalendarEventState(candidate.event),
          });
        }}
        onViewCalendar={() => {
          setVisibleEventId(null);
          navigate("/economic-calendar");
        }}
      />
    </div>
  );
}
