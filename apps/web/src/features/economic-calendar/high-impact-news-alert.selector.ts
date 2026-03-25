import { parseISO } from "date-fns";
import type { EconomicCalendarEvent } from "@/types";
import {
  getEconomicCategoryLabel,
  getEconomicEventRelevanceList,
  type EconomicEventRelevance,
} from "@/features/economic-calendar/utils";

export const HIGH_IMPACT_NEWS_ALERT_WINDOW_MINUTES = 60;

export type HighImpactNewsAlertCandidate = {
  event: EconomicCalendarEvent;
  minutesUntil: number;
  relevanceMatches: EconomicEventRelevance[];
};

const CATEGORY_PRIORITY: Record<EconomicCalendarEvent["category"], number> = {
  "central-bank": 5,
  inflation: 4,
  labor: 3,
  growth: 2,
  activity: 1,
  housing: 1,
  energy: 1,
  sentiment: 1,
  holiday: 0,
  other: 0,
};

function getEventTimeMs(event: EconomicCalendarEvent) {
  const value = parseISO(event.eventTimeUtc).getTime();
  return Number.isFinite(value) ? value : null;
}

export function selectHighImpactNewsAlertCandidate(input: {
  events: EconomicCalendarEvent[];
  instruments: string[];
  now?: Date;
  alertWindowMinutes?: number;
}) {
  const nowMs = (input.now ?? new Date()).getTime();
  const alertWindowMs = (input.alertWindowMinutes ?? HIGH_IMPACT_NEWS_ALERT_WINDOW_MINUTES) * 60_000;

  const candidates = input.events
    .filter((event) => event.impactLevel === "high")
    .map((event) => {
      const eventTimeMs = getEventTimeMs(event);

      if (eventTimeMs === null || eventTimeMs <= nowMs || eventTimeMs - nowMs > alertWindowMs) {
        return null;
      }

      const relevanceMatches = getEconomicEventRelevanceList(event, input.instruments, 3);

      return {
        event,
        minutesUntil: Math.round((eventTimeMs - nowMs) / 60_000),
        relevanceMatches,
      } satisfies HighImpactNewsAlertCandidate;
    })
    .filter((candidate): candidate is HighImpactNewsAlertCandidate => Boolean(candidate))
    .sort((left, right) => (
      right.relevanceMatches.length - left.relevanceMatches.length
      ||
      left.minutesUntil - right.minutesUntil
      || CATEGORY_PRIORITY[right.event.category] - CATEGORY_PRIORITY[left.event.category]
      || left.event.title.localeCompare(right.event.title)
    ));

  return candidates[0] ?? null;
}

export function formatHighImpactNewsAlertRelevance(candidate: HighImpactNewsAlertCandidate) {
  const labels = candidate.relevanceMatches.map((item) => item.instrument);

  if (labels.length === 0) {
    return `${candidate.event.currency} high-impact event`;
  }

  if (labels.length === 1) {
    return `Relevant to ${labels[0]}`;
  }

  return `Relevant to ${labels.slice(0, 2).join(" and ")}`;
}

export function formatHighImpactNewsAlertContext(candidate: HighImpactNewsAlertCandidate) {
  return `${getEconomicCategoryLabel(candidate.event.category)} risk may increase volatility.`;
}
