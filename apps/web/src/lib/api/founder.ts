import { apiFetch } from "@/lib/api/client";
import type { FounderHealthResponse, FounderRecentResponse, FounderStatsResponse } from "@/lib/types";

export function getFounderStats() {
  return apiFetch<FounderStatsResponse>("/founder/stats");
}

export function getFounderRecent() {
  return apiFetch<FounderRecentResponse>("/founder/recent");
}

export function getFounderHealth() {
  return apiFetch<FounderHealthResponse>("/founder/health");
}
