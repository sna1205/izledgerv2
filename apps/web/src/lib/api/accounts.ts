import type { Account } from "@/lib/types";
import { apiFetch } from "@/lib/api/client";

export type AccountPayload = {
  name: string;
  broker: string;
  type: Account["type"];
  balance: number;
  currency: string;
  isDefault?: boolean;
  isArchived?: boolean;
};

export type ListAccountsParams = {
  status?: "all" | "active" | "archived";
};

export function listAccounts(params?: ListAccountsParams) {
  const searchParams = new URLSearchParams();

  if (params?.status) {
    searchParams.set("status", params.status);
  }

  const suffix = searchParams.size > 0 ? `?${searchParams.toString()}` : "";

  return apiFetch<{ items: Account[] }>(`/accounts${suffix}`);
}

export function createAccount(payload: AccountPayload) {
  return apiFetch<{ account: Account }>("/accounts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAccount(accountId: string, payload: Partial<AccountPayload>) {
  return apiFetch<{ account: Account }>(`/accounts/${accountId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteAccount(accountId: string) {
  return apiFetch<void>(`/accounts/${accountId}`, {
    method: "DELETE",
  });
}
