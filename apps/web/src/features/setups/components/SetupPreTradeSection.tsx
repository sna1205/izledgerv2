import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ClipboardList, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
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
import type { ChecklistRule, SetupDefinition } from "@/types";

type RuleFormState = {
  title: string;
  description: string;
  isRequired: boolean;
  isActive: boolean;
};

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
          <DialogTitle>{editingRule ? "Edit item" : "New item"}</DialogTitle>
          <DialogDescription>Keep it short and specific.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="pre-trade-title">Title</Label>
            <Input
              id="pre-trade-title"
              value={form.title}
              onChange={(event) => onFormChange((current) => ({ ...current, title: event.target.value }))}
              placeholder="Wait for confirmation"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pre-trade-description">Notes</Label>
            <Textarea
              id="pre-trade-description"
              rows={4}
              value={form.description}
              onChange={(event) => onFormChange((current) => ({ ...current, description: event.target.value }))}
              placeholder="Optional note."
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] border border-border/60 bg-muted/20 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Required</p>
                  <p className="mt-1 text-xs text-muted-foreground">Flag before save.</p>
                </div>
                <Switch
                  checked={form.isRequired}
                  onCheckedChange={(checked) => onFormChange((current) => ({ ...current, isRequired: checked }))}
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-border/60 bg-muted/20 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Active</p>
                  <p className="mt-1 text-xs text-muted-foreground">Hide from new trades when off.</p>
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

export function SetupPreTradeSection({
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
      <div className="rounded-[28px] border border-dashed border-border bg-card/65 px-6 py-10 text-center">
        <div className="mx-auto max-w-md">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-background/80 text-muted-foreground">
            <ClipboardList className="h-5 w-5" />
          </div>
          <p className="text-base font-semibold text-foreground">Save setup first</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Save the setup before adding pre-trade items.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-border/60 bg-card/80 px-4 py-4">
          <p className="text-label mb-2">Total Items</p>
          <p className="text-2xl font-semibold text-foreground">{rules.length}</p>
        </div>
        <div className="rounded-[24px] border border-border/60 bg-card/80 px-4 py-4">
          <p className="text-label mb-2">Active</p>
          <p className="text-2xl font-semibold text-foreground">{activeCount}</p>
        </div>
        <div className="rounded-[24px] border border-border/60 bg-card/80 px-4 py-4">
          <p className="text-label mb-2">Required</p>
          <p className="text-2xl font-semibold text-foreground">{requiredCount}</p>
        </div>
      </div>

      <div className="rounded-[32px] border border-border bg-card/85 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/70 bg-background/80 text-muted-foreground">
              <ClipboardList className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Pre-Trade</h3>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Active items appear when this setup is selected.
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
              <div key={index} className="h-24 animate-pulse rounded-[24px] bg-muted/40" />
            ))}
          </div>
        ) : null}

        {!rulesQuery.isLoading && rulesQuery.error ? (
          <div className="mt-5 rounded-[24px] border border-danger/20 bg-danger/10 px-5 py-6 text-center">
            <p className="text-sm font-medium text-foreground">Pre-trade items unavailable</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {rulesQuery.error instanceof ApiError ? rulesQuery.error.message : "This setup checklist could not be loaded right now."}
            </p>
          </div>
        ) : null}

        {!rulesQuery.isLoading && !rulesQuery.error && rules.length === 0 ? (
          <div className="mt-5 rounded-[24px] border border-dashed border-border bg-muted/15 px-5 py-8 text-center">
            <p className="text-sm font-medium text-foreground">No pre-trade items yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Add the checks that should appear for {setup.name}.</p>
          </div>
        ) : null}

        {!rulesQuery.isLoading && !rulesQuery.error && rules.length > 0 ? (
          <div className="mt-5 space-y-3">
            {rules.map((rule, index) => (
              <div key={rule.id} className="rounded-[24px] border border-border/70 bg-background/70 px-4 py-4">
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
                ? `Delete "${deleteTarget.title}" from ${setup.name}. Existing trades keep their snapshots.`
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
