import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ClipboardList, GripVertical, Pencil, Plus, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { PageErrorState } from "@/components/PageErrorState";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import { DataBadge } from "@/components/DataBadge";
import { StatCard } from "@/components/StatCard";
import { PageHeader, PageShell, SectionCard, SectionHeader } from "@/layouts/PageShell";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/features/auth/auth-context";
import { useUnauthorizedSessionGuard } from "@/features/auth/use-unauthorized-session-guard";
import { listAccounts } from "@/services/api/accounts";
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
import { updatePreferences } from "@/services/api/auth";
import { listSetups } from "@/services/api/setups";
import { privateQueryKey } from "@/services/query-client";
import { withMinimumDelay } from "@/utils/loading";
import { getPageErrorState } from "@/utils/page-errors";
import type { ChecklistRule } from "@/types";

type RuleFormState = {
  title: string;
  description: string;
  isRequired: boolean;
  isActive: boolean;
  setupId: string;
  accountId: string;
};

const emptyForm: RuleFormState = {
  title: "",
  description: "",
  isRequired: false,
  isActive: true,
  setupId: "__all",
  accountId: "__all",
};

function toRulePayload(form: RuleFormState): ChecklistRulePayload {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    isRequired: form.isRequired,
    isActive: form.isActive,
    setupId: form.setupId === "__all" ? null : form.setupId,
    accountId: form.accountId === "__all" ? null : form.accountId,
  };
}

function buildRuleForm(rule?: ChecklistRule | null): RuleFormState {
  if (!rule) {
    return emptyForm;
  }

  return {
    title: rule.title,
    description: rule.description ?? "",
    isRequired: rule.isRequired,
    isActive: rule.isActive,
    setupId: rule.setupId ?? "__all",
    accountId: rule.accountId ?? "__all",
  };
}

function reorderRules(rules: ChecklistRule[], draggedRuleId: string, targetRuleId: string) {
  const currentIndex = rules.findIndex((rule) => rule.id === draggedRuleId);
  const targetIndex = rules.findIndex((rule) => rule.id === targetRuleId);

  if (currentIndex === -1 || targetIndex === -1 || currentIndex === targetIndex) {
    return rules;
  }

  const next = [...rules];
  const [moved] = next.splice(currentIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

export default function ChecklistSettings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, refreshSession } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ChecklistRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChecklistRule | null>(null);
  const [form, setForm] = useState<RuleFormState>(emptyForm);
  const [titleError, setTitleError] = useState("");
  const [orderedRules, setOrderedRules] = useState<ChecklistRule[]>([]);
  const [draggedRuleId, setDraggedRuleId] = useState<string | null>(null);

  const rulesQuery = useQuery({
    queryKey: privateQueryKey(user.id, "checklist-rules", "list"),
    queryFn: async () => withMinimumDelay(() => listChecklistRules()),
  });
  const accountsQuery = useQuery({
    queryKey: privateQueryKey(user.id, "accounts", "checklist-scope"),
    queryFn: async () => {
      const response = await listAccounts({ status: "all" });
      return response.items;
    },
  });
  const setupsQuery = useQuery({
    queryKey: privateQueryKey(user.id, "setups", "checklist-scope"),
    queryFn: async () => {
      const response = await listSetups({
        page: 1,
        pageSize: 100,
        status: "all",
        sortBy: "name",
        sortOrder: "asc",
      });
      return response.items;
    },
  });

  const rules = rulesQuery.data?.items ?? [];
  const accounts = accountsQuery.data ?? [];
  const setups = setupsQuery.data ?? [];
  const activeRules = useMemo(() => rules.filter((rule) => rule.isActive), [rules]);
  const requiredRules = useMemo(() => rules.filter((rule) => rule.isRequired), [rules]);

  useEffect(() => {
    setOrderedRules(rules);
  }, [rules]);

  useUnauthorizedSessionGuard(rulesQuery.error);

  const invalidateChecklistQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: privateQueryKey(user.id, "checklist-rules") }),
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
      await invalidateChecklistQueries();
      toast.success(editingRule ? "Checklist rule updated." : "Checklist rule created.");
      setOpen(false);
      setEditingRule(null);
      setForm(emptyForm);
      setTitleError("");
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not save the checklist rule right now.";
      toast.error(message);
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => deleteChecklistRule(ruleId),
    onSuccess: async () => {
      await invalidateChecklistQueries();
      toast.success("Checklist rule deleted. Historical trade snapshots were preserved.");
      setDeleteTarget(null);
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not delete the checklist rule right now.";
      toast.error(message);
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ ruleId, isActive }: { ruleId: string; isActive: boolean }) => toggleChecklistRuleActive(ruleId, isActive),
    onSuccess: async (_result, variables) => {
      await invalidateChecklistQueries();
      toast.success(variables.isActive ? "Checklist rule activated." : "Checklist rule paused.");
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not update the checklist rule right now.";
      toast.error(message);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (ruleIds: string[]) => reorderChecklistRules(ruleIds),
    onSuccess: async () => {
      await invalidateChecklistQueries();
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not reorder checklist rules right now.";
      toast.error(message);
      setOrderedRules(rules);
    },
  });

  const checklistModeMutation = useMutation({
    mutationFn: async (checklistEnforcementMode: "soft" | "strict") => updatePreferences({ checklistEnforcementMode }),
    onSuccess: async (_result, checklistEnforcementMode) => {
      await refreshSession();
      toast.success(checklistEnforcementMode === "strict" ? "Strict checklist enforcement enabled." : "Soft checklist enforcement enabled.");
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not update checklist preferences right now.";
      toast.error(message);
    },
  });

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setTitleError("Title is required.");
      return;
    }

    setTitleError("");
    await saveRuleMutation.mutateAsync(toRulePayload(form));
  };

  const handleDrop = (targetRuleId: string) => {
    if (!draggedRuleId || draggedRuleId === targetRuleId) {
      setDraggedRuleId(null);
      return;
    }

    const nextRules = reorderRules(orderedRules, draggedRuleId, targetRuleId);
    setOrderedRules(nextRules);
    setDraggedRuleId(null);
    reorderMutation.mutate(nextRules.map((rule) => rule.id));
  };

  if (rulesQuery.isLoading && !rulesQuery.data) {
    return (
      <PageShell size="wide">
        <div className="grid gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => <div key={index} className="surface h-32 animate-pulse" />)}
        </div>
        <div className="surface h-96 animate-pulse" />
      </PageShell>
    );
  }

  if (rulesQuery.isError) {
    const errorState = getPageErrorState(rulesQuery.error, {
      unavailableTitle: "Checklist settings unavailable",
      unavailableDescription: "The checklist service is temporarily unavailable. Please try again in a moment.",
      unauthorizedDescription: "Your session expired or could not be verified. Redirecting to login.",
      validationTitle: "Checklist settings request invalid",
      validationDescription: "This checklist request could not be processed.",
      timeoutTitle: "Checklist settings timed out",
      timeoutDescription: "Loading checklist settings took too long. Please try again.",
    });

    return (
      <PageErrorState
        title={errorState.title}
        description={errorState.description}
        layout="page"
        size="wide"
        onRetry={errorState.allowRetry ? () => void rulesQuery.refetch() : undefined}
        isRetrying={rulesQuery.isFetching}
      />
    );
  }

  return (
    <PageShell size="wide">
      <PageHeader
        eyebrow="Discipline"
        title="Checklist"
        description="Define the rules you want visible before every new trade."
        actions={(
          <>
            <Button variant="outline" onClick={() => navigate("/settings")}>
              <ArrowLeft className="h-4 w-4" />
              Back to Settings
            </Button>
            <Button
              onClick={() => {
                setEditingRule(null);
                setForm(emptyForm);
                setTitleError("");
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add Rule
            </Button>
          </>
        )}
      />

      <div className="grid gap-6 md:grid-cols-3">
        <StatCard label="Total Rules" value={String(rules.length)} icon={ClipboardList} />
        <StatCard label="Active Rules" value={String(activeRules.length)} icon={Sparkles} />
        <StatCard label="Required Rules" value={String(requiredRules.length)} icon={ShieldCheck} />
      </div>

      <SectionCard className="space-y-4">
        <SectionHeader
          title="Enforcement"
          description="Choose whether required rules should warn only or block trade submission."
        />

        <div className="grid gap-4 lg:grid-cols-2">
          {[
            {
              value: "soft" as const,
              title: "Soft mode",
              description: "Warn when required rules are incomplete, but still allow the trade to be saved.",
            },
            {
              value: "strict" as const,
              title: "Strict mode",
              description: "Block new trades until every required rule is completed.",
            },
          ].map((option) => {
            const isActive = user.checklistEnforcementMode === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => checklistModeMutation.mutate(option.value)}
                disabled={checklistModeMutation.isPending}
                className={`rounded-3xl border px-5 py-5 text-left transition-colors ${
                  isActive
                    ? "border-primary/20 bg-primary/10"
                    : "border-border bg-background/70 hover:bg-muted/20"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">{option.title}</span>
                  <DataBadge tone={isActive ? "primary" : "neutral"}>
                    {isActive ? "Active" : "Select"}
                  </DataBadge>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{option.description}</p>
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard className="space-y-4">
        <SectionHeader
          title="Rules"
          description="Drag to reorder. Active rules appear in the new trade flow."
          action={reorderMutation.isPending ? <p className="text-xs text-muted-foreground">Saving order...</p> : undefined}
        />

        {orderedRules.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Create your first checklist rule"
            description="Start with the core decisions you want to verify before every trade."
            action={(
              <Button
                onClick={() => {
                  setEditingRule(null);
                  setForm(emptyForm);
                  setTitleError("");
                  setOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Create your first rule
              </Button>
            )}
          />
        ) : (
          <div className="space-y-3">
            {orderedRules.map((rule) => (
              <div
                key={rule.id}
                draggable
                onDragStart={() => setDraggedRuleId(rule.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDrop(rule.id)}
                className={`rounded-3xl border px-4 py-4 transition-colors ${
                  draggedRuleId === rule.id
                    ? "border-primary/25 bg-primary/5 opacity-70"
                    : "border-border bg-background/80"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <button
                      type="button"
                      className="mt-1 rounded-xl border border-border bg-background/80 p-2 text-muted-foreground"
                      aria-label={`Reorder ${rule.title}`}
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-medium text-foreground">{rule.title}</h3>
                        {rule.isRequired ? <DataBadge tone="warning">Required</DataBadge> : <DataBadge tone="neutral">Optional</DataBadge>}
                        <DataBadge tone={rule.isActive ? "success" : "neutral"}>
                          {rule.isActive ? "Active" : "Paused"}
                        </DataBadge>
                        {rule.setup ? <DataBadge tone="primary">Setup: {rule.setup.name}</DataBadge> : null}
                        {rule.account ? <DataBadge tone="primary">Account: {rule.account.name}</DataBadge> : null}
                      </div>
                      {rule.description ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{rule.description}</p> : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 rounded-2xl border border-border bg-background/80 px-3 py-2">
                      <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Active</span>
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={(checked) => toggleRuleMutation.mutate({ ruleId: rule.id, isActive: checked })}
                        disabled={toggleRuleMutation.isPending}
                      />
                    </div>

                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={`Edit ${rule.title}`}
                      onClick={() => {
                        setEditingRule(rule);
                        setForm(buildRuleForm(rule));
                        setTitleError("");
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={`Delete ${rule.title}`}
                      onClick={() => setDeleteTarget(rule)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit rule" : "Add rule"}</DialogTitle>
            <DialogDescription>Keep the wording concise so it stays clear in the trade flow.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="checklist-rule-title">Title</Label>
              <Input
                id="checklist-rule-title"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Waited for candle close confirmation"
              />
              {titleError ? <p className="text-xs text-destructive">{titleError}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="checklist-rule-description">Description</Label>
              <Textarea
                id="checklist-rule-description"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                rows={3}
                placeholder="Optional context for what must be verified before entry."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Setup scope</Label>
                <Select value={form.setupId} onValueChange={(value) => setForm((current) => ({ ...current, setupId: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">All setups</SelectItem>
                    {setups.map((setup) => <SelectItem key={setup.id} value={setup.id}>{setup.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Account scope</Label>
                <Select value={form.accountId} onValueChange={(value) => setForm((current) => ({ ...current, accountId: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">All accounts</SelectItem>
                    {accounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-2xl border border-border bg-background/70 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Required</p>
                  <p className="text-xs text-muted-foreground">Mark this rule as mandatory.</p>
                </div>
                <Switch
                  checked={form.isRequired}
                  onCheckedChange={(checked) => setForm((current) => ({ ...current, isRequired: checked }))}
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-border bg-background/70 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Active</p>
                  <p className="text-xs text-muted-foreground">Show this in new trades now.</p>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) => setForm((current) => ({ ...current, isActive: checked }))}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={saveRuleMutation.isPending}>
              {saveRuleMutation.isPending ? "Saving..." : editingRule ? "Save changes" : "Create rule"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(nextOpen) => !nextOpen && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete checklist rule?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Delete "${deleteTarget.title}" from your active checklist library. Existing trades will keep their saved checklist snapshots.`
                : "Delete this checklist rule."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteRuleMutation.mutate(deleteTarget.id)}
              disabled={deleteRuleMutation.isPending}
            >
              {deleteRuleMutation.isPending ? "Deleting..." : "Delete rule"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
