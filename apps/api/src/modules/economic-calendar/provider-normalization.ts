import { createHash } from "node:crypto";
import type {
  EconomicCalendarEvent,
  EconomicEventCategory,
  EconomicEventImpact,
} from "@izledger/shared";
import { deriveEconomicEventStatus } from "@izledger/shared";

export function normalizeValue(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 && normalized.toLowerCase() !== "null" ? normalized : null;
}

export function normalizeCurrency(value: string | null | undefined) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
}

export function normalizeCountry(value: string | null | undefined, currency: string) {
  if (typeof value !== "string") {
    return currency;
  }

  const normalized = value.trim();

  if (!normalized) {
    return currency;
  }

  if (/^[A-Za-z]{2,3}$/.test(normalized)) {
    return normalized.toUpperCase();
  }

  return normalized;
}

export function createStableId(input: string) {
  return createHash("sha1").update(input).digest("hex").slice(0, 20);
}

export function mapEconomicEventImpact(impact: string | number | null | undefined): EconomicEventImpact {
  if (typeof impact === "number") {
    if (impact >= 3) {
      return "high";
    }

    if (impact === 2) {
      return "medium";
    }

    return "low";
  }

  const normalized = impact?.toString().trim().toLowerCase() ?? "";

  if (normalized === "3" || normalized === "high") {
    return "high";
  }

  if (normalized === "2" || normalized === "medium") {
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

export function createNormalizedEconomicEvent(input: {
  providerName: string;
  providerEventId: string;
  title: string;
  country: string;
  currency: string;
  impactLevel: EconomicEventImpact;
  eventTimeUtc: string;
  previousValue: string | null;
  forecastValue: string | null;
  actualValue: string | null;
  revisedValue: string | null;
  rawCategory?: string | null;
  createdAt: string;
  lastUpdatedAt?: string | null;
}) {
  const lastUpdatedAt = input.lastUpdatedAt ?? input.createdAt;

  return {
    id: createStableId(`${input.providerName}|${input.providerEventId}`),
    providerEventId: input.providerEventId,
    title: input.title,
    country: normalizeCountry(input.country, input.currency),
    currency: input.currency,
    impactLevel: input.impactLevel,
    eventTimeUtc: input.eventTimeUtc,
    previousValue: input.previousValue,
    forecastValue: input.forecastValue,
    actualValue: input.actualValue,
    revisedValue: input.revisedValue,
    status: deriveEconomicEventStatus({
      impactLevel: input.impactLevel,
      eventTimeUtc: input.eventTimeUtc,
      actualValue: input.actualValue,
      revisedValue: input.revisedValue,
      now: new Date(lastUpdatedAt),
    }),
    category: mapEconomicEventCategory({
      title: input.title,
      impactLevel: input.impactLevel,
      rawCategory: input.rawCategory,
    }),
    sourceProvider: input.providerName,
    lastUpdatedAt,
    createdAt: input.createdAt,
    updatedAt: lastUpdatedAt,
    relevance: null,
  } satisfies EconomicCalendarEvent;
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
