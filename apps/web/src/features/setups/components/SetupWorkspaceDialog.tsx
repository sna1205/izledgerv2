import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ClipboardList, Pencil, Plus, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { DataBadge } from "@/components/DataBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/features/auth/auth-context";
import { ApiError } from "@/services/api/client";
import {
  createChecklistRule,
  deleteChecklistRule,
  listChecklistRules,
  reorderChecklistRules,
  toggleChecklistRuleActive,
  updateChecklistRule,
  type ChecklistRulePayload,
} from "@/services/api/checklist-rules";
import { privateQueryKey } from "@/services/query-client";
import { generateUniqueSetupColor, normalizeSetupColor, type ChecklistRule, type SetupDefinition } from "@/types";

type WorkspaceTab = "strategy" | "pre-trade";

type SetupWorkspaceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setup: SetupDefinition | null;
  setups: SetupDefinition[];
  initialTab?: WorkspaceTab;
  isSavingStrategy?: boolean;
  onSaveStrategy: (setupId: string | null, payload: SetupStrategyPayload) => Promise<SetupDefinition>;
};

type StrategyFormState = {
  name: string;
  description: string;
  entryLogic: string;
  confirmationLogic: string;
  invalidationLogic: string;
  notes: string;
  color: string;
  isArchived: boolean;
};

type SetupStrategyPayload = {
  name: string;
  description: string;
  entryLogic: string | null;
  confirmationLogic: string | null;
  invalidationLogic: string | null;
  notes: string | null;
  color: string;
  isArchived: boolean;
};

type RuleFormState = {
  title: string;
  description: string;
  isRequired: boolean;
  isActive: boolean;
};

const FALLBACK_SETUP_COLOR = "#10B981";

function buildUniqueFormColor(setups: SetupDefinition[], excludeSetupId?: string) {
  return generateUniqueSetupColor(
    setups
      .filter((setup) => setup.id !== excludeSetupId)
      .map((setup) => setup.color),
  );
}

function resolveDisplayColor(color: string | null | undefined) {
  return normalizeSetupColor(color) ?? FALLBACK_SETUP_COLOR;
}

function buildStrategyForm(setup: SetupDefinition | null, setups: SetupDefinition[]) {
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

function toStrategyPayload(form: StrategyFormState): SetupStrategyPayload {
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

function buildRuleForm(rule?: ChecklistRule | null): RuleFormState {
  return {
    title: rule?.title ?? "",
    description: rule?.description ?? "",
    isRequired: rule?.isRequired ?? false,
    isActive: rule?.isActive ?? true,
  };
}

function toRulePayload(form: RuleFormState, setupId: string): ChecklistRulePayload {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    isRequired: form.isRequired,
    isActive: form.isActive,
    setupId,
    accountId: null,
  };
}

function moveRule(rules: ChecklistRule[], fromIndex: number, toIndex: number) {
  if (toIndex < 0 || toIndex >= rules.length || fromIndex === toIndex) {
    return rules;
  }

  const nextRules = [...rules];
  const [moved] = nextRules.splice(fromIndex, 1);
  nextRules.splice(toIndex, 0, moved);
  return nextRules;
}

function RuleEditorDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  onSave,
  isSaving,
  editingRule,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: RuleFormState;
  onFormChange: (updater: (current: RuleFormState) => RuleFormState) => void;
  onSave: () => void;
  isSaving: boolean;
  editingRule: ChecklistRule | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingRule ? "Edit Pre-Trade Item" : "Add Pre-Trade Item"}</DialogTitle>
          <DialogDescription>Keep checklist items concise and specific to this setup.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="pre-trade-title">Title</Label>
            <Input
              id="pre-trade-title"
              value={form.title}
              onChange={(event) => onFormChange((current) => ({ ...current, title: event.target.value }))}
              placeholder="Wait for session sweep confirmation"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pre-trade-description">Description</Label>
            <Textarea
              id="pre-trade-description"
              rows={4}
              value={form.description}
              onChange={(event) => onFormChange((current) => ({ ...current, description: event.target.value }))}
              placeholder="Optional context for when this item matters."
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Required</p>
                  <p className="mt-1 text-xs text-muted-foreground">Block or flag missed discipline checks.</p>
                </div>
                <Switch
                  checked={form.isRequired}
                  onCheckedChange={(checked) => onFormChange((current) => ({ ...current, isRequired: checked }))}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Active</p>
                  <p className="mt-1 text-xs text-muted-foreground">Inactive items stay saved but hidden from new trades.</p>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) => onFormChange((current) => ({ ...current, isActive: checked }))}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={isSaving}>
              {isSaving ? "Saving..." : editingRule ? "Save Item" : "Add Item"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreTradeTab({
  setup,
  isOpen,
}: {
  setup: SetupDefinition | null;
  isOpen: boolean;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ChecklistRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChecklistRule | null>(null);
  const [form, setForm] = useState<RuleFormState>(buildRuleForm());

  const rulesQuery = useQuery({
    queryKey: privateQueryKey(user.id, "checklist-rules", "setup", setup?.id ?? "__new"),
    queryFn: async () => listChecklistRules({
      setupId: setup?.id ?? null,
      scopeMode: "exact",
    }),
    enabled: isOpen && Boolean(setup?.id),
  });

  const rules = rulesQuery.data?.items ?? [];
  const activeCount = rules.filter((rule) => rule.isActive).length;
  const requiredCount = rules.filter((rule) => rule.isRequired).length;

  const invalidateChecklistData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: privateQueryKey(user.id, "checklist-rules") }),
      queryClient.invalidateQueries({ queryKey: privateQueryKey(user.id, "setups") }),
      queryClient.invalidateQueries({ queryKey: privateQueryKey(user.id, "trades") }),
    ]);
  };

  const saveRuleMutation = useMutation({
    mutationFn: async (payload: ChecklistRulePayload) => {
      if (editingRule) {
        return updateChecklistRule(editingRule.id, payload);
      }

      return createChecklistRule(payload);
    },
    onSuccess: async () => {
      await invalidateChecklistData();
      toast.success(editingRule ? "Pre-trade item updated." : "Pre-trade item added.");
      setEditingRule(null);
      setForm(buildRuleForm());
      setRuleDialogOpen(false);
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not save the pre-trade item right now.";
      toast.error(message);
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: ({ ruleId, isActive }: { ruleId: string; isActive: boolean }) => toggleChecklistRuleActive(ruleId, isActive),
    onSuccess: async (_result, variables) => {
      await invalidateChecklistData();
      toast.success(variables.isActive ? "Pre-trade item activated." : "Pre-trade item paused.");
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not update the pre-trade item right now.";
      toast.error(message);
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId: string) => deleteChecklistRule(ruleId),
    onSuccess: async () => {
      await invalidateChecklistData();
      toast.success("Pre-trade item deleted. Historical trade snapshots were preserved.");
      setDeleteTarget(null);
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not delete the pre-trade item right now.";
      toast.error(message);
    },
  });

  const reorderRuleMutation = useMutation({
    mutationFn: (ruleIds: string[]) => reorderChecklistRules(ruleIds),
    onSuccess: async () => {
      await invalidateChecklistData();
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not update the checklist order right now.";
      toast.error(message);
    },
  });

  const openCreateRuleDialog = () => {
    setEditingRule(null);
    setForm(buildRuleForm());
    setRuleDialogOpen(true);
  };

  const openEditRuleDialog = (rule: ChecklistRule) => {
    setEditingRule(rule);
    setForm(buildRuleForm(rule));
    setRuleDialogOpen(true);
  };

  const handleSaveRule = () => {
    if (!setup?.id) {
      return;
    }

    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }

    saveRuleMutation.mutate(toRulePayload(form, setup.id));
  };

  const handleMoveRule = (ruleId: string, direction: "up" | "down") => {
    const currentIndex = rules.findIndex((rule) => rule.id === ruleId);

    if (currentIndex === -1) {
      return;
    }

    const nextRules = moveRule(rules, currentIndex, direction === "up" ? currentIndex - 1 : currentIndex + 1);

    if (nextRules === rules) {
      return;
    }

    reorderRuleMutation.mutate(nextRules.map((rule) => rule.id));
  };

  if (!setup?.id) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-muted/20 px-6 py-8 text-center">
        <p className="text-sm font-medium text-foreground">Save the strategy first</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Once this setup exists, you can add setup-specific pre-trade items here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-4">
          <p className="text-label mb-2">Total Items</p>
          <p className="text-2xl font-semibold text-foreground">{rules.length}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-4">
          <p className="text-label mb-2">Active</p>
          <p className="text-2xl font-semibold text-foreground">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-4">
          <p className="text-label mb-2">Required</p>
          <p className="text-2xl font-semibold text-foreground">{requiredCount}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card/80 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-background/80 text-muted-foreground">
              <ClipboardList className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-medium text-foreground">Setup Pre-Trade Checklist</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Only active items from this setup are shown before a new trade is saved.
              </p>
            </div>
          </div>

          <Button onClick={openCreateRuleDialog}>
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>

        {rulesQuery.isLoading ? (
          <div className="mt-5 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-2xl bg-muted/40" />
            ))}
          </div>
        ) : null}

        {!rulesQuery.isLoading && rulesQuery.error ? (
          <div className="mt-5 rounded-2xl border border-danger/20 bg-danger/10 px-5 py-6 text-center">
            <p className="text-sm font-medium text-foreground">Pre-trade items unavailable</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {rulesQuery.error instanceof ApiError ? rulesQuery.error.message : "This setup checklist could not be loaded right now."}
            </p>
          </div>
        ) : null}

        {!rulesQuery.isLoading && !rulesQuery.error && rules.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-border bg-muted/15 px-5 py-7 text-center">
            <p className="text-sm font-medium text-foreground">No pre-trade items yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add the checks that should appear whenever {setup.name} is selected on a new trade.
            </p>
          </div>
        ) : null}

        {!rulesQuery.isLoading && !rulesQuery.error && rules.length > 0 ? (
          <div className="mt-5 space-y-3">
            {rules.map((rule, index) => (
              <div key={rule.id} className="rounded-2xl border border-border/70 bg-background/70 px-4 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{rule.title}</p>
                      <DataBadge tone={rule.isRequired ? "warning" : "neutral"}>
                        {rule.isRequired ? "Required" : "Optional"}
                      </DataBadge>
                      <DataBadge tone={rule.isActive ? "success" : "neutral"}>
                        {rule.isActive ? "Active" : "Inactive"}
                      </DataBadge>
                    </div>
                    {rule.description ? (
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{rule.description}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`Move ${rule.title} up`}
                      disabled={index === 0 || reorderRuleMutation.isPending}
                      onClick={() => handleMoveRule(rule.id, "up")}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`Move ${rule.title} down`}
                      disabled={index === rules.length - 1 || reorderRuleMutation.isPending}
                      onClick={() => handleMoveRule(rule.id, "down")}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`${rule.isActive ? "Pause" : "Activate"} ${rule.title}`}
                      disabled={toggleRuleMutation.isPending}
                      onClick={() => toggleRuleMutation.mutate({ ruleId: rule.id, isActive: !rule.isActive })}
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="outline" size="icon" aria-label={`Edit ${rule.title}`} onClick={() => openEditRuleDialog(rule)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`Delete ${rule.title}`}
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(rule)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <RuleEditorDialog
        open={ruleDialogOpen}
        onOpenChange={setRuleDialogOpen}
        form={form}
        onFormChange={(updater) => setForm((current) => updater(current))}
        onSave={handleSaveRule}
        isSaving={saveRuleMutation.isPending}
        editingRule={editingRule}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(nextOpen) => !nextOpen && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete pre-trade item?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Delete "${deleteTarget.title}" from ${setup.name}. Existing trades keep their saved checklist snapshots.`
                : "Delete this pre-trade item."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteRuleMutation.mutate(deleteTarget.id)} disabled={deleteRuleMutation.isPending}>
              {deleteRuleMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function SetupWorkspaceDialog({
  open,
  onOpenChange,
  setup,
  setups,
  initialTab = "strategy",
  isSavingStrategy = false,
  onSaveStrategy,
}: SetupWorkspaceDialogProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialTab);
  const [currentSetup, setCurrentSetup] = useState<SetupDefinition | null>(setup);
  const [form, setForm] = useState<StrategyFormState>(() => buildStrategyForm(setup, setups));

  useEffect(() => {
    if (!open) {
      return;
    }

    setCurrentSetup(setup);
    setForm(buildStrategyForm(setup, setups));
    setActiveTab(initialTab);
  }, [initialTab, open, setup, setups]);

  const previewColor = resolveDisplayColor(form.color);
  const formColorLabel = normalizeSetupColor(form.color) ?? previewColor;
  const strategyPayload = useMemo(() => toStrategyPayload(form), [form]);

  const regenerateFormColor = () => {
    setForm((current) => ({
      ...current,
      color: buildUniqueFormColor(setups, currentSetup?.id),
    }));
  };

  const handleSaveStrategy = async () => {
    const savedSetup = await onSaveStrategy(currentSetup?.id ?? null, strategyPayload);

    setCurrentSetup(savedSetup);
    setForm(buildStrategyForm(savedSetup, setups));

    if (!setup) {
      setActiveTab("pre-trade");
      toast.success("Strategy saved. You can add setup-specific pre-trade items now.");
      return;
    }

    toast.success("Strategy updated.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] w-[calc(100vw-1rem)] max-w-4xl overflow-y-auto rounded-3xl p-4 sm:w-[calc(100vw-2rem)] sm:p-6">
        <DialogHeader>
          <DialogTitle>{currentSetup ? currentSetup.name : "Create Setup"}</DialogTitle>
          <DialogDescription>
            Keep strategy context and setup-specific pre-trade discipline in one workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-3xl border border-border bg-muted/15 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <DataBadge tone={form.isArchived ? "warning" : "primary"}>
                  {form.isArchived ? "Archived" : "Active"}
                </DataBadge>
                {currentSetup ? <DataBadge tone="neutral">Live setup</DataBadge> : <DataBadge tone="neutral">Draft</DataBadge>}
              </div>
              <p className="text-sm text-muted-foreground">
                Strategy holds the setup thesis. Pre-Trade holds the checks that must be reviewed before execution.
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as WorkspaceTab)} className="w-full lg:w-auto">
              <TabsList className="grid h-auto w-full grid-cols-2 lg:w-[280px]">
                <TabsTrigger value="strategy">Strategy</TabsTrigger>
                <TabsTrigger value="pre-trade">Pre-Trade</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as WorkspaceTab)} className="space-y-6">
          <TabsContent value="strategy" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="space-y-6">
                <div className="rounded-3xl border border-border bg-card/80 p-5">
                  <div className="grid gap-5">
                    <div className="space-y-2">
                      <Label className="text-label" htmlFor="setup-name">Setup Name</Label>
                      <Input
                        id="setup-name"
                        value={form.name}
                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                        placeholder="Liquidity Sweep Reversal"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-label" htmlFor="setup-description">Description</Label>
                      <Textarea
                        id="setup-description"
                        rows={4}
                        value={form.description}
                        onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                        placeholder="Short summary of the setup and where it performs best."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-label" htmlFor="setup-entry-logic">Entry Logic</Label>
                      <Textarea
                        id="setup-entry-logic"
                        rows={4}
                        value={form.entryLogic}
                        onChange={(event) => setForm((current) => ({ ...current, entryLogic: event.target.value }))}
                        placeholder="What has to happen before the trade becomes executable?"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-label" htmlFor="setup-confirmation-logic">Confirmation Logic</Label>
                      <Textarea
                        id="setup-confirmation-logic"
                        rows={4}
                        value={form.confirmationLogic}
                        onChange={(event) => setForm((current) => ({ ...current, confirmationLogic: event.target.value }))}
                        placeholder="Additional confirmations that strengthen conviction."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-label" htmlFor="setup-invalidation-logic">Invalidation Logic</Label>
                      <Textarea
                        id="setup-invalidation-logic"
                        rows={4}
                        value={form.invalidationLogic}
                        onChange={(event) => setForm((current) => ({ ...current, invalidationLogic: event.target.value }))}
                        placeholder="What disqualifies the setup before entry?"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-label" htmlFor="setup-notes">Notes</Label>
                      <Textarea
                        id="setup-notes"
                        rows={4}
                        value={form.notes}
                        onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                        placeholder="Nuance, execution reminders, or review notes."
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl border border-border bg-card/80 p-5">
                  <p className="text-label mb-3">Status</p>
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{form.isArchived ? "Archived" : "Active"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Archived setups stay available on historical trades but disappear from new trade selection.
                      </p>
                    </div>
                    <Switch
                      checked={!form.isArchived}
                      onCheckedChange={(checked) => setForm((current) => ({ ...current, isArchived: !checked }))}
                      aria-label="Toggle setup active status"
                    />
                  </div>
                </div>

                <div className="rounded-3xl border border-border bg-card/80 p-5">
                  <p className="text-label mb-3">Color</p>
                  <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="h-4 w-4 rounded-full border border-black/5 shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:ring-white/10"
                          style={{ backgroundColor: previewColor }}
                        />
                        <div>
                          <p className="font-mono-price text-sm font-medium text-foreground">{formColorLabel}</p>
                          <p className="text-xs text-muted-foreground">Auto-assigned</p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-xl px-3 text-xs"
                        aria-label="Regenerate setup color"
                        onClick={regenerateFormColor}
                      >
                        Regenerate
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-border bg-card/80 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-background/80 text-muted-foreground">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Strategy First</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        The `Pre-Trade` tab is setup-specific by design, so the strategy record is the anchor.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pre-trade">
            <PreTradeTab setup={currentSetup} isOpen={open && activeTab === "pre-trade"} />
          </TabsContent>
        </Tabs>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {activeTab === "strategy" ? (
            <Button onClick={() => void handleSaveStrategy()} disabled={isSavingStrategy}>
              {isSavingStrategy ? "Saving..." : currentSetup ? "Save Strategy" : "Create Setup"}
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type { SetupStrategyPayload, WorkspaceTab };
