import { apiFetch } from "@/services/api/client";
import type {
  AnalyticsBreakdownsResponse,
  AnalyticsCalendarResponse,
  DashboardSummaryResponse,
} from "@/types";

function buildAccountQuery(accountId?: string) {
  if (!accountId) {
    return "";
  }

  return `?accountId=${encodeURIComponent(accountId)}`;
}

export function getDashboardSummary(accountId?: string) {
  return apiFetch<DashboardSummaryResponse>(`/dashboard/summary${buildAccountQuery(accountId)}`);
}

export function getAnalyticsBreakdowns(accountId?: string) {
  return apiFetch<AnalyticsBreakdownsResponse>(`/analytics/breakdowns${buildAccountQuery(accountId)}`);
}

export function getAnalyticsCalendar(month: string, accountId?: string) {
  const query = new URLSearchParams({ month });

  if (accountId) {
    query.set("accountId", accountId);
  }

  return apiFetch<AnalyticsCalendarResponse>(`/analytics/calendar?${query.toString()}`);
}
