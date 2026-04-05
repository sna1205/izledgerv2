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

export type SetupRuleType = "entry" | "confirmation" | "invalidation";

export type SetupRuleDraft = {
  type: SetupRuleType;
  value: string;
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

export function buildRuleDrafts(form: StrategyFormState): SetupRuleDraft[] {
  return [
    form.entryLogic.trim() ? { type: "entry", value: form.entryLogic } : null,
    form.confirmationLogic.trim() ? { type: "confirmation", value: form.confirmationLogic } : null,
    form.invalidationLogic.trim() ? { type: "invalidation", value: form.invalidationLogic } : null,
  ].filter((item): item is SetupRuleDraft => Boolean(item));
}

export function getUnusedRuleTypes(form: StrategyFormState) {
  const usedTypes = new Set(buildRuleDrafts(form).map((rule) => rule.type));

  return (["entry", "confirmation", "invalidation"] as const).filter((type) => !usedTypes.has(type));
}

export function readRuleValue(form: StrategyFormState, type: SetupRuleType) {
  switch (type) {
    case "entry":
      return form.entryLogic;
    case "confirmation":
      return form.confirmationLogic;
    case "invalidation":
      return form.invalidationLogic;
  }
}

export function writeRuleValue(
  form: StrategyFormState,
  type: SetupRuleType,
  value: string,
): StrategyFormState {
  switch (type) {
    case "entry":
      return { ...form, entryLogic: value };
    case "confirmation":
      return { ...form, confirmationLogic: value };
    case "invalidation":
      return { ...form, invalidationLogic: value };
  }
}
