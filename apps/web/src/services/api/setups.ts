import type { Pagination, SetupDefinition } from "@/types";
import { apiFetch } from "@/services/api/client";

export type SetupPayload = {
  name: string;
  description: string;
  color?: string;
  isArchived?: boolean;
};

export type SetupListItem = SetupDefinition & {
  tradeCount?: number;
};

export type ListSetupsParams = {
  search?: string;
  status?: "all" | "active" | "archived";
  page?: number;
  pageSize?: number;
  sortBy?: "createdAt" | "name";
  sortOrder?: "asc" | "desc";
};

function buildQuery(params: ListSetupsParams = {}) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    query.set(key, String(value));
  }

  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export function listSetups(params: ListSetupsParams = {}) {
  return apiFetch<{ items: SetupListItem[]; pagination: Pagination }>(`/setups${buildQuery(params)}`);
}

export function createSetup(payload: SetupPayload) {
  return apiFetch<{ setup: SetupDefinition }>("/setups", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateSetup(setupId: string, payload: Partial<SetupPayload>) {
  return apiFetch<{ setup: SetupDefinition }>(`/setups/${setupId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteSetup(setupId: string) {
  return apiFetch<void>(`/setups/${setupId}`, {
    method: "DELETE",
  });
}
