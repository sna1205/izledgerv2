import { useEffect, useMemo, useReducer } from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/auth-context";
import {
  collectEconomicCalendarLiveEvents,
  isEconomicCalendarLiveQuery,
  refetchEconomicCalendarLiveQueries,
} from "@/features/economic-calendar/economic-calendar-live.service";
import {
  getLiveWatchCandidates,
  getNextEconomicCalendarLiveCheckDelayMs,
} from "@/features/economic-calendar/economic-calendar-live.selector";
import { listTrades } from "@/services/api/trades";
import { privateQueryKey } from "@/services/query-client";

const RECENT_INSTRUMENT_LIMIT = 24;

export function EconomicCalendarLivePollingManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, forceRefresh] = useReducer((value) => value + 1, 0);

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

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query && isEconomicCalendarLiveQuery(event.query, user.id)) {
        forceRefresh();
      }
    });

    return unsubscribe;
  }, [queryClient, user.id]);

  const instrumentUniverse = useMemo(() => (
    Array.from(new Set((recentTradesQuery.data ?? []).map((trade) => trade.pair))).slice(0, 8)
  ), [recentTradesQuery.data]);
  const liveEvents = collectEconomicCalendarLiveEvents(queryClient, user.id);
  const candidates = useMemo(() => getLiveWatchCandidates(liveEvents, new Date(), instrumentUniverse), [instrumentUniverse, liveEvents]);
  const nextDelayMs = useMemo(() => {
    if (candidates.length > 0) {
      return Math.min(...candidates.map((candidate) => candidate.pollIntervalMs));
    }

    return getNextEconomicCalendarLiveCheckDelayMs(liveEvents, new Date());
  }, [candidates, liveEvents]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      forceRefresh();

      if (document.visibilityState === "hidden" || candidates.length === 0) {
        return;
      }

      void refetchEconomicCalendarLiveQueries(queryClient, user.id);
    }, nextDelayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [candidates.length, nextDelayMs, queryClient, user.id]);

  return null;
}
