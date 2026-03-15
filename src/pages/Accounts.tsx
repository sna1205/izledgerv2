import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Bitcoin, FlaskConical, Landmark, Pencil, Plus, Trophy, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { computeStats } from "@/lib/analytics";
import { setStoredAccountFilter } from "@/lib/account-filter";
import { addAccount, getAccounts, updateAccount } from "@/lib/accounts";
import { getTrades } from "@/lib/trades";
import { ACCOUNT_BROKERS, ACCOUNT_TYPES, Account, AccountType } from "@/lib/types";

const summaryCardClass = "rounded-xl border bg-card p-5 shadow-sm";
const accountCardClass =
  "group rounded-xl border bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-muted/20 hover:shadow-md";
const chartColors = {
  positive: "#10b981",
  negative: "#f43f5e",
  neutral: "#94a3b8",
};

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

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
    return `${currency || "USD"} ${usdFormatter.format(balance).replace("$", "")}`;
  }
}

function formatPnl(value: number) {
  if (value > 0) return `+${usdFormatter.format(value)}`;
  if (value < 0) return `-${usdFormatter.format(Math.abs(value))}`;
  return usdFormatter.format(0);
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
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>(() => getAccounts());
  const [trades] = useState(() => getTrades());
  const [open, setOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [form, setForm] = useState<AccountFormState>(emptyForm);

  const totalBalance = useMemo(
    () => accounts.reduce((sum, account) => sum + account.balance, 0),
    [accounts],
  );

  const totalPnl = useMemo(
    () => trades.reduce((sum, trade) => sum + trade.profit, 0),
    [trades],
  );

  const accountSnapshots = useMemo(
    () =>
      accounts.map((account, index) => {
        const accountTrades = trades.filter((trade) => trade.accountId === account.id);
        const stats = computeStats(accountTrades);
        const chronologicalTrades = [...accountTrades].sort((a, b) => {
          if (a.date !== b.date) {
            return a.date.localeCompare(b.date);
          }

          return (a.createdAt || a.date).localeCompare(b.createdAt || b.date);
        });

        let equity = 0;
        const equityCurve = chronologicalTrades.map((trade, pointIndex) => {
          equity += trade.profit;

          return {
            point: pointIndex + 1,
            equity: Number(equity.toFixed(2)),
          };
        });

        return {
          account,
          isDefault: index === 0,
          stats,
          tradeCount: accountTrades.length,
          pnl: stats.totalProfit,
          winRate: stats.winRate,
          equityCurve,
          curveTone:
            stats.totalProfit > 0
              ? chartColors.positive
              : stats.totalProfit < 0
                ? chartColors.negative
                : chartColors.neutral,
        };
      }),
    [accounts, trades],
  );

  const openCreateModal = () => {
    setEditingAccount(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setForm(toFormState(account));
    setOpen(true);
  };

  const handleSave = () => {
    const payload = {
      name: form.name.trim() || "Untitled Account",
      broker: form.broker || "Manual",
      type: form.type,
      balance: parseFloat(form.balance) || 0,
      currency: form.currency.trim().toUpperCase() || "USD",
    };

    if (editingAccount) {
      const updated: Account = {
        ...editingAccount,
        ...payload,
      };

      updateAccount(updated);
      setAccounts((current) => current.map((account) => (account.id === updated.id ? updated : account)));
      toast.success("Account updated successfully.");
    } else {
      const next = addAccount(payload);
      setAccounts((current) => [...current, next]);
      toast.success("Account created successfully.");
    }

    setForm(emptyForm);
    setEditingAccount(null);
    setOpen(false);
  };

  const handleOpenDashboard = (accountId: string) => {
    setStoredAccountFilter(accountId);
    navigate("/dashboard");
  };

  const handleOpenAnalytics = (accountId: string) => {
    setStoredAccountFilter(accountId);
    navigate("/analytics");
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto w-full max-w-[1440px]">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Accounts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track each account like its own trading business with profit, win rate, and equity context.
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
          <p
            className={`mt-3 text-3xl font-semibold ${
              totalPnl > 0 ? "text-emerald-600" : totalPnl < 0 ? "text-rose-600" : "text-foreground"
            }`}
          >
            {formatPnl(totalPnl)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {accountSnapshots.map(({ account, isDefault, stats, tradeCount, pnl, winRate, equityCurve, curveTone }) => {
          const iconData = getAccountIcon(account.type);
          const Icon = iconData.icon;

          return (
            <article
              key={account.id}
              className={accountCardClass}
              onClick={() => handleOpenDashboard(account.id)}
            >
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconData.className}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-foreground">{account.name}</h2>
                      {isDefault && (
                        <span className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {account.type} • {account.broker}
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full shrink-0 sm:w-auto"
                  onClick={(event) => {
                    event.stopPropagation();
                    openEditModal(account);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </div>

              <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border bg-background/70 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Balance</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{formatBalance(account.balance, account.currency)}</p>
                </div>
                <div className="rounded-xl border bg-background/70 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Trades</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{tradeCount}</p>
                </div>
                <div className="rounded-xl border bg-background/70 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">PnL</p>
                  <p className={`mt-2 text-lg font-semibold ${pnl > 0 ? "text-emerald-600" : pnl < 0 ? "text-rose-600" : "text-foreground"}`}>
                    {formatPnl(pnl)}
                  </p>
                </div>
                <div className="rounded-xl border bg-background/70 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Win Rate</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{winRate.toFixed(1)}%</p>
                </div>
              </div>

              <div className="mb-5 rounded-xl border bg-background/70 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Equity Curve</p>
                    <p className="text-xs text-muted-foreground">
                      {tradeCount > 0 ? `Net ${formatPnl(stats.totalProfit)} across ${tradeCount} trades` : "No trades logged yet"}
                    </p>
                  </div>
                </div>
                <div className="h-20">
                  {equityCurve.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={equityCurve} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                        <defs>
                          <linearGradient id={`account-curve-${account.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={curveTone} stopOpacity={0.28} />
                            <stop offset="100%" stopColor={curveTone} stopOpacity={0.03} />
                          </linearGradient>
                        </defs>
                        <Area
                          dataKey="equity"
                          fill={`url(#account-curve-${account.id})`}
                          fillOpacity={1}
                          isAnimationActive={false}
                          stroke={curveTone}
                          strokeWidth={2}
                          type="monotone"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                      Start logging trades to build this curve.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Created {new Date(account.createdAt).toLocaleDateString("en-US")}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleOpenDashboard(account.id);
                    }}
                  >
                    View Overview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleOpenAnalytics(account.id);
                    }}
                  >
                    View Analytics
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            setEditingAccount(null);
            setForm(emptyForm);
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
                placeholder="FTMO 100K"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Broker</Label>
                <Select value={form.broker} onValueChange={(value) => setForm((current) => ({ ...current, broker: value }))}>
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
                <Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value as AccountType }))}>
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
                  placeholder="100000"
                  value={form.balance}
                  onChange={(event) => setForm((current) => ({ ...current, balance: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Currency</Label>
                <Input
                  placeholder="USD"
                  maxLength={8}
                  value={form.currency}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button className="w-full sm:w-auto" onClick={handleSave}>{editingAccount ? "Save Changes" : "Save Account"}</Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
