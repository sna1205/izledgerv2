import type { Query, QueryClient } from "@tanstack/react-query";
import type {
  DashboardImportantEventsResponse,
  EconomicCalendarEvent,
  EconomicCalendarEventDetailResponse,
  EconomicCalendarListResponse,
} from "@/types";
import { PRIVATE_QUERY_ROOT } from "@/services/query-client";

function isEconomicCalendarListResponse(value: unknown): value is EconomicCalendarListResponse {
  return typeof value === "object" && value !== null && Array.isArray((value as EconomicCalendarListResponse).items);
}

function isDashboardImportantEventsResponse(value: unknown): value is DashboardImportantEventsResponse {
  return typeof value === "object" && value !== null && Array.isArray((value as DashboardImportantEventsResponse).items);
}

function isEconomicCalendarEventDetailResponse(value: unknown): value is EconomicCalendarEventDetailResponse {
  return typeof value === "object" && value !== null && typeof (value as EconomicCalendarEventDetailResponse).event === "object";
}

function hasLiveQueryFlag(queryKey: Query["queryKey"]) {
  const meta = queryKey[queryKey.length - 1];
  return typeof meta === "object" && meta !== null && "live" in meta && (meta as { live?: boolean }).live === true;
}

function isLiveEnabledEconomicCalendarQuery(query: Query, userId: string) {
  const queryKey = query.queryKey;

  if (!Array.isArray(queryKey) || queryKey[0] !== PRIVATE_QUERY_ROOT || queryKey[1] !== userId) {
    return false;
  }

  return (
    queryKey[2] === "economic-calendar"
    && (queryKey[3] === "list" || queryKey[3] === "detail" || queryKey[3] === "dashboard-important")
    && hasLiveQueryFlag(queryKey)
  ) || (
    queryKey[2] === "high-impact-news-alert"
    && queryKey[3] === "events"
    && hasLiveQueryFlag(queryKey)
  );
}

function extractEconomicCalendarEvents(data: unknown) {
  if (isEconomicCalendarListResponse(data)) {
    return data.items;
  }

  if (isDashboardImportantEventsResponse(data)) {
    const items = [...data.items];

    if (data.nextImportantEvent) {
      items.push(data.nextImportantEvent);
    }

    return items;
  }

  if (isEconomicCalendarEventDetailResponse(data)) {
    return [
      data.event,
      ...data.sameTimeEvents,
      ...data.sameSessionEvents,
    ];
  }

  return [];
}

export function collectEconomicCalendarLiveEvents(queryClient: QueryClient, userId: string) {
  const seen = new Map<string, EconomicCalendarEvent>();
  const queries = queryClient.getQueryCache().findAll({
    predicate: (query) => isLiveEnabledEconomicCalendarQuery(query, userId) && query.getObserversCount() > 0,
  });

  for (const query of queries) {
    for (const event of extractEconomicCalendarEvents(query.state.data)) {
      const existing = seen.get(event.id);

      if (!existing || existing.lastUpdatedAt < event.lastUpdatedAt) {
        seen.set(event.id, event);
      }
    }
  }

  return Array.from(seen.values());
}

export async function refetchEconomicCalendarLiveQueries(queryClient: QueryClient, userId: string) {
  await queryClient.refetchQueries({
    predicate: (query) => isLiveEnabledEconomicCalendarQuery(query, userId) && query.getObserversCount() > 0,
  });
}

export function isEconomicCalendarLiveQuery(query: Query, userId: string) {
  return isLiveEnabledEconomicCalendarQuery(query, userId);
}
