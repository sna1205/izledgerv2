import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Calculator,
  CircleDollarSign,
  Crosshair,
  DollarSign,
  Landmark,
  Layers3,
  Percent,
  Ruler,
  TriangleAlert,
} from "lucide-react";
import { PageShell, SectionCard } from "@/layouts/PageShell";
import { DataBadge } from "@/components/DataBadge";
import { InstrumentSelect } from "@/features/trades/components/InstrumentSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrencyDisplay, formatNumberDisplay } from "@/utils/analytics-rendering";
import { INSTRUMENTS_BY_VALUE } from "@/types";
import { cn } from "@/utils/class-names";

const QUICK_RISK_PRESETS = ["0.5", "1", "2"] as const;
const RISK_MODE_STORAGE_KEY = "lotCalc:riskMode";

type RiskMode = "percent" | "amount";
type FieldName = "accountBalance" | "riskPercent" | "riskAmount" | "entryPrice" | "stopLossPrice";

function parseNumericInput(value: string) {
  const parsed = Number.parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function sanitizeNumericInput(value: string) {
  const sanitized = value.replace(/[^\d.]/g, "");
  const [integerPart, ...fractionParts] = sanitized.split(".");
  return fractionParts.length > 0 ? `${integerPart}.${fractionParts.join("")}` : integerPart;
}

function formatSyncedValue(value: number, maximumFractionDigits: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0";
  }

  return value.toFixed(maximumFractionDigits).replace(/\.?0+$/, "");
}

function formatEditableNumber(value: string) {
  if (!value) {
    return "";
  }

  const sanitized = sanitizeNumericInput(value);

  if (!sanitized) {
    return "";
  }

  const [integerPart, fractionalPart] = sanitized.split(".");
  const formattedInteger = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number.parseInt(integerPart || "0", 10));

  if (fractionalPart === undefined) {
    return formattedInteger;
  }

  return `${formattedInteger}.${fractionalPart}`;
}

function ResultsMetricCard({
  icon: Icon,
  label,
  value,
  tone = "default",
  className,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  tone?: "default" | "primary" | "success";
  className?: string;
}) {
  return (
    <motion.div
      layout
      className={cn(
        "surface-muted px-4 py-4",
        tone === "primary" && "border-primary/20 bg-primary/5",
        tone === "success" && "border-success/20 bg-success/10",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-label mb-2">{label}</p>
          <p className="font-mono-price text-base font-medium text-foreground">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-background/60 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </motion.div>
  );
}

function PositionBreakdownCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Layers3;
  label: string;
  value: string;
}) {
  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      className="surface-muted px-4 py-4"
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-background/60 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-label mb-2">{label}</p>
      <p className="font-mono-price text-base font-medium text-foreground">{value}</p>
    </motion.div>
  );
}

function FieldShell({
  children,
  label,
  error,
}: {
  children: React.ReactNode;
  label: string;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-label">{label}</Label>
      {children}
      <div className="min-h-[1.25rem]">
        {error ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-danger/20 bg-danger/10 px-3 py-1 text-xs text-danger">
            <TriangleAlert className="h-3.5 w-3.5" />
            <span>{error}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function LotCalculator() {
  const [pair, setPair] = useState("XAUUSD");
  const [accountBalance, setAccountBalance] = useState("10000");
  const [riskMode, setRiskMode] = useState<RiskMode>("percent");
  const [riskPercent, setRiskPercent] = useState("1");
  const [riskAmountInput, setRiskAmountInput] = useState("100");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLossPrice, setStopLossPrice] = useState("");
  const [focusedField, setFocusedField] = useState<FieldName | null>(null);

  useEffect(() => {
    const storedRiskMode = window.localStorage.getItem(RISK_MODE_STORAGE_KEY);

    if (storedRiskMode === "percent" || storedRiskMode === "amount") {
      setRiskMode(storedRiskMode);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(RISK_MODE_STORAGE_KEY, riskMode);
  }, [riskMode]);

  useEffect(() => {
    if (riskMode !== "percent") {
      return;
    }

    const nextRiskAmount = parseNumericInput(accountBalance) * (parseNumericInput(riskPercent) / 100);
    setRiskAmountInput(formatSyncedValue(nextRiskAmount, 2));
  }, [accountBalance, riskMode, riskPercent]);

  useEffect(() => {
    if (riskMode !== "amount") {
      return;
    }

    const balance = parseNumericInput(accountBalance);
    const nextRiskPercent = balance > 0 ? (parseNumericInput(riskAmountInput) / balance) * 100 : 0;
    setRiskPercent(formatSyncedValue(nextRiskPercent, 4));
  }, [accountBalance, riskAmountInput, riskMode]);

  const balance = parseNumericInput(accountBalance);
  const riskPercentValue = parseNumericInput(riskPercent);
  const riskAmount = parseNumericInput(riskAmountInput);
  const entry = parseNumericInput(entryPrice);
  const sl = parseNumericInput(stopLossPrice);

  const slDistance = Math.abs(entry - sl);
  const pairInfo = {
    pipSize: INSTRUMENTS_BY_VALUE[pair]?.pipSize ?? 0.0001,
    pipValue: INSTRUMENTS_BY_VALUE[pair]?.pipValue ?? 10,
  };
  const pipsAtRisk = pairInfo.pipSize > 0 ? slDistance / pairInfo.pipSize : 0;
  const rawLotSize = pipsAtRisk > 0 && pairInfo.pipValue > 0
    ? riskAmount / (pipsAtRisk * pairInfo.pipValue)
    : 0;
  const projectedReward = riskAmount * 2;

  const fieldErrors = useMemo(() => {
    const errors: Partial<Record<FieldName, string>> = {};
    const riskField: FieldName = riskMode === "percent" ? "riskPercent" : "riskAmount";

    if (accountBalance && balance <= 0) {
      errors.accountBalance = "Balance must be greater than 0.";
    }

    if ((riskMode === "percent" && riskPercent) || (riskMode === "amount" && riskAmountInput)) {
      if (riskAmount <= 0) {
        errors[riskField] = "Risk must be greater than 0.";
      } else if (balance > 0 && riskAmount > balance) {
        errors[riskField] = riskMode === "percent"
          ? "Risk % cannot size more than your account balance."
          : "Risk amount must not exceed account balance.";
      }
    }

    if (entryPrice && entry <= 0) {
      errors.entryPrice = "Entry must be greater than 0.";
    }

    if (stopLossPrice && sl <= 0) {
      errors.stopLossPrice = "Stop loss must be greater than 0.";
    }

    if (entryPrice && stopLossPrice && entry === sl) {
      errors.stopLossPrice = "Entry and stop loss must be different.";
    }

    return errors;
  }, [accountBalance, balance, entry, entryPrice, riskAmount, riskAmountInput, riskMode, riskPercent, sl, stopLossPrice]);

  const canCalculate = balance > 0
    && riskAmount > 0
    && riskAmount <= balance
    && entry > 0
    && sl > 0
    && entry !== sl
    && slDistance > 0
    && pipsAtRisk > 0;

  const lotSize = canCalculate ? rawLotSize : 0;
  const displayPipsAtRisk = canCalculate ? pipsAtRisk : 0;
  const displayRiskAmount = balance > 0 && riskAmount > 0 ? riskAmount : 0;

  const formattedFieldValue = (field: FieldName, value: string) => (
    focusedField === field ? value : formatEditableNumber(value)
  );

  return (
    <PageShell size="wide">
      <div className="grid gap-4 pt-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <motion.div
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="order-1"
        >
          <SectionCard className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Lot Calculator
              </h1>
              <div className="hidden rounded-2xl border border-primary/20 bg-primary/10 p-3 text-primary sm:flex">
                <Calculator className="h-5 w-5" />
              </div>
            </div>

            <div className="space-y-6 px-4 py-4">
              <section className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FieldShell label="Pair">
                    <InstrumentSelect value={pair} onChange={setPair} ariaLabel="Pair" />
                  </FieldShell>

                  <FieldShell label="Balance" error={fieldErrors.accountBalance}>
                    <Input
                      aria-label="Balance"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={formattedFieldValue("accountBalance", accountBalance)}
                      onFocus={() => setFocusedField("accountBalance")}
                      onBlur={() => setFocusedField((current) => (current === "accountBalance" ? null : current))}
                      onChange={(event) => setAccountBalance(sanitizeNumericInput(event.target.value))}
                      className={cn(
                        "h-10",
                        fieldErrors.accountBalance && "border-danger/40 bg-danger/10 ring-2 ring-danger/10",
                      )}
                    />
                  </FieldShell>
                </div>
              </section>

              <section className="space-y-4">
                <div className="surface-muted space-y-3 p-4">
                  <div className="relative inline-flex w-full rounded-2xl border border-border bg-background p-1 sm:w-auto">
                    <motion.div
                      layout
                      layoutId="lot-risk-mode-pill"
                      className={cn(
                        "absolute bottom-1 top-1 rounded-2xl bg-primary shadow-sm",
                        riskMode === "percent" ? "left-1 right-[calc(50%+0.125rem)]" : "left-[calc(50%+0.125rem)] right-1",
                      )}
                      transition={{ type: "spring", stiffness: 360, damping: 32 }}
                    />
                    <button
                      type="button"
                      aria-pressed={riskMode === "percent"}
                      onClick={() => setRiskMode("percent")}
                      className={cn(
                        "relative z-10 flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition-colors sm:min-w-[140px]",
                        riskMode === "percent" ? "text-primary-foreground" : "text-muted-foreground",
                      )}
                    >
                      <Percent className="h-4 w-4" />
                      <span>Risk %</span>
                    </button>
                    <button
                      type="button"
                      aria-pressed={riskMode === "amount"}
                      onClick={() => setRiskMode("amount")}
                      className={cn(
                        "relative z-10 flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition-colors sm:min-w-[140px]",
                        riskMode === "amount" ? "text-primary-foreground" : "text-muted-foreground",
                      )}
                    >
                      <DollarSign className="h-4 w-4" />
                      <span>Fixed $</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_RISK_PRESETS.map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRiskMode("percent");
                          setRiskPercent(preset);
                        }}
                        className="rounded-full border-border/70 bg-background/72 px-3.5 hover:-translate-y-0.5"
                      >
                        {preset}%
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FieldShell
                    label="Risk (%)"
                    error={riskMode === "percent" ? fieldErrors.riskPercent : undefined}
                  >
                    <Input
                      aria-label="Risk Percent"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      disabled={riskMode !== "percent"}
                      value={riskPercent}
                      onChange={(event) => setRiskPercent(sanitizeNumericInput(event.target.value))}
                      className={cn(
                        "h-10",
                        riskMode === "percent" && "border-primary/40 bg-primary/10 ring-2 ring-primary/15",
                        riskMode !== "percent" && "cursor-not-allowed opacity-60",
                        riskMode === "percent" && fieldErrors.riskPercent && "border-danger/40 bg-danger/10 ring-danger/10",
                      )}
                    />
                  </FieldShell>

                  <FieldShell
                    label="Risk Amount ($)"
                    error={riskMode === "amount" ? fieldErrors.riskAmount : undefined}
                  >
                    <Input
                      aria-label="Risk Amount"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      disabled={riskMode !== "amount"}
                      value={formattedFieldValue("riskAmount", riskAmountInput)}
                      onFocus={() => setFocusedField("riskAmount")}
                      onBlur={() => setFocusedField((current) => (current === "riskAmount" ? null : current))}
                      onChange={(event) => setRiskAmountInput(sanitizeNumericInput(event.target.value))}
                      className={cn(
                        "font-mono-price h-10",
                        riskMode === "amount" && "border-primary/40 bg-primary/10 ring-2 ring-primary/15",
                        riskMode !== "amount" && "cursor-not-allowed opacity-60",
                        riskMode === "amount" && fieldErrors.riskAmount && "border-danger/40 bg-danger/10 ring-danger/10",
                      )}
                    />
                  </FieldShell>
                </div>
              </section>

              <section className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FieldShell label="Entry" error={fieldErrors.entryPrice}>
                    <Input
                      aria-label="Entry"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={formattedFieldValue("entryPrice", entryPrice)}
                      onFocus={() => setFocusedField("entryPrice")}
                      onBlur={() => setFocusedField((current) => (current === "entryPrice" ? null : current))}
                      onChange={(event) => setEntryPrice(sanitizeNumericInput(event.target.value))}
                      className={cn(
                        "h-10",
                        fieldErrors.entryPrice && "border-danger/40 bg-danger/10 ring-2 ring-danger/10",
                      )}
                    />
                  </FieldShell>

                  <FieldShell label="SL" error={fieldErrors.stopLossPrice}>
                    <Input
                      aria-label="SL"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={formattedFieldValue("stopLossPrice", stopLossPrice)}
                      onFocus={() => setFocusedField("stopLossPrice")}
                      onBlur={() => setFocusedField((current) => (current === "stopLossPrice" ? null : current))}
                      onChange={(event) => setStopLossPrice(sanitizeNumericInput(event.target.value))}
                      className={cn(
                        "h-10",
                        fieldErrors.stopLossPrice && "border-danger/40 bg-danger/10 ring-2 ring-danger/10",
                      )}
                    />
                  </FieldShell>
                </div>
              </section>
            </div>
          </SectionCard>
        </motion.div>

        <motion.div
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: 0.04, ease: [0.22, 1, 0.36, 1] }}
          className="order-2"
        >
          <SectionCard className="sticky top-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-medium text-foreground">Lot Size</h2>
                  <DataBadge tone="primary">{pair}</DataBadge>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <Crosshair className="h-5 w-5" />
                </div>
              </div>

              <motion.div
                layout
                className="surface-muted border-primary/20 bg-primary/5 px-4 py-4"
              >
                <p className="text-label mb-3">Lot Size</p>
                <div className="flex flex-wrap items-end gap-3">
                  <p
                    data-testid="lot-size-value"
                    className="font-mono-price text-2xl font-semibold text-foreground"
                  >
                    {lotSize.toFixed(2)}
                  </p>
                  <span className="pb-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Lots</span>
                </div>
              </motion.div>

              <div className="grid gap-3 sm:grid-cols-2">
                <ResultsMetricCard
                  icon={CircleDollarSign}
                  label="Risk Amount"
                  value={formatCurrencyDisplay(displayRiskAmount, { showPlus: false })}
                  tone="primary"
                />
                <ResultsMetricCard
                  icon={Ruler}
                  label="SL Distance"
                  value={`${formatNumberDisplay(displayPipsAtRisk, { minimumFractionDigits: 1 })} pips`}
                />
              </div>

              <div className="surface-muted p-4">
                <div className="mb-4 flex items-center gap-2">
                  <Layers3 className="h-4 w-4 text-muted-foreground" />
                  <p className="text-label">Position Breakdown</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <PositionBreakdownCard icon={Layers3} label="Mini Lots" value={(lotSize * 10).toFixed(1)} />
                  <PositionBreakdownCard icon={Landmark} label="Micro Lots" value={(lotSize * 100).toFixed(0)} />
                  <PositionBreakdownCard icon={CircleDollarSign} label="Units" value={formatNumberDisplay(lotSize * 100000)} />
                </div>
              </div>
            </div>
          </SectionCard>
        </motion.div>
      </div>
    </PageShell>
  );
}
