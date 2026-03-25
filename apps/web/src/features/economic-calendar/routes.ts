import type { EconomicCalendarEvent } from "@/types";

export type EconomicCalendarEventRouteState = {
  event?: EconomicCalendarEvent;
};

export function buildEconomicCalendarEventPath(eventId: string, search = "") {
  return `/economic-calendar/${eventId}${search}`;
}

export function buildEconomicCalendarEventState(event: EconomicCalendarEvent): EconomicCalendarEventRouteState {
  return {
    event,
  };
}
