import { z } from "zod";
import type { EconomicCalendarEvent } from "@izledger/shared";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/errors.js";
import {
  createNormalizedEconomicEvent,
  dedupeEconomicCalendarEvents,
  mapEconomicEventImpact,
  normalizeCurrency,
  normalizeValue,
} from "./provider-normalization.js";

const rawTradingEconomicsEventSchema = z.object({
  CalendarId: z.union([z.string(), z.number()]).optional(),
  Date: z.string().optional().default(""),
  Country: z.string().optional().default(""),
  Category: z.string().optional().default(""),
  Event: z.string().optional().default(""),
  Actual: z.string().optional().default(""),
  Previous: z.string().optional().default(""),
  Forecast: z.string().optional().default(""),
  TEForecast: z.string().optional().default(""),
  Importance: z.union([z.string(), z.number()]).optional(),
  LastUpdate: z.string().optional().default(""),
  Revised: z.string().optional().default(""),
  Currency: z.string().optional().default(""),
});

const rawTradingEconomicsCalendarSchema = z.array(rawTradingEconomicsEventSchema);

type RawTradingEconomicsEvent = z.infer<typeof rawTradingEconomicsEventSchema>;

const CURRENCY_SYMBOL_MAP: Record<string, string> = {
  "$": "USD",
  "US$": "USD",
  "A$": "AUD",
  "AU$": "AUD",
  "C$": "CAD",
  "CA$": "CAD",
  "NZ$": "NZD",
  "HK$": "HKD",
  "NT$": "TWD",
  "S$": "SGD",
  "R$": "BRL",
  "CHF": "CHF",
  "JPY": "JPY",
  "EUR": "EUR",
  "GBP": "GBP",
};

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  Argentina: "ARS",
  Australia: "AUD",
  Austria: "EUR",
  Belgium: "EUR",
  Brazil: "BRL",
  Bulgaria: "BGN",
  Canada: "CAD",
  Chile: "CLP",
  China: "CNY",
  Colombia: "COP",
  Croatia: "EUR",
  Cyprus: "EUR",
  "Czech Republic": "CZK",
  Denmark: "DKK",
  Estonia: "EUR",
  Finland: "EUR",
  France: "EUR",
  Germany: "EUR",
  Greece: "EUR",
  "Hong Kong": "HKD",
  Hungary: "HUF",
  India: "INR",
  Indonesia: "IDR",
  Ireland: "EUR",
  Israel: "ILS",
  Italy: "EUR",
  Japan: "JPY",
  Latvia: "EUR",
  Lithuania: "EUR",
  Luxembourg: "EUR",
  Malaysia: "MYR",
  Malta: "EUR",
  Mexico: "MXN",
  Netherlands: "EUR",
  "New Zealand": "NZD",
  Norway: "NOK",
  Peru: "PEN",
  Philippines: "PHP",
  Poland: "PLN",
  Portugal: "EUR",
  Romania: "RON",
  Russia: "RUB",
  "Saudi Arabia": "SAR",
  Singapore: "SGD",
  Slovakia: "EUR",
  Slovenia: "EUR",
  "South Africa": "ZAR",
  "South Korea": "KRW",
  Spain: "EUR",
  Sweden: "SEK",
  Switzerland: "CHF",
  Taiwan: "TWD",
  Thailand: "THB",
  Turkey: "TRY",
  Ukraine: "UAH",
  "United Arab Emirates": "AED",
  "United Kingdom": "GBP",
  "United States": "USD",
  Vietnam: "VND",
  "Euro Area": "EUR",
  Eurozone: "EUR",
  "European Union": "EUR",
};

function createAbortSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => {
    controller.abort(new DOMException("The request timed out.", "TimeoutError"));
  }, timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => {
      globalThis.clearTimeout(timeoutId);
    },
  };
}

function getTradingEconomicsApiKey() {
  const apiKey = env.ECONOMIC_CALENDAR_TRADING_ECONOMICS_API_KEY?.trim();

  if (!apiKey) {
    throw new AppError(
      503,
      "ECONOMIC_CALENDAR_PROVIDER_MISCONFIGURED",
      "Trading Economics credentials are missing for the configured economic calendar provider.",
    );
  }

  return apiKey;
}

function normalizeTradingEconomicsCurrency(rawCurrency: string, country: string) {
  const directCode = normalizeCurrency(rawCurrency);

  if (directCode.length === 3) {
    return directCode;
  }

  const symbolMatch = CURRENCY_SYMBOL_MAP[rawCurrency.trim()];

  if (symbolMatch) {
    return symbolMatch;
  }

  return COUNTRY_CURRENCY_MAP[country.trim()] ?? "";
}

function normalizeTradingEconomicsForecast(rawEvent: RawTradingEconomicsEvent) {
  return normalizeValue(rawEvent.Forecast) ?? normalizeValue(rawEvent.TEForecast);
}

export function normalizeTradingEconomicsEconomicCalendarEvent(
  rawEvent: RawTradingEconomicsEvent,
): EconomicCalendarEvent | null {
  const title = rawEvent.Event.trim();
  const country = rawEvent.Country.trim();
  const eventTime = new Date(rawEvent.Date);
  const currency = normalizeTradingEconomicsCurrency(rawEvent.Currency, country);

  if (!title || !country || !currency || Number.isNaN(eventTime.getTime())) {
    return null;
  }

  const providerEventId = normalizeValue(typeof rawEvent.CalendarId === "string" || typeof rawEvent.CalendarId === "number"
    ? String(rawEvent.CalendarId)
    : null);

  if (!providerEventId) {
    return null;
  }

  const lastUpdatedAt = normalizeValue(rawEvent.LastUpdate);
  const createdAt = lastUpdatedAt ?? eventTime.toISOString();

  return createNormalizedEconomicEvent({
    providerName: "trading-economics",
    providerEventId,
    title,
    country,
    currency,
    impactLevel: mapEconomicEventImpact(rawEvent.Importance),
    eventTimeUtc: eventTime.toISOString(),
    previousValue: normalizeValue(rawEvent.Previous),
    forecastValue: normalizeTradingEconomicsForecast(rawEvent),
    actualValue: normalizeValue(rawEvent.Actual),
    revisedValue: normalizeValue(rawEvent.Revised),
    rawCategory: rawEvent.Category,
    createdAt,
    lastUpdatedAt,
  });
}

function buildTradingEconomicsCalendarUrl(startDate: string, endDate: string) {
  const baseUrl = env.ECONOMIC_CALENDAR_TRADING_ECONOMICS_BASE_URL.replace(/\/+$/, "");
  const url = new URL(`${baseUrl}/calendar/country/All/${startDate}/${endDate}`);
  url.searchParams.set("c", getTradingEconomicsApiKey());
  url.searchParams.set("f", "json");
  return url;
}

export async function fetchTradingEconomicsCalendarFeed(
  query: {
    startDate: string;
    endDate: string;
  },
  fetchImpl: typeof fetch = globalThis.fetch,
) {
  const requestAbort = createAbortSignal(env.ECONOMIC_CALENDAR_PROVIDER_TIMEOUT_MS);

  try {
    const response = await fetchImpl(buildTradingEconomicsCalendarUrl(query.startDate, query.endDate), {
      headers: {
        Accept: "application/json",
      },
      signal: requestAbort.signal,
    });

    if (!response.ok) {
      throw new AppError(
        503,
        "ECONOMIC_CALENDAR_UNAVAILABLE",
        "The economic calendar feed is temporarily unavailable.",
      );
    }

    const payload = await response.json();
    return rawTradingEconomicsCalendarSchema.parse(payload);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      503,
      "ECONOMIC_CALENDAR_UNAVAILABLE",
      "The economic calendar feed is temporarily unavailable.",
    );
  } finally {
    requestAbort.cleanup();
  }
}

export async function fetchTradingEconomicsEconomicCalendarEvents(
  query: {
    startDate: string;
    endDate: string;
  },
  fetchImpl: typeof fetch = globalThis.fetch,
) {
  const rawEvents = await fetchTradingEconomicsCalendarFeed(query, fetchImpl);
  const normalized = rawEvents
    .map((event) => normalizeTradingEconomicsEconomicCalendarEvent(event))
    .filter((event): event is EconomicCalendarEvent => Boolean(event));

  return dedupeEconomicCalendarEvents(normalized);
}
