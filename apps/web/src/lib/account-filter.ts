import { useCallback, useEffect, useState } from "react";
import type { Account, Trade } from "@/lib/types";

const STORAGE_KEY = "izledger-active-account-filter";
const EVENT_NAME = "izledger-active-account-filter-change";

export type AccountFilterValue = "all" | string;

function normalizeAccountFilter(value: string | null): AccountFilterValue {
  return !value || value === "all" ? "all" : value;
}

export function getStoredAccountFilter(): AccountFilterValue {
  return normalizeAccountFilter(localStorage.getItem(STORAGE_KEY));
}

export function resolveAccountFilter(value: AccountFilterValue, accounts: Account[]): AccountFilterValue {
  if (value === "all") {
    return value;
  }

  return accounts.some((account) => account.id === value) ? value : "all";
}

export function setStoredAccountFilter(value: AccountFilterValue): void {
  const normalizedValue = normalizeAccountFilter(value);

  localStorage.setItem(STORAGE_KEY, normalizedValue);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: normalizedValue }));
}

export function filterTradesByAccount(trades: Trade[], accountFilter: AccountFilterValue): Trade[] {
  if (accountFilter === "all") {
    return trades;
  }

  return trades.filter((trade) => trade.accountId === accountFilter);
}

export function useAccountFilter() {
  const [accountFilter, setAccountFilterState] = useState<AccountFilterValue>(() => getStoredAccountFilter());

  useEffect(() => {
    const syncFilter = () => {
      setAccountFilterState(getStoredAccountFilter());
    };

    window.addEventListener("storage", syncFilter);
    window.addEventListener(EVENT_NAME, syncFilter as EventListener);

    return () => {
      window.removeEventListener("storage", syncFilter);
      window.removeEventListener(EVENT_NAME, syncFilter as EventListener);
    };
  }, []);

  const setAccountFilter = useCallback((value: AccountFilterValue) => {
    setStoredAccountFilter(value);
    setAccountFilterState(getStoredAccountFilter());
  }, []);

  return [accountFilter, setAccountFilter] as const;
}
