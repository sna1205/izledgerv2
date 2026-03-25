import { createHash } from "node:crypto";
import { z } from "zod";
import type {
  EconomicCalendarEvent,
  EconomicEventCategory,
  EconomicEventImpact,
} from "@izledger/shared";
import { deriveEconomicEventStatus } from "@izledger/shared";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/errors.js";

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

function normalizeValue(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeCurrency(value: string) {
  return value.trim().toUpperCase().slice(0, 3);
}

function normalizeCountry(value: string, currency: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized.toUpperCase() : currency;
}

function createStableId(input: string) {
  return createHash("sha1").update(input).digest("hex").slice(0, 20);
}

function getFallbackProviderEventId(event: RawEconomicCalendarEvent) {
  return createStableId([
    event.title.trim(),
    normalizeCurrency(event.country),
    event.date.trim(),
  ].join("|"));
}

export function mapEconomicEventImpact(impact: string): EconomicEventImpact {
  const normalized = impact.trim().toLowerCase();

  if (normalized === "high") {
    return "high";
  }

  if (normalized === "medium") {
    return "medium";
  }

  if (normalized === "holiday") {
    return "holiday";
  }

  return "low";
}

export function mapEconomicEventCategory(input: { title: string; impactLevel: EconomicEventImpact; rawCategory?: string | null }): EconomicEventCategory {
  const rawCategory = input.rawCategory?.trim().toLowerCase();

  if (input.impactLevel === "holiday" || /\bholiday\b/i.test(input.title) || rawCategory === "holiday") {
    return "holiday";
  }

  if (rawCategory === "inflation" || /\b(cpi|ppi|inflation|prices?)\b/i.test(input.title)) {
    return "inflation";
  }

  if (rawCategory === "labor" || /\b(nfp|nonfarm|employment|unemployment|payroll|jobless|claims?)\b/i.test(input.title)) {
    return "labor";
  }

  if (rawCategory === "growth" || /\b(gdp|gross domestic|growth)\b/i.test(input.title)) {
    return "growth";
  }

  if (rawCategory === "central-bank" || /\b(fomc|fed|ecb|boj|boe|rba|rbnz|snb|rate|statement|minutes|chair|governor|speaks?)\b/i.test(input.title)) {
    return "central-bank";
  }

  if (rawCategory === "housing" || /\b(hpi|housing|home|building permits?|construction)\b/i.test(input.title)) {
    return "housing";
  }

  if (rawCategory === "energy" || /\b(crude oil|gas|inventories|api weekly|storage)\b/i.test(input.title)) {
    return "energy";
  }

  if (rawCategory === "sentiment" || /\b(confidence|sentiment|expectations|climate|ifo|gfk)\b/i.test(input.title)) {
    return "sentiment";
  }

  if (rawCategory === "activity" || /\b(pmi|manufacturing|services|retail sales|industrial production|current account|trade balance)\b/i.test(input.title)) {
    return "activity";
  }

  return "other";
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
  const eventTimeUtc = eventTime.toISOString();
  const impactLevel = mapEconomicEventImpact(rawEvent.impact);
  const actualValue = normalizeValue(rawEvent.actual);
  const revisedValue = normalizeValue(rawEvent.revised);
  const createdAt = now.toISOString();

  return {
    id: createStableId(`fair-economy|${providerEventId}`),
    providerEventId,
    title,
    country: normalizeCountry(rawEvent.country, currency),
    currency,
    impactLevel,
    eventTimeUtc,
    previousValue: normalizeValue(rawEvent.previous),
    forecastValue: normalizeValue(rawEvent.forecast),
    actualValue,
    revisedValue,
    status: deriveEconomicEventStatus({
      impactLevel,
      eventTimeUtc,
      actualValue,
      revisedValue,
      now,
    }),
    category: mapEconomicEventCategory({
      title,
      impactLevel,
      rawCategory: rawEvent.category,
    }),
    sourceProvider: "fair-economy",
    lastUpdatedAt: createdAt,
    createdAt,
    updatedAt: createdAt,
    relevance: null,
  };
}

function choosePreferredDuplicate(current: EconomicCalendarEvent, candidate: EconomicCalendarEvent) {
  const currentScore = [current.actualValue, current.revisedValue, current.forecastValue, current.previousValue].filter(Boolean).length;
  const candidateScore = [candidate.actualValue, candidate.revisedValue, candidate.forecastValue, candidate.previousValue].filter(Boolean).length;

  if (candidateScore > currentScore) {
    return candidate;
  }

  if (candidateScore < currentScore) {
    return current;
  }

  return candidate.updatedAt > current.updatedAt ? candidate : current;
}

export function dedupeEconomicCalendarEvents(events: EconomicCalendarEvent[]) {
  const deduped = new Map<string, EconomicCalendarEvent>();

  for (const event of events) {
    const existing = deduped.get(event.providerEventId);

    if (!existing) {
      deduped.set(event.providerEventId, event);
      continue;
    }

    deduped.set(event.providerEventId, choosePreferredDuplicate(existing, event));
  }

  return Array.from(deduped.values());
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

export async function fetchEconomicCalendarFeed(fetchImpl: typeof fetch = globalThis.fetch) {
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
