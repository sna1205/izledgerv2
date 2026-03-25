import { z } from "zod";
import type { EconomicCalendarEvent } from "@izledger/shared";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/errors.js";
import {
  createNormalizedEconomicEvent,
  createStableId,
  dedupeEconomicCalendarEvents,
  mapEconomicEventImpact,
  normalizeCurrency,
  normalizeValue,
} from "./provider-normalization.js";

const rawEconomicEventSchema = z.object({
  title: z.string().optional().default(""),
  country: z.string().optional().default(""),
  date: z.string().optional().default(""),
  impact: z.string().optional().default(""),
  forecast: z.string().optional().default(""),
  previous: z.string().optional().default(""),
  actual: z.string().optional().default(""),
  revised: z.string().optional().default(""),
  category: z.string().optional().default(""),
  id: z.union([z.string(), z.number()]).optional(),
});

const rawEconomicCalendarSchema = z.array(rawEconomicEventSchema);

export type RawEconomicCalendarEvent = z.infer<typeof rawEconomicEventSchema>;

function getFallbackProviderEventId(event: RawEconomicCalendarEvent) {
  return createStableId([
    event.title.trim(),
    normalizeCurrency(event.country),
    event.date.trim(),
  ].join("|"));
}

export function normalizeEconomicCalendarEvent(
  rawEvent: RawEconomicCalendarEvent,
  now = new Date(),
): EconomicCalendarEvent | null {
  const title = rawEvent.title.trim();
  const currency = normalizeCurrency(rawEvent.country);

  if (!title || !currency) {
    return null;
  }

  const eventTime = new Date(rawEvent.date);

  if (Number.isNaN(eventTime.getTime())) {
    return null;
  }

  const providerEventId = normalizeValue(typeof rawEvent.id === "string" || typeof rawEvent.id === "number"
    ? String(rawEvent.id)
    : null) ?? getFallbackProviderEventId(rawEvent);
  const createdAt = now.toISOString();

  return createNormalizedEconomicEvent({
    providerName: "fair-economy",
    providerEventId,
    title,
    country: rawEvent.country,
    currency,
    impactLevel: mapEconomicEventImpact(rawEvent.impact),
    eventTimeUtc: eventTime.toISOString(),
    previousValue: normalizeValue(rawEvent.previous),
    forecastValue: normalizeValue(rawEvent.forecast),
    actualValue: normalizeValue(rawEvent.actual),
    revisedValue: normalizeValue(rawEvent.revised),
    rawCategory: rawEvent.category,
    createdAt,
    lastUpdatedAt: createdAt,
  });
}

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

export async function fetchFairEconomyCalendarFeed(fetchImpl: typeof fetch = globalThis.fetch) {
  const requestAbort = createAbortSignal(env.ECONOMIC_CALENDAR_PROVIDER_TIMEOUT_MS);

  try {
    const response = await fetchImpl(env.ECONOMIC_CALENDAR_PROVIDER_URL, {
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
    return rawEconomicCalendarSchema.parse(payload);
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

export async function fetchFairEconomyEconomicCalendarEvents(fetchImpl: typeof fetch = globalThis.fetch) {
  const fetchedAt = new Date(Date.now());
  const rawEvents = await fetchFairEconomyCalendarFeed(fetchImpl);
  const normalized = rawEvents
    .map((event) => normalizeEconomicCalendarEvent(event, fetchedAt))
    .filter((event): event is EconomicCalendarEvent => Boolean(event));

  return dedupeEconomicCalendarEvents(normalized);
}
