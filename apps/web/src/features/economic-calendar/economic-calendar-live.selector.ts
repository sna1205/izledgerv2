import {
  ECONOMIC_CALENDAR_LIVE_MAX_CANDIDATES,
  ECONOMIC_CALENDAR_WATCH_START_MINUTES,
  getEconomicEventLiveMode,
  getEconomicCalendarLivePollIntervalMs,
} from "@izledger/shared";
import type { EconomicCalendarLiveMode } from "@izledger/shared";
import type { EconomicCalendarEvent } from "@/types";
import { getEconomicEventRelevanceList, type EconomicEventRelevance } from "@/features/economic-calendar/utils";

export type EconomicCalendarLiveWatchCandidate = {
  event: EconomicCalendarEvent;
  mode: EconomicCalendarLiveMode;
  pollIntervalMs: number;
  relevanceMatches: EconomicEventRelevance[];
};

function getModePriority(mode: EconomicCalendarLiveMode) {
  if (mode === "live") return 3;
  if (mode === "watch") return 2;
  if (mode === "cooldown") return 1;
  return 0;
}

function getImpactPriority(event: EconomicCalendarEvent) {
  if (event.impactLevel === "high") return 2;
  if (event.impactLevel === "medium") return 1;
  return 0;
}

function getDistanceFromNowMs(event: EconomicCalendarEvent, now: Date) {
  return Math.abs(new Date(event.eventTimeUtc).getTime() - now.getTime());
}

export function getLiveWatchCandidates(
  events: EconomicCalendarEvent[],
  now = new Date(),
  instruments: string[] = [],
  maxCandidates = ECONOMIC_CALENDAR_LIVE_MAX_CANDIDATES,
) {
  const deduped = new Map<string, EconomicCalendarEvent>();

  for (const event of events) {
    const existing = deduped.get(event.id);

    if (!existing || existing.lastUpdatedAt < event.lastUpdatedAt) {
      deduped.set(event.id, event);
    }
  }

  return Array.from(deduped.values())
    .map((event) => {
      const mode = getEconomicEventLiveMode(event, now);
      const pollIntervalMs = getEconomicCalendarLivePollIntervalMs(mode);

      if (!pollIntervalMs) {
        return null;
      }

      return {
        event,
        mode,
        pollIntervalMs,
        relevanceMatches: getEconomicEventRelevanceList(event, instruments, 3),
      } satisfies EconomicCalendarLiveWatchCandidate;
    })
    .filter((candidate): candidate is EconomicCalendarLiveWatchCandidate => Boolean(candidate))
    .sort((left, right) => (
      getModePriority(right.mode) - getModePriority(left.mode)
      || getImpactPriority(right.event) - getImpactPriority(left.event)
      || right.relevanceMatches.length - left.relevanceMatches.length
      || getDistanceFromNowMs(left.event, now) - getDistanceFromNowMs(right.event, now)
      || left.event.title.localeCompare(right.event.title)
    ))
    .slice(0, maxCandidates);
}

export function getNextEconomicCalendarLiveCheckDelayMs(events: EconomicCalendarEvent[], now = new Date()) {
  const nextWatchStartMs = events
    .filter((event) => event.impactLevel === "high" || event.impactLevel === "medium")
    .map((event) => new Date(event.eventTimeUtc).getTime() - ECONOMIC_CALENDAR_WATCH_START_MINUTES * 60_000 - now.getTime())
    .filter((delayMs) => Number.isFinite(delayMs) && delayMs > 0)
    .sort((left, right) => left - right)[0];

  if (!nextWatchStartMs) {
    return 60_000;
  }

  return Math.max(15_000, Math.min(60_000, nextWatchStartMs));
}
