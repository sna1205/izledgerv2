import { SetupDefinition } from "./types";

const STORAGE_KEY = "trading-journal-setups";

export function getSetups(): SetupDefinition[] {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as SetupDefinition[];
  } catch {
    return [];
  }
}

export function saveSetups(setups: SetupDefinition[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(setups));
}

export function addSetup(setup: Omit<SetupDefinition, "id" | "createdAt">): SetupDefinition {
  const next: SetupDefinition = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...setup,
  };

  saveSetups([...getSetups(), next]);
  return next;
}

export function updateSetup(updated: SetupDefinition): void {
  saveSetups(getSetups().map((setup) => (setup.id === updated.id ? updated : setup)));
}

export function deleteSetup(id: string): void {
  saveSetups(getSetups().filter((setup) => setup.id !== id));
}
