import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Bitcoin, FlaskConical, Landmark, Pencil, Plus, Trash2, Trophy, UserRound, Wallet } from "lucide-react";
import { AccountsSkeleton } from "@/components/skeletons/AccountsSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { PageErrorState } from "@/components/PageErrorState";
import { PageHeader, PageShell, SectionCard } from "@/components/PageShell";
import { StatCard } from "@/components/StatCard";
import { DataBadge } from "@/components/DataBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api/client";
import { createAccount, deleteAccount, listAccounts, updateAccount } from "@/lib/api/accounts";
import { getAnalyticsBreakdowns } from "@/lib/api/analytics";
import { setStoredAccountFilter } from "@/lib/account-filter";
import {
  ACCOUNT_CURRENCY_MAX_LENGTH,
  ACCOUNT_NAME_MAX_LENGTH,
  getAccountApiErrorMessage,
  validateAccountForm,
} from "@/lib/account-validation";
import { formatCurrencyDisplay, formatPercentageDisplay } from "@/lib/analytics-rendering";
import { getPageErrorState } from "@/lib/page-errors";
import { withMinimumDelay } from "@/lib/loading";
import { privateQueryKey } from "@/lib/react-query";
import type { Account, AccountType } from "@/lib/types";
import { ACCOUNT_BROKERS, ACCOUNT_TYPES } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  const [form, setForm] = useState<AccountFormState>(emptyForm);
  const [formError, setFormError] = useState("");

  const accountsQuery = useQuery({
    queryKey: privateQueryKey(user.id, "accounts"),
    queryFn: async () => {
      const response = await withMinimumDelay(() => listAccounts());
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

  if (accountsQuery.isLoading && !accountsQuery.data) {
    return <AccountsSkeleton />;
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
        <StatCard label="Combined Balance" value={formatCurrencyDisplay(totalBalance, { showPlus: false })} icon={Landmark} />
        <StatCard
          label="Total PnL"
          value={formatCurrencyDisplay(totalPnl)}
          tone={totalPnl > 0 ? "positive" : totalPnl < 0 ? "negative" : "default"}
          icon={Trophy}
        />
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No accounts created yet"
          description="Add an account to start tracking performance."
          action={(
            <Button onClick={openCreateModal}>
              <Plus className="h-4 w-4" />
              Create your first account
            </Button>
          )}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {accounts.map((account) => {
            const performance = accountPerformance[account.id];
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
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{account.broker}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditModal(account)}>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(account)}>
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
                      <p className="text-lg font-semibold text-foreground">{formatNumberSafe(performance?.trades)}</p>
                    </div>
                    <div className="surface-muted px-4 py-4">
                      <p className="text-label mb-2">PnL</p>
                      <p className={cn("font-mono-price numeric-safe max-w-full text-lg font-semibold", getProfitTone(performance?.profit ?? 0))}>
                        {formatCurrencyDisplay(performance?.profit ?? 0)}
                      </p>
                    </div>
                    <div className="surface-muted px-4 py-4">
                      <p className="text-label mb-2">Win Rate</p>
                      <p className="text-lg font-semibold text-foreground">{formatPercentageDisplay(performance?.winRate ?? 0)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(account.createdAt).toLocaleDateString("en-US")}
                    </p>
                    <div className="flex flex-wrap gap-2">
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

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveAccount} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editingAccount ? "Save Changes" : "Create Account"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(openState) => !openState && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone and may affect existing trade references.
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
    </PageShell>
  );
}

function formatNumberSafe(value: number | undefined) {
  return typeof value === "number" ? value.toLocaleString("en-US") : "0";
}
