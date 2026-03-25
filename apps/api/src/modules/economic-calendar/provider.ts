import { env } from "../../config/env.js";
import { fetchFairEconomyEconomicCalendarEvents, normalizeEconomicCalendarEvent, type RawEconomicCalendarEvent } from "./provider.fair-economy.js";
import { dedupeEconomicCalendarEvents } from "./provider-normalization.js";
import { fetchTradingEconomicsEconomicCalendarEvents, normalizeTradingEconomicsEconomicCalendarEvent } from "./provider.trading-economics.js";

export type EconomicCalendarProviderFetchQuery = {
  startDate: string;
  endDate: string;
};

type EconomicCalendarProviderName = "fair-economy" | "trading-economics";

function getEconomicCalendarProviderName(): EconomicCalendarProviderName {
  return env.ECONOMIC_CALENDAR_PROVIDER;
}

export async function fetchEconomicCalendarFeed(
  query: EconomicCalendarProviderFetchQuery,
  fetchImpl: typeof fetch = globalThis.fetch,
) {
  if (getEconomicCalendarProviderName() === "trading-economics") {
    return fetchTradingEconomicsEconomicCalendarEvents(query, fetchImpl);
  }

  return fetchFairEconomyEconomicCalendarEvents(fetchImpl);
}

export {
  dedupeEconomicCalendarEvents,
  normalizeEconomicCalendarEvent,
  normalizeTradingEconomicsEconomicCalendarEvent,
};

export type {
  RawEconomicCalendarEvent,
};
