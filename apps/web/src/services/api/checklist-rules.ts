import type { Account, ChecklistRule, Pagination, SetupDefinition } from "@/types";
import { apiFetch } from "@/services/api/client";

export type ChecklistRulePayload = {
  title: string;
  description?: string | null;
  isRequired: boolean;
  isActive: boolean;
  setupId?: string | null;
  accountId?: string | null;
};

export type ChecklistRulesResponse = {
  items: ChecklistRule[];
  pagination?: Pagination;
};

export function listChecklistRules(params: {
  activeOnly?: boolean;
  setupId?: SetupDefinition["id"] | null;
  accountId?: Account["id"] | null;
  scopeMode?: "applicable" | "exact";
} = {}) {
  const query = new URLSearchParams();

  if (params.activeOnly !== undefined) {
    query.set("activeOnly", String(params.activeOnly));
  }

  if (params.setupId) {
    query.set("setupId", params.setupId);
  }

  if (params.accountId) {
    query.set("accountId", params.accountId);
  }

  if (params.scopeMode) {
    query.set("scopeMode", params.scopeMode);
  }

  const serialized = query.toString();

  return apiFetch<ChecklistRulesResponse>(`/checklist-rules${serialized ? `?${serialized}` : ""}`);
}

export function createChecklistRule(payload: ChecklistRulePayload) {
  return apiFetch<{ rule: ChecklistRule }>("/checklist-rules", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateChecklistRule(ruleId: string, payload: ChecklistRulePayload) {
  return apiFetch<{ rule: ChecklistRule }>(`/checklist-rules/${ruleId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteChecklistRule(ruleId: string) {
  return apiFetch<void>(`/checklist-rules/${ruleId}`, {
    method: "DELETE",
  });
}

export function toggleChecklistRuleActive(ruleId: string, isActive: boolean) {
  return apiFetch<{ rule: ChecklistRule }>(`/checklist-rules/${ruleId}/toggle-active`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

export function reorderChecklistRules(ruleIds: string[]) {
  return apiFetch<ChecklistRulesResponse>("/checklist-rules/reorder", {
    method: "PATCH",
    body: JSON.stringify({ ruleIds }),
  });
}
