import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { DataBadge } from "@/components/DataBadge";
import { PageErrorState } from "@/components/PageErrorState";
import { SetupWorkspaceSkeleton } from "@/components/skeletons/SetupWorkspaceSkeleton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/sonner";
import { PageHeader, PageShell } from "@/layouts/PageShell";
import { useAuth } from "@/features/auth/auth-context";
import { useUnauthorizedSessionGuard } from "@/features/auth/use-unauthorized-session-guard";
import { SetupBasicInfoStep } from "@/features/setups/components/SetupBasicInfoStep";
import {
  buildChecklistDraftItems,
  SetupPreTradeSection,
  type SetupChecklistDraftItem,
} from "@/features/setups/components/SetupPreTradeSection";
import { SetupReviewStep } from "@/features/setups/components/SetupReviewStep";
import { SetupRulesStep } from "@/features/setups/components/SetupRulesStep";
import {
  SetupWizardStepper,
  type SetupWizardStep,
  type SetupWizardStepId,
} from "@/features/setups/components/SetupWizardStepper";
import {
  buildRuleDrafts,
  buildStrategyForm,
  buildUniqueFormColor,
  resolveDisplayColor,
  readRuleValue,
  toStrategyPayload,
  writeRuleValue,
  type SetupRuleType,
  type SetupStrategyPayload,
  type StrategyFormState,
} from "@/features/setups/components/setup-form-state";
import { ApiError } from "@/services/api/client";
import { createChecklistRule, reorderChecklistRules } from "@/services/api/checklist-rules";
import { createSetup, listSetups, updateSetup } from "@/services/api/setups";
import { SETUP_TEMPLATE_PRESETS } from "@/features/setups/setup-presets";
import { privateQueryKey } from "@/services/query-client";
import { getPageErrorState } from "@/utils/page-errors";
import { withMinimumDelay } from "@/utils/loading";
import { normalizeSetupColor, type SetupDefinition } from "@/types";

type BuilderDraftMetadata = {
  dirty: boolean;
  lastLocalSavedAt: number | null;
  lastServerSavedAt: number | null;
  recoveredFromCache: boolean;
};

type BuilderDraftState = {
  step: SetupWizardStepId;
  form: StrategyFormState;
  checklistItems: SetupChecklistDraftItem[];
  metadata: BuilderDraftMetadata;
};

type StoredBuilderDraft = {
  step: SetupWizardStepId;
  form: StrategyFormState;
  checklistItems: SetupChecklistDraftItem[];
  metadata?: Partial<BuilderDraftMetadata>;
};

const EMPTY_STRATEGY_FORM: StrategyFormState = {
  name: "",
  description: "",
  entryLogic: "",
  confirmationLogic: "",
  invalidationLogic: "",
  notes: "",
  color: "#10B981",
  isArchived: false,
};

function createDraftState(
  overrides: Partial<BuilderDraftState> = {},
  metadataOverrides: Partial<BuilderDraftMetadata> = {},
): BuilderDraftState {
  return {
    step: "basic",
    form: EMPTY_STRATEGY_FORM,
    checklistItems: [],
    metadata: {
      dirty: false,
      lastLocalSavedAt: null,
      lastServerSavedAt: null,
      recoveredFromCache: false,
      ...metadataOverrides,
    },
    ...overrides,
  };
}

function getDraftStorageKey(setupId?: string) {
  return `izledger:setups:builder:${setupId ?? "new"}`;
}

function readBuilderDraft(setupId?: string): StoredBuilderDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawDraft = window.localStorage.getItem(getDraftStorageKey(setupId));

    if (!rawDraft) {
      return null;
    }

    return JSON.parse(rawDraft) as StoredBuilderDraft;
  } catch {
    return null;
  }
}

function toStoredBuilderDraft(draft: BuilderDraftState): StoredBuilderDraft {
  return {
    step: draft.step,
    form: draft.form,
    checklistItems: draft.checklistItems,
    metadata: {
      dirty: draft.metadata.dirty,
      lastLocalSavedAt: draft.metadata.lastLocalSavedAt,
      lastServerSavedAt: draft.metadata.lastServerSavedAt,
    },
  };
}

function buildDraftSignature(form: StrategyFormState, checklistItems: SetupChecklistDraftItem[]) {
  return JSON.stringify({
    strategy: toStrategyPayload(form),
    checklist: checklistItems.map((item) => ({
      title: item.title.trim(),
      description: item.description?.trim() ?? "",
      isRequired: item.isRequired,
      isActive: item.isActive,
      sortOrder: item.sortOrder,
      isLocalOnly: item.isLocalOnly,
    })),
  });
}

const WIZARD_STEPS: SetupWizardStep[] = [
  { id: "basic", label: "Basic Info" },
  { id: "rules", label: "Rules" },
  { id: "checklist", label: "Checklist" },
  { id: "review", label: "Review" },
];

const STEP_DETAILS: Record<SetupWizardStepId, { title: string; subtitle?: string }> = {
  basic: {
    title: "Basic Info",
    subtitle: "Name the setup and keep the core context together.",
  },
  rules: {
    title: "Rules",
    subtitle: "Keep the trigger, confirmation, and invalidation easy to scan.",
  },
  checklist: {
    title: "Checklist",
    subtitle: "Build a compact pre-trade list that is quick to review.",
  },
  review: {
    title: "Review",
    subtitle: "Check the final structure before saving.",
  },
};

export function SetupCreatePage() {
  const navigate = useNavigate();
  const { id: routeSetupId } = useParams<{ id?: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isEditMode = Boolean(routeSetupId);
  const [currentSetup, setCurrentSetup] = useState<SetupDefinition | null>(null);
  const [draft, setDraft] = useState<BuilderDraftState>(() => createDraftState());
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const [persistedSignature, setPersistedSignature] = useState("");
  const [isHydratingDraft, setIsHydratingDraft] = useState(true);
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);
  const [visibleRuleTypes, setVisibleRuleTypes] = useState<SetupRuleType[]>([]);
  const storageKey = getDraftStorageKey(routeSetupId);

  const setupsQuery = useQuery({
    queryKey: privateQueryKey(user.id, "setups", "workspace-options"),
    queryFn: async () => {
      const response = await withMinimumDelay(() => listSetups({
        page: 1,
        pageSize: 100,
        status: "all",
        sortBy: "name",
        sortOrder: "asc",
      }));
      return response.items;
    },
  });

  useUnauthorizedSessionGuard(setupsQuery.error);

  const setups = useMemo(() => setupsQuery.data ?? [], [setupsQuery.data]);

  const invalidateData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: privateQueryKey(user.id, "setups") }),
      queryClient.invalidateQueries({ queryKey: privateQueryKey(user.id, "trades") }),
      queryClient.invalidateQueries({ queryKey: privateQueryKey(user.id, "dashboard-summary") }),
      queryClient.invalidateQueries({ queryKey: privateQueryKey(user.id, "analytics-breakdowns") }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: async ({ setupId, payload }: {
      setupId: string | null;
      payload: SetupStrategyPayload;
    }) => {
      if (setupId) {
        return updateSetup(setupId, payload);
      }

      return createSetup(payload);
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not save the setup right now.";
      toast.error(message);
    },
  });

  useEffect(() => {
    setHydratedKey(null);
    setCurrentSetup(null);
    setIsHydratingDraft(true);
    setHasAttemptedSave(false);
    setVisibleRuleTypes([]);
    setDraft(createDraftState());
    setPersistedSignature("");
  }, [routeSetupId, storageKey]);

  useEffect(() => {
    if (!setupsQuery.data || hydratedKey === storageKey) {
      return;
    }

    const cachedDraft = readBuilderDraft(routeSetupId);

    if (routeSetupId) {
      const matchedSetup = setups.find((setup) => setup.id === routeSetupId);

      if (!matchedSetup) {
        return;
      }

      const baseForm = buildStrategyForm(matchedSetup, setups);
      const baseChecklistItems = buildChecklistDraftItems(matchedSetup.preTradeChecklist ?? []);

      setCurrentSetup(matchedSetup);
      setPersistedSignature(buildDraftSignature(baseForm, baseChecklistItems));
      setDraft(createDraftState({
        step: cachedDraft?.step ?? "basic",
        form: cachedDraft?.form ?? baseForm,
        checklistItems: cachedDraft?.checklistItems ?? baseChecklistItems,
      }, {
        dirty: cachedDraft?.metadata?.dirty ?? false,
        lastLocalSavedAt: cachedDraft?.metadata?.lastLocalSavedAt ?? null,
        lastServerSavedAt: cachedDraft?.metadata?.lastServerSavedAt ?? null,
        recoveredFromCache: Boolean(cachedDraft),
      }));
      setHydratedKey(storageKey);
      setIsHydratingDraft(false);
      return;
    }

    const baseForm = cachedDraft?.form ?? buildStrategyForm(null, setups);

    setDraft(createDraftState({
      step: cachedDraft?.step ?? "basic",
      form: baseForm,
      checklistItems: cachedDraft?.checklistItems ?? [],
    }, {
      dirty: cachedDraft?.metadata?.dirty ?? false,
      lastLocalSavedAt: cachedDraft?.metadata?.lastLocalSavedAt ?? null,
      lastServerSavedAt: cachedDraft?.metadata?.lastServerSavedAt ?? null,
      recoveredFromCache: Boolean(cachedDraft),
    }));
    setHydratedKey(storageKey);
    setIsHydratingDraft(false);
  }, [hydratedKey, routeSetupId, setups, setupsQuery.data, storageKey]);

  const strategyPayload = useMemo(() => toStrategyPayload(draft.form), [draft.form]);
  const strategySignature = useMemo(() => buildDraftSignature(draft.form, draft.checklistItems), [draft.form, draft.checklistItems]);
  const hasMeaningfulContent = Boolean(
    draft.form.name.trim()
      || draft.form.description.trim()
      || draft.form.entryLogic.trim()
      || draft.form.confirmationLogic.trim()
      || draft.form.invalidationLogic.trim()
      || draft.form.notes.trim()
      || draft.checklistItems.some((item) => item.title.trim() || item.description?.trim()),
  );
  const computedDirty = currentSetup ? strategySignature !== persistedSignature : hasMeaningfulContent;
  const isNameValid = Boolean(draft.form.name.trim());
  const validationErrors = hasAttemptedSave && !isNameValid
    ? { name: "Give this setup a name before saving it." }
    : undefined;

  useEffect(() => {
    if (draft.metadata.dirty === computedDirty) {
      return;
    }

    setDraft((current) => ({
      ...current,
      metadata: {
        ...current.metadata,
        dirty: computedDirty,
      },
    }));
  }, [computedDirty, draft.metadata.dirty]);

  const previewColor = resolveDisplayColor(draft.form.color);
  const formColorLabel = normalizeSetupColor(draft.form.color) ?? previewColor;
  const saveStateLabel = saveMutation.isPending
    ? "Saving setup..."
    : draft.metadata.dirty
      ? currentSetup
        ? "Unsaved changes"
        : "Draft not saved"
      : draft.metadata.lastServerSavedAt
        ? "Saved"
        : draft.metadata.lastLocalSavedAt
          ? "Draft autosaved locally"
          : "Draft";

  const localPersistSignature = useMemo(() => JSON.stringify({
    step: draft.step,
    form: draft.form,
    checklistItems: draft.checklistItems,
    dirty: draft.metadata.dirty,
  }), [draft.checklistItems, draft.form, draft.metadata.dirty, draft.step]);

  useEffect(() => {
    const populatedTypes = buildRuleDrafts(draft.form).map((rule) => rule.type);

    setVisibleRuleTypes((current) => {
      const merged = [...current];

      for (const type of populatedTypes) {
        if (!merged.includes(type)) {
          merged.push(type);
        }
      }

      return merged;
    });
  }, [draft.form]);

  useEffect(() => {
    if (hydratedKey !== storageKey || isHydratingDraft) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (!hasMeaningfulContent && !currentSetup) {
        window.localStorage.removeItem(storageKey);
        setDraft((current) => (
          current.metadata.lastLocalSavedAt === null
            ? current
            : {
                ...current,
                metadata: {
                  ...current.metadata,
                  lastLocalSavedAt: null,
                },
              }
        ));
        return;
      }

      const savedAt = Date.now();
      window.localStorage.setItem(storageKey, JSON.stringify(toStoredBuilderDraft({
        ...draft,
        metadata: {
          ...draft.metadata,
          lastLocalSavedAt: savedAt,
        },
      })));
      setDraft((current) => ({
        ...current,
        metadata: {
          ...current.metadata,
          lastLocalSavedAt: savedAt,
        },
      }));
    }, 600);

    return () => window.clearTimeout(timeoutId);
  }, [currentSetup, draft, hasMeaningfulContent, hydratedKey, isHydratingDraft, localPersistSignature, storageKey]);

  const persistDraftChecklistItems = async (setupId: string) => {
    const draftOnlyItems = draft.checklistItems.filter((item) => item.isLocalOnly && item.title.trim());

    if (draftOnlyItems.length === 0) {
      return draft.checklistItems;
    }

    const createdRules = await Promise.all(
      draftOnlyItems.map((item) => createChecklistRule({
        title: item.title.trim(),
        description: item.description?.trim() ? item.description.trim() : null,
        isRequired: item.isRequired,
        isActive: item.isActive,
        setupId,
        accountId: null,
      })),
    );

    const createdByLocalId = new Map(
      draftOnlyItems.map((item, index) => [item.id, createdRules[index].rule] as const),
    );

    const reconciledItems = draft.checklistItems.map((item) => {
      const createdRule = createdByLocalId.get(item.id);

      if (!createdRule) {
        return item;
      }

      return {
        id: createdRule.id,
        title: createdRule.title,
        description: createdRule.description,
        isRequired: createdRule.isRequired,
        isActive: createdRule.isActive,
        sortOrder: item.sortOrder,
        isLocalOnly: false,
        setupId: createdRule.setupId,
        accountId: createdRule.accountId,
      } satisfies SetupChecklistDraftItem;
    });

    setDraft((current) => ({
      ...current,
      checklistItems: reconciledItems,
    }));
    await reorderChecklistRules(reconciledItems.filter((item) => !item.isLocalOnly).map((item) => item.id));
    return reconciledItems;
  };

  const persistBuilder = async ({ intent }: { intent: "save" | "save-and-trade" | "autosave" }) => {
    if (!isNameValid) {
      if (intent !== "autosave") {
        setHasAttemptedSave(true);
        setDraft((current) => ({ ...current, step: "basic" }));
      }
      return null;
    }

    const response = await saveMutation.mutateAsync({
      setupId: currentSetup?.id ?? null,
      payload: strategyPayload,
    });
    const savedSetup = response.setup;
    const nextSetups = currentSetup
      ? setups.map((setup) => (setup.id === savedSetup.id ? savedSetup : setup))
      : [...setups, savedSetup];
    const previousStorageKey = storageKey;
    const nextStorageKey = getDraftStorageKey(savedSetup.id);
    const reconciledChecklistItems = await persistDraftChecklistItems(savedSetup.id);
    const nextForm = buildStrategyForm(savedSetup, nextSetups);
    const savedAt = Date.now();
    const nextDraft = createDraftState({
      step: draft.step,
      form: nextForm,
      checklistItems: reconciledChecklistItems,
    }, {
      dirty: false,
      lastLocalSavedAt: savedAt,
      lastServerSavedAt: savedAt,
      recoveredFromCache: false,
    });

    setCurrentSetup(savedSetup);
    setDraft(nextDraft);
    setPersistedSignature(buildDraftSignature(nextForm, reconciledChecklistItems));
    setHasAttemptedSave(false);
    await invalidateData();
    window.localStorage.removeItem(previousStorageKey);
    window.localStorage.setItem(nextStorageKey, JSON.stringify(toStoredBuilderDraft(nextDraft)));

    if (!currentSetup && intent === "save") {
      navigate(`/setups/${savedSetup.id}/edit`, { replace: true });
      toast.success("Setup created.");
      return savedSetup;
    }

    if (intent === "save") {
      toast.success("Setup updated.");
    }

    return savedSetup;
  };

  useEffect(() => {
    if (!currentSetup?.id || isHydratingDraft || saveMutation.isPending || !draft.metadata.dirty || !isNameValid) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void persistBuilder({ intent: "autosave" });
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [currentSetup?.id, draft.metadata.dirty, isHydratingDraft, isNameValid, saveMutation.isPending, strategySignature]);

  const handleSaveStrategy = () => persistBuilder({ intent: "save" });

  const handleApplyTemplate = (templateId: string) => {
    const template = SETUP_TEMPLATE_PRESETS.find((item) => item.id === templateId);

    if (!template) {
      return;
    }

    setDraft((current) => ({
      ...current,
      form: { ...template.form },
      checklistItems: template.checklistItems.map((item, index) => ({
        ...item,
        id: `template-${template.id}-${index}-${crypto.randomUUID()}`,
        sortOrder: index,
      })),
    }));
    toast.success(`${template.label} template applied.`);
  };

  const handleClearDraft = () => {
    window.localStorage.removeItem(storageKey);

    if (currentSetup) {
      const baseForm = buildStrategyForm(currentSetup, setups);
      const baseChecklistItems = buildChecklistDraftItems(currentSetup.preTradeChecklist ?? []);

      setDraft(createDraftState({
        step: "basic",
        form: baseForm,
        checklistItems: baseChecklistItems,
      }, {
        dirty: false,
        lastLocalSavedAt: null,
        lastServerSavedAt: draft.metadata.lastServerSavedAt,
        recoveredFromCache: false,
      }));
      setPersistedSignature(buildDraftSignature(baseForm, baseChecklistItems));
      setHasAttemptedSave(false);
      toast.success("Draft cleared.");
      return;
    }

    setDraft(createDraftState({
      step: "basic",
      form: buildStrategyForm(null, setups),
      checklistItems: [],
    }));
    setPersistedSignature("");
    setHasAttemptedSave(false);
    toast.success("Draft cleared.");
  };

  const rules = useMemo(() => visibleRuleTypes.map((type) => ({
    type,
    value: readRuleValue(draft.form, type),
  })), [draft.form, visibleRuleTypes]);
  const availableRuleTypes = useMemo(
    () => (["entry", "confirmation", "invalidation"] as const).filter((type) => !visibleRuleTypes.includes(type)),
    [visibleRuleTypes],
  );
  const activeStepIndex = WIZARD_STEPS.findIndex((step) => step.id === draft.step);
  const isFinalStep = draft.step === "review";
  const canContinueFromCurrentStep = (
    draft.step === "basic"
      ? isNameValid
      : true
  );
  const currentStepDetails = STEP_DETAILS[draft.step];

  const handleAddRule = () => {
    const nextType = availableRuleTypes[0];

    if (!nextType) {
      return;
    }

    setDraft((current) => ({
      ...current,
      form: writeRuleValue(current.form, nextType, readRuleValue(current.form, nextType) || ""),
    }));
    setVisibleRuleTypes((current) => [...current, nextType]);
  };

  const handleRuleChange = (type: SetupRuleType, value: string) => {
    setDraft((current) => ({
      ...current,
      form: writeRuleValue(current.form, type, value),
    }));
  };

  const handleRuleTypeChange = (currentType: SetupRuleType, nextType: SetupRuleType) => {
    if (currentType === nextType) {
      return;
    }

    setDraft((current) => {
      const currentValue = readRuleValue(current.form, currentType);
      const nextValue = readRuleValue(current.form, nextType);
      let nextForm = writeRuleValue(current.form, currentType, nextValue);
      nextForm = writeRuleValue(nextForm, nextType, currentValue);
      return {
        ...current,
        form: nextForm,
      };
    });
    setVisibleRuleTypes((current) => current.map((type) => (type === currentType ? nextType : type)));
  };

  const handleRemoveRule = (type: SetupRuleType) => {
    setDraft((current) => ({
      ...current,
      form: writeRuleValue(current.form, type, ""),
    }));
    setVisibleRuleTypes((current) => current.filter((item) => item !== type));
  };

  const handleNextStep = () => {
    if (draft.step === "basic" && !isNameValid) {
      setHasAttemptedSave(true);
      return;
    }

    const nextStep = WIZARD_STEPS[activeStepIndex + 1];

    if (!nextStep) {
      return;
    }

    setDraft((current) => ({ ...current, step: nextStep.id }));
  };

  const handlePreviousStep = () => {
    const previousStep = WIZARD_STEPS[activeStepIndex - 1];

    if (!previousStep) {
      return;
    }

    setDraft((current) => ({ ...current, step: previousStep.id }));
  };

  if (setupsQuery.isLoading && !setupsQuery.data) {
    return <SetupWorkspaceSkeleton />;
  }

  if (setupsQuery.isError) {
    const errorState = getPageErrorState(setupsQuery.error, {
      unavailableTitle: "Setup workspace unavailable",
      unavailableDescription: "The setup builder is temporarily unavailable. Please try again in a moment.",
      unauthorizedDescription: "Your session expired or could not be verified. Redirecting to login.",
      validationTitle: "Setup request invalid",
      validationDescription: "The setup workspace request is invalid.",
      timeoutTitle: "Setup workspace timed out",
      timeoutDescription: "Loading the setup builder took too long. Please try again.",
    });

    return (
      <PageErrorState
        title={errorState.title}
        description={errorState.description}
        layout="page"
        size="wide"
        onRetry={errorState.allowRetry ? () => void setupsQuery.refetch() : undefined}
        isRetrying={setupsQuery.isFetching}
      />
    );
  }

  if (isEditMode && setupsQuery.data && !currentSetup && !isHydratingDraft) {
    return (
      <PageErrorState
        title="Setup not found"
        description="This setup could not be found or is no longer available."
        layout="page"
        size="wide"
        onRetry={() => void setupsQuery.refetch()}
        isRetrying={setupsQuery.isFetching}
      />
    );
  }

  return (
    <PageShell size="wide">
      <PageHeader
        eyebrow={currentSetup ? "Edit Setup" : "New Setup"}
        title={currentSetup ? currentSetup.name : "Create a Setup"}
        actions={(
          <>
            <Button variant="ghost" onClick={() => navigate("/setups")}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              variant="ghost"
              onClick={handleClearDraft}
              disabled={saveMutation.isPending}
            >
              Clear Draft
            </Button>
          </>
        )}
      />

      <section className="rounded-[30px] border border-border/60 bg-[hsl(var(--muted)/0.22)] px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <DataBadge tone={draft.form.isArchived ? "warning" : "primary"}>
            {draft.form.isArchived ? "Archived" : "Active"}
          </DataBadge>
          <DataBadge tone="neutral">{saveStateLabel}</DataBadge>
          {draft.metadata.recoveredFromCache ? (
            <DataBadge tone="neutral">Recovered draft</DataBadge>
          ) : null}
        </div>
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">{draft.form.name.trim() || "Untitled setup"}</p>
            {draft.form.description.trim() ? (
              <p className="mt-1 text-sm text-muted-foreground">{draft.form.description.trim()}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="h-10 w-10 rounded-2xl border border-black/5 shadow-sm ring-1 ring-black/5"
              style={{ backgroundColor: previewColor }}
            />
            <button
              type="button"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setDraft((current) => ({
                ...current,
                form: {
                  ...current.form,
                  color: buildUniqueFormColor(setups, currentSetup?.id),
                },
              }))}
            >
              {formColorLabel}
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-6">
        <SetupWizardStepper
          steps={WIZARD_STEPS}
          activeStep={draft.step}
          onStepChange={(nextStep) => setDraft((current) => ({ ...current, step: nextStep }))}
        />

        <section className="page-enter min-w-0 overflow-hidden rounded-[32px] border border-border/60 bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.14))]">
          <div className="border-b border-border/50 px-5 py-5 sm:px-6">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {currentStepDetails.title}
            </p>
            {currentStepDetails.subtitle ? (
              <p className="mt-1 text-sm text-muted-foreground">{currentStepDetails.subtitle}</p>
            ) : null}
          </div>

          <div className="px-5 py-5 sm:px-6 sm:py-6">
            {draft.step === "basic" ? (
              <SetupBasicInfoStep
                form={draft.form}
                validationErrors={validationErrors}
                onFormChange={(updater) => {
                  setDraft((current) => ({
                    ...current,
                    form: updater(current.form),
                  }));
                }}
                onApplyTemplate={handleApplyTemplate}
              />
            ) : null}

            {draft.step === "rules" ? (
              <SetupRulesStep
                rules={rules}
                availableRuleTypes={availableRuleTypes}
                onAddRule={handleAddRule}
                onRuleChange={handleRuleChange}
                onRuleTypeChange={handleRuleTypeChange}
                onRemoveRule={handleRemoveRule}
              />
            ) : null}

            {draft.step === "checklist" ? (
              <SetupPreTradeSection
                setupId={currentSetup?.id ?? null}
                items={draft.checklistItems}
                onItemsChange={(updater) => {
                  setDraft((current) => ({
                    ...current,
                    checklistItems: updater(current.checklistItems),
                  }));
                }}
              />
            ) : null}

            {draft.step === "review" ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="h-10 w-10 rounded-2xl border border-black/5 shadow-sm ring-1 ring-black/5"
                      style={{ backgroundColor: previewColor }}
                    />
                    <p className="text-sm font-medium text-foreground">{formColorLabel}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-foreground">Archived</span>
                    <Switch
                      checked={draft.form.isArchived}
                      onCheckedChange={(checked) => setDraft((current) => ({
                        ...current,
                        form: { ...current.form, isArchived: checked },
                      }))}
                    />
                  </div>
                </div>
                <SetupReviewStep form={draft.form} checklistItems={draft.checklistItems} />
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-4 border-t border-border/50 bg-background/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="text-sm text-muted-foreground">{saveStateLabel}</div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="ghost" onClick={handlePreviousStep} disabled={activeStepIndex === 0 || saveMutation.isPending}>
                Back
              </Button>
              {isFinalStep ? (
                <>
                  <Button variant="outline" onClick={() => void handleSaveStrategy()} disabled={!isNameValid || saveMutation.isPending}>
                    {saveMutation.isPending ? "Saving..." : "Save Draft"}
                  </Button>
                  <Button onClick={() => void handleSaveStrategy()} disabled={!isNameValid || saveMutation.isPending}>
                    {saveMutation.isPending ? "Saving..." : currentSetup ? "Update Setup" : "Save Setup"}
                  </Button>
                </>
              ) : (
                <Button onClick={handleNextStep} disabled={!canContinueFromCurrentStep || saveMutation.isPending}>
                  Next
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
