import type {
  DashboardImportantEventsResponse,
  EconomicCalendarEventDetailResponse,
  EconomicCalendarListResponse,
  EconomicEventImpact,
} from "@/types";
import { apiFetch } from "@/services/api/client";

export type EconomicCalendarQueryParams = {
  range?: "today" | "week";
  dateFrom?: string;
  dateTo?: string;
  currencies?: string[];
  impacts?: EconomicEventImpact[];
  instrument?: string;
  relevantOnly?: boolean;
  live?: boolean;
};

function buildEconomicCalendarQuery(params: EconomicCalendarQueryParams = {}) {
  const query = new URLSearchParams();

  if (params.range) {
    query.set("range", params.range);
  }

  if (params.dateFrom) {
    query.set("dateFrom", params.dateFrom);
  }

  if (params.dateTo) {
    query.set("dateTo", params.dateTo);
  }

  if (params.currencies && params.currencies.length > 0) {
    query.set("currencies", params.currencies.join(","));
  }

  if (params.impacts && params.impacts.length > 0) {
    query.set("impacts", params.impacts.join(","));
  }

  if (params.instrument) {
    query.set("instrument", params.instrument);
  }

  if (params.relevantOnly) {
    query.set("relevantOnly", "true");
  }

  if (params.live) {
    query.set("live", "true");
  }

  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export function getEconomicCalendarList(params: EconomicCalendarQueryParams = {}) {
  return apiFetch<EconomicCalendarListResponse>(`/economic-calendar/events${buildEconomicCalendarQuery(params)}`);
}

export function getDashboardImportantEvents(params: EconomicCalendarQueryParams = {}) {
  return apiFetch<DashboardImportantEventsResponse>(`/economic-calendar/next-event${buildEconomicCalendarQuery(params)}`);
}

export function getEconomicCalendarEventDetail(eventId: string, params: Pick<EconomicCalendarQueryParams, "instrument" | "live"> = {}) {
  return apiFetch<EconomicCalendarEventDetailResponse>(`/economic-calendar/events/${eventId}${buildEconomicCalendarQuery(params)}`);
}
