import { Account } from "./types";

const STORAGE_KEY = "trading-journal-accounts";

const DEFAULT_ACCOUNT: Omit<Account, "id" | "createdAt"> = {
  name: "Main Account",
  broker: "Manual",
  type: "Personal",
  balance: 0,
  currency: "USD",
};

function createDefaultAccount(): Account {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...DEFAULT_ACCOUNT,
  };
}

function normalizeAccounts(accounts: Account[]): Account[] {
  if (accounts.length > 0) {
    return accounts.map((account) => ({
      ...account,
      type: account.type || "Personal",
    }));
  }

  const fallback = createDefaultAccount();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([fallback]));
  return [fallback];
}

export function getAccounts(): Account[] {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return normalizeAccounts([]);
  }

  try {
    return normalizeAccounts(JSON.parse(raw) as Account[]);
  } catch {
    return normalizeAccounts([]);
  }
}

export function saveAccounts(accounts: Account[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export function addAccount(account: Omit<Account, "id" | "createdAt">): Account {
  const next: Account = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...account,
  };

  saveAccounts([...getAccounts(), next]);
  return next;
}

export function updateAccount(updated: Account): void {
  saveAccounts(
    getAccounts().map((account) =>
      account.id === updated.id
        ? {
            ...updated,
            type: updated.type || "Personal",
          }
        : account,
    ),
  );
}

export function getAccountById(id: string): Account | undefined {
  return getAccounts().find((account) => account.id === id);
}

export function getDefaultAccount(): Account {
  return getAccounts()[0];
}

export function getDefaultAccountId(): string {
  return getDefaultAccount().id;
}
