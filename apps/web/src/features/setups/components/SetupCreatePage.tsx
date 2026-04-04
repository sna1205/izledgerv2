import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { DataBadge } from "@/components/DataBadge";
import { PageErrorState } from "@/components/PageErrorState";
import { SetupWorkspaceSkeleton } from "@/components/skeletons/SetupWorkspaceSkeleton";
import { Button } from "@/components/ui/button";
import { FloatingActionPanel } from "@/components/ui/floating-action-panel";
import { toast } from "@/components/ui/sonner";
import { PageHeader, PageShell } from "@/layouts/PageShell";
import { useAuth } from "@/features/auth/auth-context";
import { useUnauthorizedSessionGuard } from "@/features/auth/use-unauthorized-session-guard";
import { SetupBuilderChecklistStep } from "@/features/setups/components/SetupBuilderChecklistStep";
import {
  buildChecklistDraftItems,
  type SetupChecklistDraftItem,
} from "@/features/setups/components/SetupPreTradeSection";
import { SetupReviewStep } from "@/features/setups/components/SetupReviewStep";
import { SetupBuilderSidebar, type SetupBuilderStepId } from "@/features/setups/components/SetupBuilderSidebar";
import { SetupBuilderStrategyStep } from "@/features/setups/components/SetupBuilderStrategyStep";
import { SetupBuilderSummaryRail } from "@/features/setups/components/SetupBuilderSummaryRail";
import {
  buildStrategyForm,
  buildUniqueFormColor,
  resolveDisplayColor,
  toStrategyPayload,
  type SetupStrategyPayload,
  type StrategyFormState,
} from "@/features/setups/components/setup-form-state";
import { ApiError } from "@/services/api/client";
import { createChecklistRule, reorderChecklistRules } from "@/services/api/checklist-rules";
import { createSetup, listSetups, updateSetup } from "@/services/api/setups";
import { buildDuplicateSetupName, sanitizeChecklistItemsForDuplication } from "@/features/setups/setup-duplication";
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
  step: SetupBuilderStepId;
  form: StrategyFormState;
  checklistItems: SetupChecklistDraftItem[];
  metadata: BuilderDraftMetadata;
};

type StoredBuilderDraft = {
  step: SetupBuilderStepId;
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
    step: "strategy",
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

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const duplicateName = buildDuplicateSetupName(draft.form.name, setups.map((setup) => setup.name));
      const duplicatedSetup = await createSetup({
        ...strategyPayload,
        name: duplicateName,
        isArchived: false,
      });
      const duplicatedChecklistItems = sanitizeChecklistItemsForDuplication(draft.checklistItems);

      if (duplicatedChecklistItems.length > 0) {
        const createdRules = await Promise.all(
          duplicatedChecklistItems.map((item) => createChecklistRule({
            title: item.title,
            description: item.description,
            isRequired: item.isRequired,
            isActive: item.isActive,
            setupId: duplicatedSetup.setup.id,
            accountId: null,
          })),
        );

        await reorderChecklistRules(createdRules.map((result) => result.rule.id));
      }

      return duplicatedSetup.setup;
    },
    onSuccess: async (setup) => {
      await invalidateData();
      toast.success("Setup duplicated.");
      navigate(`/setups/${setup.id}`);
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not duplicate the setup right now.";
      toast.error(message);
    },
  });

  useEffect(() => {
    setHydratedKey(null);
    setCurrentSetup(null);
    setIsHydratingDraft(true);
    setHasAttemptedSave(false);
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
        step: cachedDraft?.step ?? "strategy",
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
      step: cachedDraft?.step ?? "strategy",
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
  const checklistCount = draft.checklistItems.length;
  const activeChecklistCount = draft.checklistItems.filter((rule) => rule.isActive).length;
  const requiredChecklistCount = draft.checklistItems.filter((rule) => rule.isRequired).length;
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
        setDraft((current) => ({ ...current, step: "strategy" }));
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
      step: !currentSetup && intent === "save" ? "pre-trade" : draft.step,
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
      navigate(`/setups/${savedSetup.id}`, { replace: true });
      toast.success("Strategy saved. You can add setup-specific pre-trade items now.");
      return savedSetup;
    }

    if (intent === "save") {
      toast.success("Strategy updated.");
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

  const handleSaveAndCreateTrade = async () => {
    const savedSetup = await persistBuilder({ intent: "save-and-trade" });
    const targetSetupId = savedSetup?.id ?? currentSetup?.id ?? routeSetupId ?? null;

    if (!targetSetupId) {
      return;
    }

    navigate("/trades/new", {
      state: { prefillSetupId: targetSetupId },
    });
  };

  const handleUseInTrade = () => {
    const targetSetupId = currentSetup?.id ?? routeSetupId ?? null;

    if (!targetSetupId) {
      return;
    }

    navigate("/trades/new", {
      state: { prefillSetupId: targetSetupId },
    });
  };

  const handleDuplicateSetup = () => {
    if (!draft.form.name.trim()) {
      setHasAttemptedSave(true);
      setDraft((current) => ({ ...current, step: "strategy" }));
      return;
    }

    duplicateMutation.mutate();
  };

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
        step: "strategy",
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
      step: "strategy",
      form: buildStrategyForm(null, setups),
      checklistItems: [],
    }));
    setPersistedSignature("");
    setHasAttemptedSave(false);
    toast.success("Draft cleared.");
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
        title={currentSetup ? currentSetup.name : "New Setup"}
        actions={(
          <>
            <Button variant="ghost" onClick={() => navigate("/setups")}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              variant="ghost"
              onClick={handleClearDraft}
              disabled={saveMutation.isPending || duplicateMutation.isPending}
            >
              Clear Draft
            </Button>
          </>
        )}
      />

      <div className="rounded-[28px] border border-border bg-card/70 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <DataBadge tone={draft.form.isArchived ? "warning" : "primary"}>
            {draft.form.isArchived ? "Archived" : "Active"}
          </DataBadge>
          <DataBadge tone="neutral">{currentSetup ? "Saved setup" : "Draft setup"}</DataBadge>
          <DataBadge tone="neutral">{saveStateLabel}</DataBadge>
          {draft.metadata.recoveredFromCache ? (
            <DataBadge tone="neutral">Recovered draft</DataBadge>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)_340px] lg:items-start">
        <SetupBuilderSidebar
          activeStep={draft.step}
          onStepChange={(nextStep) => setDraft((current) => ({ ...current, step: nextStep }))}
          saveStateLabel={saveStateLabel}
        />

        <div className="min-w-0 space-y-5">
          {draft.step === "strategy" ? (
            <SetupBuilderStrategyStep
              form={draft.form}
              validationErrors={validationErrors}
              onFormChange={(updater) => {
                setDraft((current) => ({
                  ...current,
                  form: updater(current.form),
                }));
              }}
              previewColor={previewColor}
              formColorLabel={formColorLabel}
              onRegenerateColor={() => setDraft((current) => ({
                ...current,
                form: {
                  ...current.form,
                  color: buildUniqueFormColor(setups, currentSetup?.id),
                },
              }))}
              onApplyTemplate={handleApplyTemplate}
            />
          ) : null}

          {draft.step === "pre-trade" ? (
            <SetupBuilderChecklistStep
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
            <SetupReviewStep
              form={draft.form}
              checklistItems={draft.checklistItems}
              canUseInTrade={Boolean(currentSetup?.id)}
              onUseInTrade={handleUseInTrade}
            />
          ) : null}
        </div>

        <SetupBuilderSummaryRail
          name={draft.form.name}
          description={draft.form.description}
          entryLogic={draft.form.entryLogic}
          confirmationLogic={draft.form.confirmationLogic}
          invalidationLogic={draft.form.invalidationLogic}
          notes={draft.form.notes}
          previewColor={previewColor}
          formColorLabel={formColorLabel}
          isArchived={draft.form.isArchived}
          checklistCount={checklistCount}
          activeChecklistCount={activeChecklistCount}
          requiredChecklistCount={requiredChecklistCount}
          saveStateLabel={saveStateLabel}
          isSaving={saveMutation.isPending || duplicateMutation.isPending}
          isDisabled={false}
          showSavedActions={Boolean(currentSetup?.id)}
          primaryButtonLabel={currentSetup ? "Save Setup" : "Create Setup"}
          secondaryButtonLabel="Save & Create Trade"
          onSave={() => void handleSaveStrategy()}
          onSaveAndCreateTrade={() => void handleSaveAndCreateTrade()}
          onDuplicate={handleDuplicateSetup}
          onUseInTrade={handleUseInTrade}
          onColorChange={(value) => setDraft((current) => ({
            ...current,
            form: { ...current.form, color: value },
          }))}
          onRegenerateColor={() => setDraft((current) => ({
            ...current,
            form: {
              ...current.form,
              color: buildUniqueFormColor(setups, currentSetup?.id),
            },
          }))}
          onStatusChange={(nextArchived) => setDraft((current) => ({
            ...current,
            form: { ...current.form, isArchived: nextArchived },
          }))}
        />
      </div>

      <div className="fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] lg:hidden">
        <FloatingActionPanel className="ml-auto w-full rounded-[28px] border border-border bg-card/95 p-4 shadow-lg backdrop-blur">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-label">Save State</p>
                <p className="mt-1 text-sm font-medium text-foreground">{saveStateLabel}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{checklistCount} checklist {checklistCount === 1 ? "item" : "items"}</p>
                <p className="text-xs text-muted-foreground">{activeChecklistCount} active, {requiredChecklistCount} required</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1" onClick={() => void handleSaveStrategy()} disabled={saveMutation.isPending || duplicateMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : currentSetup ? "Save Setup" : "Create Setup"}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => void handleSaveAndCreateTrade()}
                disabled={saveMutation.isPending || duplicateMutation.isPending}
              >
                {saveMutation.isPending ? "Saving..." : "Save & Create Trade"}
              </Button>
            </div>

            {currentSetup?.id ? (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="ghost" onClick={handleDuplicateSetup} disabled={saveMutation.isPending || duplicateMutation.isPending}>
                  {duplicateMutation.isPending ? "Duplicating..." : "Duplicate"}
                </Button>
                <Button variant="ghost" onClick={handleUseInTrade} disabled={saveMutation.isPending || duplicateMutation.isPending}>
                  Use in Trade
                </Button>
              </div>
            ) : null}
          </div>
        </FloatingActionPanel>
      </div>
    </PageShell>
  );
}
