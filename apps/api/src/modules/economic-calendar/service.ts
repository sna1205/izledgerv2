import type {
  DashboardImportantEventsResponse,
  EconomicCalendarEvent,
  EconomicCalendarEventDetailResponse,
  EconomicCalendarListResponse,
  EconomicEventImpact,
} from "@izledger/shared";
import {
  getEconomicCalendarLiveMode,
  getEconomicCalendarLivePollIntervalMs,
} from "@izledger/shared";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/errors.js";
import {
  dedupeEconomicCalendarEvents,
  fetchEconomicCalendarFeed,
  normalizeEconomicCalendarEvent,
} from "./provider.js";
import { attachEconomicEventRelevance } from "./relevance.js";
import type { EconomicCalendarQuery } from "./schemas.js";

type CachedEconomicCalendar = {
  fetchedAtMs: number;
  fetchedAtUtc: string;
  items: EconomicCalendarEvent[];
};

type CachedEconomicCalendarResult = CachedEconomicCalendar & {
  providerStatus: "live" | "stale";
  cacheStatus: "miss" | "hit" | "stale";
};

let cachedEconomicCalendar: CachedEconomicCalendar | null = null;
let economicCalendarFetchPromise: Promise<CachedEconomicCalendar> | null = null;

export function resetEconomicCalendarCache() {
  cachedEconomicCalendar = null;
}

function toUtcDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function sortEvents(events: EconomicCalendarEvent[]) {
  return [...events].sort((left, right) => (
    new Date(left.eventTimeUtc).getTime() - new Date(right.eventTimeUtc).getTime()
    || left.currency.localeCompare(right.currency)
    || left.title.localeCompare(right.title)
  ));
}

function getRangeBounds(query: EconomicCalendarQuery) {
  if (query.dateFrom || query.dateTo) {
    const startDate = query.dateFrom ?? query.dateTo!;
    const endDate = query.dateTo ?? query.dateFrom!;

    return {
      range: "custom" as const,
      startDate,
      endDate,
    };
  }

  const today = new Date();
  const todayKey = toUtcDateKey(today);

  if (query.range === "today") {
    return {
      range: "today" as const,
      startDate: todayKey,
      endDate: todayKey,
    };
  }

  const currentDay = today.getUTCDay();
  const distanceFromMonday = (currentDay + 6) % 7;
  const weekStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - distanceFromMonday));
  const weekEnd = new Date(Date.UTC(weekStart.getUTCFullYear(), weekStart.getUTCMonth(), weekStart.getUTCDate() + 6));

  return {
    range: query.range ?? "week",
    startDate: toUtcDateKey(weekStart),
    endDate: toUtcDateKey(weekEnd),
  };
}

function hasMatchingImpact(event: EconomicCalendarEvent, impacts: EconomicEventImpact[]) {
  return impacts.length === 0 || impacts.includes(event.impactLevel);
}

function hasMatchingCurrency(event: EconomicCalendarEvent, currencies: string[]) {
  return currencies.length === 0 || currencies.includes(event.currency);
}

function isEventWithinRange(event: EconomicCalendarEvent, startDate: string, endDate: string) {
  const eventDateKey = event.eventTimeUtc.slice(0, 10);
  return eventDateKey >= startDate && eventDateKey <= endDate;
}

function filterEconomicCalendarItems(input: {
  items: EconomicCalendarEvent[];
  query: Pick<EconomicCalendarQuery, "currencies" | "impacts" | "instrument" | "relevantOnly">;
  bounds: {
    startDate: string;
    endDate: string;
  };
}) {
  const currencies = input.query.currencies ?? [];
  const impacts = input.query.impacts ?? [];
  const instrument = input.query.instrument?.trim().toUpperCase() ?? null;

  return input.items
    .filter((event) => isEventWithinRange(event, input.bounds.startDate, input.bounds.endDate))
    .filter((event) => hasMatchingCurrency(event, currencies))
    .filter((event) => hasMatchingImpact(event, impacts))
    .map((event) => attachEconomicEventRelevance(event, instrument))
    .filter((event) => !input.query.relevantOnly || event.relevance?.relevant);
}

function createLiveFocusSelector(input: {
  bounds: {
    startDate: string;
    endDate: string;
  };
  query: Pick<EconomicCalendarQuery, "currencies" | "impacts" | "instrument" | "relevantOnly">;
}) {
  return (items: EconomicCalendarEvent[]) => filterEconomicCalendarItems({
    items,
    bounds: input.bounds,
    query: input.query,
  }).filter((event) => event.impactLevel === "high" || event.impactLevel === "medium");
}

function getRefreshIntervalMs(mode: ReturnType<typeof getEconomicCalendarLiveMode>) {
  return getEconomicCalendarLivePollIntervalMs(mode) ?? env.ECONOMIC_CALENDAR_CACHE_TTL_SECONDS * 1000;
}

function getRefreshModePriority(mode: ReturnType<typeof getEconomicCalendarLiveMode>) {
  if (mode === "live") return 3;
  if (mode === "watch") return 2;
  if (mode === "cooldown") return 1;
  return 0;
}

function getRequestedRefreshMode(
  items: EconomicCalendarEvent[],
  selectLiveFocusEvents?: ((items: EconomicCalendarEvent[]) => EconomicCalendarEvent[]) | null,
  now = new Date(),
) {
  const focusedEvents = (selectLiveFocusEvents ? selectLiveFocusEvents(items) : items)
    .filter((event) => event.impactLevel === "high" || event.impactLevel === "medium");

  return focusedEvents.reduce<ReturnType<typeof getEconomicCalendarLiveMode>>((currentMode, event) => {
    const nextMode = getEconomicCalendarLiveMode({
      impactLevel: event.impactLevel,
      eventTimeUtc: event.eventTimeUtc,
      actualValue: event.actualValue,
      revisedValue: event.revisedValue,
      lastUpdatedAt: event.lastUpdatedAt,
      now,
    });

    return getRefreshModePriority(nextMode) > getRefreshModePriority(currentMode) ? nextMode : currentMode;
  }, "normal");
}

async function fetchAndCacheEconomicCalendar(fetchImpl: typeof fetch = globalThis.fetch) {
  if (!economicCalendarFetchPromise) {
    economicCalendarFetchPromise = (async () => {
      const fetchedAt = new Date(Date.now());
      const rawEvents = await fetchEconomicCalendarFeed(fetchImpl);
      const normalizedEvents = rawEvents
        .map((event) => normalizeEconomicCalendarEvent(event, fetchedAt))
        .filter((event): event is EconomicCalendarEvent => Boolean(event));
      const dedupedEvents = sortEvents(dedupeEconomicCalendarEvents(normalizedEvents));

      const nextCache = {
        fetchedAtMs: fetchedAt.getTime(),
        fetchedAtUtc: fetchedAt.toISOString(),
        items: dedupedEvents,
      } satisfies CachedEconomicCalendar;

      cachedEconomicCalendar = nextCache;
      return nextCache;
    })().finally(() => {
      economicCalendarFetchPromise = null;
    });
  }

  return economicCalendarFetchPromise;
}

async function getCachedOrFetchedEconomicCalendar(
  options: {
    live?: boolean;
    selectLiveFocusEvents?: ((items: EconomicCalendarEvent[]) => EconomicCalendarEvent[]) | null;
  } = {},
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<CachedEconomicCalendarResult> {
  const nowMs = Date.now();
  const now = new Date(nowMs);
  const refreshMode = cachedEconomicCalendar
    ? getRequestedRefreshMode(cachedEconomicCalendar.items, options.live ? options.selectLiveFocusEvents : null, now)
    : "normal";
  const refreshIntervalMs = getRefreshIntervalMs(refreshMode);

  if (cachedEconomicCalendar && nowMs - cachedEconomicCalendar.fetchedAtMs < refreshIntervalMs) {
    return {
      ...cachedEconomicCalendar,
      providerStatus: "live" as const,
      cacheStatus: "hit" as const,
    };
  }

  try {
    const nextCache = await fetchAndCacheEconomicCalendar(fetchImpl);

    return {
      ...nextCache,
      providerStatus: "live",
      cacheStatus: "miss",
    };
  } catch (error) {
    if (cachedEconomicCalendar) {
      return {
        ...cachedEconomicCalendar,
        providerStatus: "stale" as const,
        cacheStatus: "stale" as const,
      };
    }

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(503, "ECONOMIC_CALENDAR_UNAVAILABLE", "The economic calendar feed is temporarily unavailable.");
  }
}

export async function listEconomicCalendarEvents(
  query: EconomicCalendarQuery,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<EconomicCalendarListResponse> {
  const bounds = getRangeBounds(query);
  const cached = await getCachedOrFetchedEconomicCalendar({
    live: query.live,
    selectLiveFocusEvents: createLiveFocusSelector({
      bounds,
      query,
    }),
  }, fetchImpl);
  const instrument = query.instrument?.trim().toUpperCase() ?? null;
  const filteredItems = filterEconomicCalendarItems({
    items: cached.items,
    bounds,
    query,
  });

  return {
    fetchedAtUtc: cached.fetchedAtUtc,
    providerStatus: cached.providerStatus,
    cacheStatus: cached.cacheStatus,
    range: {
      startDate: bounds.startDate,
      endDate: bounds.endDate,
    },
    filters: {
      range: bounds.range,
      currencies: query.currencies ?? [],
      impacts: query.impacts ?? [],
      instrument,
      relevantOnly: query.relevantOnly,
    },
    items: filteredItems,
  };
}

export async function getDashboardImportantEvents(
  query: EconomicCalendarQuery,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<DashboardImportantEventsResponse> {
  const listResponse = await listEconomicCalendarEvents({
    ...query,
    range: "today",
  }, fetchImpl);

  const now = Date.now();
  const importantEvents = listResponse.items.filter((event) => event.impactLevel === "high" || event.impactLevel === "medium");
  const nextImportantEvent = importantEvents.find((event) => new Date(event.eventTimeUtc).getTime() >= now) ?? null;

  return {
    fetchedAtUtc: listResponse.fetchedAtUtc,
    providerStatus: listResponse.providerStatus,
    cacheStatus: listResponse.cacheStatus,
    nextImportantEvent,
    items: importantEvents.slice(0, 5),
  };
}

export async function getEconomicCalendarEventDetail(
  eventId: string,
  query: { instrument?: string; live?: boolean },
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<EconomicCalendarEventDetailResponse> {
  const cached = await getCachedOrFetchedEconomicCalendar({
    live: query.live,
    selectLiveFocusEvents: (items) => items
      .map((event) => attachEconomicEventRelevance(event, query.instrument?.trim().toUpperCase() ?? null))
      .filter((event) => event.id === eventId),
  }, fetchImpl);
  const instrument = query.instrument?.trim().toUpperCase() ?? null;
  const sortedItems = cached.items.map((event) => attachEconomicEventRelevance(event, instrument));
  const currentIndex = sortedItems.findIndex((event) => event.id === eventId);

  if (currentIndex === -1) {
    throw new AppError(404, "ECONOMIC_CALENDAR_EVENT_NOT_FOUND", "The requested economic calendar event could not be found.");
  }

  const event = sortedItems[currentIndex];
  const eventTimeMs = new Date(event.eventTimeUtc).getTime();
  const eventDateKey = event.eventTimeUtc.slice(0, 10);

  return {
    fetchedAtUtc: cached.fetchedAtUtc,
    providerStatus: cached.providerStatus,
    cacheStatus: cached.cacheStatus,
    event,
    navigation: {
      previousEventId: sortedItems[currentIndex - 1]?.id ?? null,
      nextEventId: sortedItems[currentIndex + 1]?.id ?? null,
    },
    sameTimeEvents: sortedItems.filter((candidate) => (
      candidate.id !== event.id && candidate.eventTimeUtc === event.eventTimeUtc
    )),
    sameSessionEvents: sortedItems.filter((candidate) => {
      if (candidate.id === event.id) {
        return false;
      }

      const candidateTimeMs = new Date(candidate.eventTimeUtc).getTime();
      return candidate.eventTimeUtc.slice(0, 10) === eventDateKey
        && Math.abs(candidateTimeMs - eventTimeMs) <= 6 * 60 * 60 * 1000;
    }).slice(0, 6),
  };
}
