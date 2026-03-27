import { generateUniqueSetupColor, normalizeSetupColor, type SetupDefinition } from "@/types";

export type StrategyFormState = {
  name: string;
  description: string;
  entryLogic: string;
  confirmationLogic: string;
  invalidationLogic: string;
  notes: string;
  color: string;
  isArchived: boolean;
};

export type SetupStrategyPayload = {
  name: string;
  description: string;
  entryLogic: string | null;
  confirmationLogic: string | null;
  invalidationLogic: string | null;
  notes: string | null;
  color: string;
  isArchived: boolean;
};

const FALLBACK_SETUP_COLOR = "#10B981";

export function buildUniqueFormColor(setups: SetupDefinition[], excludeSetupId?: string) {
  return generateUniqueSetupColor(
    setups
      .filter((setup) => setup.id !== excludeSetupId)
      .map((setup) => setup.color),
  );
}

export function resolveDisplayColor(color: string | null | undefined) {
  return normalizeSetupColor(color) ?? FALLBACK_SETUP_COLOR;
}

export function buildStrategyForm(setup: SetupDefinition | null, setups: SetupDefinition[]) {
  return {
    name: setup?.name ?? "",
    description: setup?.description ?? "",
    entryLogic: setup?.entryLogic ?? "",
    confirmationLogic: setup?.confirmationLogic ?? "",
    invalidationLogic: setup?.invalidationLogic ?? "",
    notes: setup?.notes ?? "",
    color: setup ? resolveDisplayColor(setup.color) : buildUniqueFormColor(setups),
    isArchived: setup?.isArchived ?? false,
  } satisfies StrategyFormState;
}

export function toStrategyPayload(form: StrategyFormState): SetupStrategyPayload {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    entryLogic: form.entryLogic.trim() || null,
    confirmationLogic: form.confirmationLogic.trim() || null,
    invalidationLogic: form.invalidationLogic.trim() || null,
    notes: form.notes.trim() || null,
    color: resolveDisplayColor(form.color),
    isArchived: form.isArchived,
  };
}
