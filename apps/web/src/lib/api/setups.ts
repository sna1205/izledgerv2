import type { SetupDefinition } from "@/lib/types";
import { apiFetch } from "@/lib/api/client";

export type SetupPayload = {
  name: string;
  description: string;
  color: string;
  isArchived?: boolean;
};

export function listSetups() {
  return apiFetch<{ items: SetupDefinition[] }>("/setups");
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
