import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Bitcoin, FlaskConical, Landmark, Pencil, Plus, Trash2, Trophy, UserRound } from "lucide-react";
import { PageErrorState } from "@/components/PageErrorState";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api/client";
import { createAccount, deleteAccount, listAccounts, updateAccount } from "@/lib/api/accounts";
import { getAnalyticsBreakdowns } from "@/lib/api/analytics";
import { setStoredAccountFilter } from "@/lib/account-filter";
import {
  ACCOUNT_CURRENCY_MAX_LENGTH,
  ACCOUNT_CURRENCY_MIN_LENGTH,
  ACCOUNT_NAME_MAX_LENGTH,
  getAccountApiErrorMessage,
  validateAccountForm,
} from "@/lib/account-validation";
import { getPageErrorState } from "@/lib/page-errors";
import { privateQueryKey } from "@/lib/react-query";
import type { Account, AccountType } from "@/lib/types";
import { ACCOUNT_BROKERS, ACCOUNT_TYPES } from "@/lib/types";

const summaryCardClass = "rounded-xl border bg-card p-5 shadow-sm";
const accountCardClass = "rounded-xl border bg-card p-6 shadow-sm";

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

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatBalance(balance: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(balance);
  } catch {
    return `${currency || "USD"} ${usdFormatter.format(balance).replace("$", "")}`;
  }
}

function formatPnl(value: number) {
  if (value > 0) return `+${usdFormatter.format(value)}`;
  if (value < 0) return `-${usdFormatter.format(Math.abs(value))}`;
  return usdFormatter.format(0);
}

function getProfitTone(value: number) {
  if (value > 0) return "text-emerald-600";
  if (value < 0) return "text-rose-600";
  return "text-foreground";
}

function getAccountIcon(type: AccountType) {
  switch (type) {
    case "Funded":
      return { icon: Trophy, className: "bg-emerald-50 text-emerald-600" };
    case "Challenge":
      return { icon: Landmark, className: "bg-amber-50 text-amber-600" };
    case "Demo":
      return { icon: FlaskConical, className: "bg-sky-50 text-sky-600" };
    case "Crypto":
      return { icon: Bitcoin, className: "bg-orange-50 text-orange-600" };
    case "Personal":
    default:
      return { icon: UserRound, className: "bg-slate-100 text-slate-600" };
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
  const [form, setForm] = useState<AccountFormState>(emptyForm);
  const [formError, setFormError] = useState("");

  const accountsQuery = useQuery({
    queryKey: privateQueryKey(user.id, "accounts"),
    queryFn: async () => {
      const response = await listAccounts();
      return response.items;
    },
  });
  const breakdownsQuery = useQuery({
    queryKey: privateQueryKey(user.id, "analytics-breakdowns", "all"),
    queryFn: () => getAnalyticsBreakdowns(),
  });

  const accounts = accountsQuery.data ?? [];
  const accountPerformance = useMemo(
    () => Object.fromEntries((breakdownsQuery.data?.accountPerformance ?? []).map((row) => [row.accountId, row])),
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
      setDeleteTarget(null);
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not delete the account right now.";
      toast.error(message);
    },
  });

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
  const totalPnl = breakdownsQuery.data?.summary.totalProfit ?? 0;

  const openCreateModal = () => {
    setEditingAccount(null);
    setForm(emptyForm);
    setFormError("");
    setOpen(true);
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

  const handleOpenDashboard = (accountId: string) => {
    setStoredAccountFilter(accountId);
    navigate("/dashboard");
  };

  const handleOpenAnalytics = (accountId: string) => {
    setStoredAccountFilter(accountId);
    navigate("/analytics");
  };

  if (accountsQuery.isLoading && !accountsQuery.data) {
    return <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">Loading accounts...</div>;
  }

  if (accountsQuery.isError) {
    const errorState = getPageErrorState(accountsQuery.error, {
      unavailableTitle: "Accounts unavailable",
      unavailableDescription: "The accounts service is temporarily unavailable. Please try again in a moment.",
      unauthorizedDescription: "Your session is not allowed to view accounts right now.",
      validationTitle: "Accounts request invalid",
      validationDescription: "The accounts request could not be processed.",
      timeoutTitle: "Accounts request timed out",
      timeoutDescription: "Loading your accounts took too long. Please try again.",
    });

    return (
      <PageErrorState
        title={errorState.title}
        description={errorState.description}
        onRetry={errorState.allowRetry ? () => void accountsQuery.refetch() : undefined}
        isRetrying={accountsQuery.isFetching}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Accounts</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track each account like its own trading business with clean account-level visibility.
            </p>
          </div>

          <Button size="sm" onClick={openCreateModal} className="w-full sm:w-auto">
            <Plus className="mr-1 h-4 w-4" />
            Add Account
          </Button>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className={summaryCardClass}>
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Total Accounts</p>
            <p className="mt-3 text-3xl font-semibold text-foreground">{accounts.length}</p>
          </div>
          <div className={summaryCardClass}>
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Combined Balance</p>
            <p className="mt-3 text-3xl font-semibold text-foreground">{usdFormatter.format(totalBalance)}</p>
          </div>
          <div className={summaryCardClass}>
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Total PnL</p>
            <p className={`mt-3 text-3xl font-semibold ${totalPnl > 0 ? "text-emerald-600" : totalPnl < 0 ? "text-rose-600" : "text-foreground"}`}>
              {formatPnl(totalPnl)}
            </p>
          </div>
        </div>

        {accounts.length === 0 ? (
          <div className="rounded-2xl border bg-card p-16 text-center shadow-sm">
            <p className="text-base font-medium text-foreground">No accounts yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">Create your first account to start logging trades and tracking performance.</p>
            <Button className="mt-4" size="sm" onClick={openCreateModal}>
              <Plus className="mr-1 h-4 w-4" />
              Create your first account
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            {accounts.map((account) => {
              const iconData = getAccountIcon(account.type);
              const Icon = iconData.icon;
              const performance = accountPerformance[account.id];

              return (
                <article key={account.id} className={accountCardClass}>
                  <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconData.className}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold text-foreground">{account.name}</h2>
                          {account.isDefault ? (
                            <span className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                              Default
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {account.type} • {account.broker}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditModal(account)}>
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(account)}>
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border bg-background/70 p-3">
                      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Balance</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{formatBalance(account.balance, account.currency)}</p>
                    </div>
                    <div className="rounded-xl border bg-background/70 p-3">
                      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Trades</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{performance?.trades ?? 0}</p>
                    </div>
                    <div className="rounded-xl border bg-background/70 p-3">
                      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">PnL</p>
                      <p className={`mt-2 text-lg font-semibold ${getProfitTone(performance?.profit ?? 0)}`}>
                        {formatPnl(performance?.profit ?? 0)}
                      </p>
                    </div>
                    <div className="rounded-xl border bg-background/70 p-3">
                      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Win Rate</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{(performance?.winRate ?? 0).toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(account.createdAt).toLocaleDateString("en-US")}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenDashboard(account.id)}>
                        View Overview
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleOpenAnalytics(account.id)}>
                        View Analytics
                      </Button>
                    </div>
                  </div>
                </article>
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
          <DialogContent className="max-h-[90svh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle>{editingAccount ? "Edit Account" : "Add Account"}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Account Name</Label>
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
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Broker</Label>
                  <Select value={form.broker} onValueChange={(value) => {
                    setForm((current) => ({ ...current, broker: value }));
                    setFormError("");
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_BROKERS.map((broker) => (
                        <SelectItem key={broker} value={broker}>
                          {broker}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Account Type</Label>
                  <Select value={form.type} onValueChange={(value) => {
                    setForm((current) => ({ ...current, type: value as AccountType }));
                    setFormError("");
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Balance</Label>
                  <Input
                    type="number"
                    step="any"
                    value={form.balance}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, balance: event.target.value }));
                      setFormError("");
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Currency</Label>
                  <Input
                    maxLength={ACCOUNT_CURRENCY_MAX_LENGTH}
                    value={form.currency}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }));
                      setFormError("");
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    {ACCOUNT_CURRENCY_MIN_LENGTH}-{ACCOUNT_CURRENCY_MAX_LENGTH} characters.
                  </p>
                </div>
              </div>
            </div>

            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

            <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button className="w-full sm:w-auto" onClick={handleSaveAccount} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editingAccount ? "Save Changes" : "Save Account"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteTarget} onOpenChange={(openState) => !openState && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Account</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget?.name
                  ? `Delete ${deleteTarget.name}? This only works when the account has no active trades.`
                  : "Delete this account?"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
