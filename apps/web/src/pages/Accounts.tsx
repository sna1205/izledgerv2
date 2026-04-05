import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Archive, Bitcoin, FlaskConical, Landmark, Pencil, Plus, RotateCcw, Trash2, Trophy, UserRound, Wallet } from "lucide-react";
import { AccountsSkeleton } from "@/components/skeletons/AccountsSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { PageErrorState } from "@/components/PageErrorState";
import { PageHeader, PageShell, SectionCard } from "@/layouts/PageShell";
import { StatCard } from "@/components/StatCard";
import { DataBadge } from "@/components/DataBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FloatingActionPanel } from "@/components/ui/floating-action-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/features/auth/auth-context";
import { useUnauthorizedSessionGuard } from "@/features/auth/use-unauthorized-session-guard";
import { ApiError } from "@/services/api/client";
import { createAccount, deleteAccount, listAccounts, updateAccount } from "@/services/api/accounts";
import { getAnalyticsBreakdowns } from "@/services/api/analytics";
import { setStoredAccountFilter } from "@/utils/account-filter";
import {
  ACCOUNT_CURRENCY_MAX_LENGTH,
  ACCOUNT_NAME_MAX_LENGTH,
  getAccountApiErrorMessage,
  validateAccountForm,
} from "@/utils/account-validation";
import {
  formatCurrencyTotalsDisplay,
  formatMoneyDisplay,
  formatPercentageDisplay,
} from "@/utils/analytics-rendering";
import { getPageErrorState } from "@/utils/page-errors";
import { withMinimumDelay } from "@/utils/loading";
import { privateQueryKey } from "@/services/query-client";
import type { Account, AccountType } from "@/types";
import { ACCOUNT_BROKERS, ACCOUNT_TYPES } from "@/types";
import { cn } from "@/utils/class-names";

type AccountFormState = {
  name: string;
  broker: string;
  type: AccountType;
  balance: string;
  currency: string;
};

const emptyForm: AccountFormState = {
  name: "",
  broker: "Manual",
  type: "Personal",
  balance: "",
  currency: "USD",
};

function formatBalance(balance: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(balance);
  } catch {
    return `${currency || "USD"} ${balance.toFixed(2)}`;
  }
}

function getProfitTone(value: number) {
  if (value > 0) return "text-success";
  if (value < 0) return "text-danger";
  return "text-foreground";
}

function getAccountIcon(type: AccountType) {
  switch (type) {
    case "Funded":
      return { icon: Trophy, badgeTone: "success" as const };
    case "Challenge":
      return { icon: Landmark, badgeTone: "warning" as const };
    case "Demo":
      return { icon: FlaskConical, badgeTone: "primary" as const };
    case "Crypto":
      return { icon: Bitcoin, badgeTone: "warning" as const };
    case "Personal":
    default:
      return { icon: UserRound, badgeTone: "neutral" as const };
  }
}

function toFormState(account: Account): AccountFormState {
  return {
    name: account.name,
    broker: account.broker,
    type: account.type,
    balance: String(account.balance),
    currency: account.currency,
  };
}

export default function Accounts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [form, setForm] = useState<AccountFormState>(emptyForm);
  const [formError, setFormError] = useState("");

  const accountsQuery = useQuery({
    queryKey: privateQueryKey(user.id, "accounts", "all"),
    queryFn: async () => {
      const response = await withMinimumDelay(() => listAccounts({ status: "all" }));
      return response.items;
    },
  });

  const breakdownsQuery = useQuery({
    queryKey: privateQueryKey(user.id, "analytics-breakdowns", "all"),
    queryFn: () => getAnalyticsBreakdowns(),
  });

  const accounts = accountsQuery.data ?? [];
  const accountPerformance = useMemo(
    () => {
      const grouped = new Map<string, NonNullable<typeof breakdownsQuery.data>["accountPerformance"]>();

      for (const row of breakdownsQuery.data?.accountPerformance ?? []) {
        const existing = grouped.get(row.accountId) ?? [];
        existing.push(row);
        grouped.set(row.accountId, existing);
      }

      return grouped;
    },
    [breakdownsQuery.data?.accountPerformance],
  );

  const invalidateAccountData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: privateQueryKey(user.id, "accounts") }),
      queryClient.invalidateQueries({ queryKey: privateQueryKey(user.id, "analytics-breakdowns") }),
      queryClient.invalidateQueries({ queryKey: privateQueryKey(user.id, "analytics-calendar") }),
      queryClient.invalidateQueries({ queryKey: privateQueryKey(user.id, "dashboard-summary") }),
      queryClient.invalidateQueries({ queryKey: privateQueryKey(user.id, "trades") }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: AccountFormState) => {
      const normalized = {
        name: payload.name.trim(),
        broker: payload.broker,
        type: payload.type,
        balance: Number.parseFloat(payload.balance) || 0,
        currency: payload.currency.trim().toUpperCase() || "USD",
      };

      if (editingAccount) {
        return updateAccount(editingAccount.id, normalized);
      }

      return createAccount(normalized);
    },
    onSuccess: async () => {
      await invalidateAccountData();
      toast.success(editingAccount ? "Account updated successfully." : "Account created successfully.");
      setOpen(false);
      setEditingAccount(null);
      setForm(emptyForm);
      setFormError("");
    },
    onError: (error) => {
      const message = getAccountApiErrorMessage(error, "Could not save the account right now.");
      setFormError(message);

      if (!(error instanceof ApiError && error.code === "VALIDATION_ERROR")) {
        toast.error(message);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (accountId: string) => deleteAccount(accountId),
    onSuccess: async () => {
      await invalidateAccountData();
      toast.success("Account deleted.");
      setDeleteError("");
      setDeleteTarget(null);
    },
    onError: (error) => {
      const message = getAccountApiErrorMessage(error, "Could not delete the account right now.");
      setDeleteError(message);
      toast.error(message);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async ({ accountId, isArchived }: { accountId: string; isArchived: boolean }) => updateAccount(accountId, { isArchived }),
    onSuccess: async (_result, variables) => {
      await invalidateAccountData();
      toast.success(variables.isArchived ? "Account archived." : "Account restored.");
      setDeleteError("");

      if (variables.isArchived && deleteTarget?.id === variables.accountId) {
        setDeleteTarget(null);
      }
    },
    onError: (error) => {
      const message = getAccountApiErrorMessage(error, "Could not update the account right now.");
      toast.error(message);
    },
  });

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
  const balanceTotals = useMemo(() => {
    const totals = new Map<string, number>();

    for (const account of accounts) {
      totals.set(account.currency, (totals.get(account.currency) ?? 0) + account.balance);
    }

    return Array.from(totals.entries()).map(([currency, balance]) => ({
      currency,
      totalProfit: balance,
    }));
  }, [accounts]);
  const totalPnlSummary = breakdownsQuery.data?.summary;
  const combinedBalanceIsMixed = balanceTotals.length > 1;
  const combinedBalanceValue = combinedBalanceIsMixed
    ? "Mixed"
    : formatMoneyDisplay(totalBalance, {
        currency: balanceTotals[0]?.currency ?? "USD",
        showPlus: false,
        fallback: "--",
      });
  const combinedBalanceSubtext = combinedBalanceIsMixed
    ? formatCurrencyTotalsDisplay(balanceTotals, "No balances yet")
    : balanceTotals[0]?.currency ?? undefined;
  const totalPnlValue = totalPnlSummary?.isMixedCurrency
    ? "Mixed"
    : formatMoneyDisplay(totalPnlSummary?.totalProfit ?? 0, {
        currency: totalPnlSummary?.displayCurrency,
        fallback: "--",
      });
  const totalPnlSubtext = totalPnlSummary?.isMixedCurrency
    ? formatCurrencyTotalsDisplay(totalPnlSummary.currencyTotals, "Select an account to view one-currency PnL.")
    : totalPnlSummary?.displayCurrency ?? undefined;

  useUnauthorizedSessionGuard(accountsQuery.error, breakdownsQuery.error);

  const openCreateModal = () => {
    setEditingAccount(null);
    setForm(emptyForm);
    setFormError("");
    setOpen(true);
  };

  const openDeleteDialog = (account: Account) => {
    setDeleteTarget(account);
    setDeleteError("");
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setForm(toFormState(account));
    setFormError("");
    setOpen(true);
  };

  const handleSaveAccount = () => {
    const validationError = validateAccountForm(form);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError("");
    saveMutation.mutate(form);
  };

  if (accountsQuery.isLoading && !accountsQuery.data) {
    return <AccountsSkeleton />;
  }

  if (accountsQuery.isError) {
    const errorState = getPageErrorState(accountsQuery.error, {
      unavailableTitle: "Accounts unavailable",
      unavailableDescription: "The accounts service is temporarily unavailable. Please try again in a moment.",
      unauthorizedDescription: "Your session expired or could not be verified. Redirecting to login.",
      validationTitle: "Accounts request invalid",
      validationDescription: "The accounts request could not be processed.",
      timeoutTitle: "Accounts request timed out",
      timeoutDescription: "Loading your accounts took too long. Please try again.",
    });

    return (
      <PageErrorState
        title={errorState.title}
        description={errorState.description}
        layout="page"
        size="wide"
        onRetry={errorState.allowRetry ? () => void accountsQuery.refetch() : undefined}
        isRetrying={accountsQuery.isFetching}
      />
    );
  }

  return (
    <PageShell size="wide">
      <PageHeader
        title="Accounts"
        actions={(
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
        )}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard label="Total Accounts" value={String(accounts.length)} icon={Wallet} />
        <StatCard label="Combined Balance" value={combinedBalanceValue} subtext={combinedBalanceSubtext} icon={Landmark} />
        <StatCard
          label="Total PnL"
          value={totalPnlValue}
          subtext={totalPnlSubtext}
          tone={!totalPnlSummary?.isMixedCurrency && (totalPnlSummary?.totalProfit ?? 0) > 0 ? "positive" : !totalPnlSummary?.isMixedCurrency && (totalPnlSummary?.totalProfit ?? 0) < 0 ? "negative" : "default"}
          icon={Trophy}
        />
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No accounts yet"
          description="Add an account to get started."
          action={(
            <Button onClick={openCreateModal}>
              <Plus className="h-4 w-4" />
              Add account
            </Button>
          )}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {accounts.map((account) => {
            const performanceRows = accountPerformance.get(account.id) ?? [];
            const primaryPerformance = performanceRows[0];
            const performanceValue = performanceRows.length > 1
              ? "Mixed"
              : formatMoneyDisplay(primaryPerformance?.profit ?? 0, {
                  currency: primaryPerformance?.currency ?? account.currency,
                  fallback: `${account.currency} 0.00`,
                });
            const performanceSubtext = performanceRows.length > 1
              ? formatCurrencyTotalsDisplay(
                  performanceRows.map((row) => ({
                    currency: row.currency ?? account.currency,
                    totalProfit: row.profit,
                  })),
                  "No PnL yet",
                )
              : (primaryPerformance?.currency ?? account.currency);
            const iconData = getAccountIcon(account.type);
            const Icon = iconData.icon;

            return (
              <SectionCard
                key={account.id}
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-background/60 text-foreground">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-medium text-foreground">{account.name}</h2>
                          <DataBadge tone={iconData.badgeTone}>{account.type}</DataBadge>
                          {account.isDefault ? <DataBadge tone="primary">Default</DataBadge> : null}
                          {account.isArchived ? <DataBadge tone="neutral">Archived</DataBadge> : null}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{account.broker}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => archiveMutation.mutate({ accountId: account.id, isArchived: !account.isArchived })}
                        disabled={archiveMutation.isPending}
                      >
                        {account.isArchived ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                        {account.isArchived ? "Restore" : "Archive"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEditModal(account)}>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => openDeleteDialog(account)}>
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  <div className="surface-muted px-4 py-4">
                    <p className="text-label mb-2">Balance</p>
                    <p className="font-mono-price numeric-safe max-w-full text-2xl font-semibold text-foreground">
                      {formatBalance(account.balance, account.currency)}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="surface-muted px-4 py-4">
                      <p className="text-label mb-2">Trades</p>
                      <p className="text-lg font-semibold text-foreground">{formatNumberSafe(primaryPerformance?.trades)}</p>
                    </div>
                    <div className="surface-muted px-4 py-4">
                      <p className="text-label mb-2">PnL</p>
                      <p className={cn("font-mono-price numeric-safe max-w-full text-lg font-semibold", performanceRows.length > 1 ? "text-foreground" : getProfitTone(primaryPerformance?.profit ?? 0))}>
                        {performanceValue}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">{performanceSubtext}</p>
                    </div>
                    <div className="surface-muted px-4 py-4">
                      <p className="text-label mb-2">Win Rate</p>
                      <p className="text-lg font-semibold text-foreground">{formatPercentageDisplay(primaryPerformance?.winRate ?? 0)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {account.isArchived
                          ? "Archived accounts are hidden from active account selectors."
                          : `Created ${new Date(account.createdAt).toLocaleDateString("en-US")}`}
                      </p>
                      {!account.isArchived ? (
                        <p className="text-xs text-muted-foreground">
                          {(primaryPerformance?.trades ?? 0) > 0
                            ? "This account already has journal history. Archive it when you retire it. Delete is best for unused accounts."
                            : "Delete is best for unused accounts. Archive keeps the account out of selectors while preserving history if you need it later."}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!account.isArchived ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setStoredAccountFilter(account.id);
                              navigate("/dashboard");
                            }}
                          >
                            View Overview
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setStoredAccountFilter(account.id);
                              navigate("/analytics");
                            }}
                          >
                            View Analytics
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </SectionCard>
            );
          })}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);

          if (!nextOpen) {
            setEditingAccount(null);
            setForm(emptyForm);
            setFormError("");
          }
        }}
      >
        <DialogContent className="max-h-[90svh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAccount ? "Edit Account" : "Add Account"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label className="text-label">Account Name</Label>
              <Input
                maxLength={ACCOUNT_NAME_MAX_LENGTH}
                placeholder="Primary Account"
                value={form.name}
                onChange={(event) => {
                  setForm((current) => ({ ...current, name: event.target.value }));
                  setFormError("");
                }}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-label">Broker</Label>
                <Select value={form.broker} onValueChange={(value) => {
                  setForm((current) => ({ ...current, broker: value }));
                  setFormError("");
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_BROKERS.map((broker) => (
                      <SelectItem key={broker} value={broker}>{broker}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-label">Type</Label>
                <Select value={form.type} onValueChange={(value) => {
                  setForm((current) => ({ ...current, type: value as AccountType }));
                  setFormError("");
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-label">Balance</Label>
                <Input
                  inputMode="decimal"
                  placeholder="10000"
                  value={form.balance}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, balance: event.target.value }));
                    setFormError("");
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-label">Currency</Label>
                <Input
                  maxLength={ACCOUNT_CURRENCY_MAX_LENGTH}
                  placeholder="USD"
                  value={form.currency}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }));
                    setFormError("");
                  }}
                />
              </div>
            </div>

            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          </div>

          <div className="sticky bottom-0 z-10 flex justify-end pb-1 pt-4">
            <FloatingActionPanel className="w-full sm:w-auto sm:min-w-[280px]">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveAccount} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : editingAccount ? "Save Changes" : "Create Account"}
                </Button>
              </div>
            </FloatingActionPanel>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(openState) => {
          if (!openState) {
            setDeleteTarget(null);
            setDeleteError("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Delete "${deleteTarget.name}" only if it has never been used by trades or checklist rules. If you want to keep journal history but remove it from active use, archive it instead.`
                : "Delete this account only if it has never been used by trades or checklist rules."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError ? (
            <p className="text-sm text-destructive">{deleteError}</p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending || archiveMutation.isPending}>Cancel</AlertDialogCancel>
            {!deleteTarget?.isArchived ? (
              <Button
                variant="outline"
                onClick={() => deleteTarget && archiveMutation.mutate({ accountId: deleteTarget.id, isArchived: true })}
                disabled={deleteMutation.isPending || archiveMutation.isPending}
              >
                {archiveMutation.isPending ? "Archiving..." : "Archive Instead"}
              </Button>
            ) : null}
            <Button
              variant="destructive"
              onClick={() => {
                if (!deleteTarget) {
                  return;
                }

                setDeleteError("");
                deleteMutation.mutate(deleteTarget.id);
              }}
              disabled={deleteMutation.isPending || archiveMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}

function formatNumberSafe(value: number | undefined) {
  return typeof value === "number" ? value.toLocaleString("en-US") : "0";
}
