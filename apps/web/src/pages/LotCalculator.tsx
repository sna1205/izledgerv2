import { useEffect, useState } from "react";
import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAIRS } from "@/lib/types";
import { cn } from "@/lib/utils";

const PIP_VALUES: Record<string, { pipSize: number; pipValue: number }> = {
  EURUSD: { pipSize: 0.0001, pipValue: 10 },
  GBPUSD: { pipSize: 0.0001, pipValue: 10 },
  AUDUSD: { pipSize: 0.0001, pipValue: 10 },
  NZDUSD: { pipSize: 0.0001, pipValue: 10 },
  USDCAD: { pipSize: 0.0001, pipValue: 10 },
  USDCHF: { pipSize: 0.0001, pipValue: 10 },
  USDJPY: { pipSize: 0.01, pipValue: 10 },
  GBPJPY: { pipSize: 0.01, pipValue: 10 },
  EURJPY: { pipSize: 0.01, pipValue: 10 },
  EURGBP: { pipSize: 0.0001, pipValue: 10 },
  XAUUSD: { pipSize: 0.1, pipValue: 10 },
  BTCUSD: { pipSize: 1, pipValue: 1 },
  ETHUSD: { pipSize: 0.1, pipValue: 1 },
  NAS100: { pipSize: 0.1, pipValue: 1 },
  US30: { pipSize: 1, pipValue: 1 },
  SPX500: { pipSize: 0.1, pipValue: 1 },
};

type RiskMode = "percent" | "amount";

const RISK_MODE_STORAGE_KEY = "lotCalc:riskMode";

function parseNumericInput(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatSyncedValue(value: number, maximumFractionDigits: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0";
  }

  return value.toFixed(maximumFractionDigits).replace(/\.?0+$/, "");
}

export default function LotCalculator() {
  const [pair, setPair] = useState("XAUUSD");
  const [accountBalance, setAccountBalance] = useState("10000");
  const [riskMode, setRiskMode] = useState<RiskMode>("percent");
  const [riskPercent, setRiskPercent] = useState("1");
  const [riskAmountInput, setRiskAmountInput] = useState("100");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLossPrice, setStopLossPrice] = useState("");

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
  const riskAmount = parseNumericInput(riskAmountInput);
  const entry = parseNumericInput(entryPrice);
  const sl = parseNumericInput(stopLossPrice);

  const slDistance = Math.abs(entry - sl);
  const pairInfo = PIP_VALUES[pair] || { pipSize: 0.0001, pipValue: 10 };
  const pipsAtRisk = pairInfo.pipSize > 0 ? slDistance / pairInfo.pipSize : 0;
  const rawLotSize = pipsAtRisk > 0 && pairInfo.pipValue > 0
    ? riskAmount / (pipsAtRisk * pairInfo.pipValue)
    : 0;

  let validationMessage = "";

  if (balance <= 0) {
    validationMessage = "Enter an account balance greater than 0.";
  } else if (riskAmount <= 0) {
    validationMessage = "Enter a risk value greater than 0.";
  } else if (riskAmount > balance) {
    validationMessage = "Risk amount cannot be greater than the account balance.";
  } else if (entry <= 0 || sl <= 0) {
    validationMessage = "Enter both entry and stop loss prices to calculate lot size.";
  } else if (entry === sl) {
    validationMessage = "Entry and stop loss must be different.";
  } else if (slDistance <= 0 || pipsAtRisk <= 0) {
    validationMessage = "SL distance must be greater than 0.";
  }

  const canCalculate = validationMessage.length === 0;
  const lotSize = canCalculate ? rawLotSize : 0;
  const displayPipsAtRisk = canCalculate ? pipsAtRisk : 0;

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6 flex items-center gap-2">
          <Calculator className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Lot Calculator</h1>
        </div>

        <div className="space-y-4 rounded-lg border p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Pair</Label>
              <Select value={pair} onValueChange={setPair}>
                <SelectTrigger aria-label="Pair">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAIRS.map((currentPair) => <SelectItem key={currentPair} value={currentPair}>{currentPair}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Account Balance ($)</Label>
              <Input
                aria-label="Account Balance"
                type="number"
                step="any"
                min="0"
                value={accountBalance}
                onChange={(event) => setAccountBalance(event.target.value)}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Risk Mode</Label>
              <div className="inline-flex rounded-2xl border border-border/80 bg-background/70 p-1 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03)] dark:bg-white/[0.03]">
                <Button
                  type="button"
                  size="sm"
                  variant={riskMode === "percent" ? "default" : "ghost"}
                  aria-pressed={riskMode === "percent"}
                  onClick={() => setRiskMode("percent")}
                  className={cn("min-w-[96px] rounded-xl", riskMode !== "percent" && "shadow-none")}
                >
                  Risk %
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={riskMode === "amount" ? "default" : "ghost"}
                  aria-pressed={riskMode === "amount"}
                  onClick={() => setRiskMode("amount")}
                  className={cn("min-w-[96px] rounded-xl", riskMode !== "amount" && "shadow-none")}
                >
                  Risk $
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Risk (%)</Label>
              <Input
                aria-label="Risk Percent"
                type="number"
                step="0.1"
                min="0"
                max="100"
                disabled={riskMode !== "percent"}
                value={riskPercent}
                onChange={(event) => setRiskPercent(event.target.value)}
                className={cn(
                  riskMode === "percent" && "border-primary/70 bg-primary/5 ring-2 ring-primary/20",
                  riskMode !== "percent" && "cursor-not-allowed opacity-60",
                )}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Risk Amount ($)</Label>
              <Input
                aria-label="Risk Amount"
                type="number"
                step="0.01"
                min="0"
                disabled={riskMode !== "amount"}
                value={riskAmountInput}
                onChange={(event) => setRiskAmountInput(event.target.value)}
                className={cn(
                  "font-mono",
                  riskMode === "amount" && "border-primary/70 bg-primary/5 ring-2 ring-primary/20",
                  riskMode !== "amount" && "cursor-not-allowed opacity-60",
                )}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Entry Price</Label>
              <Input
                aria-label="Entry Price"
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={entryPrice}
                onChange={(event) => setEntryPrice(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Stop Loss Price</Label>
              <Input
                aria-label="Stop Loss Price"
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={stopLossPrice}
                onChange={(event) => setStopLossPrice(event.target.value)}
              />
            </div>
          </div>

          <div className="mt-2 space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">SL Distance</span>
              <span className="text-sm font-mono">{displayPipsAtRisk.toFixed(1)} pips</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Recommended Lot Size</span>
              <span className="font-mono text-xl font-semibold text-foreground">{lotSize.toFixed(2)}</span>
            </div>
            <div className="grid gap-3 pt-1 sm:grid-cols-3">
              {[
                ["Mini Lots", (lotSize * 10).toFixed(1)],
                ["Micro Lots", (lotSize * 100).toFixed(0)],
                ["Units", (lotSize * 100000).toFixed(0)],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-md border py-2 text-center">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="font-mono text-sm font-medium">{value}</div>
                </div>
              ))}
            </div>
            <p
              className={cn(
                "min-h-5 text-sm transition-colors",
                canCalculate ? "text-muted-foreground" : "text-danger",
              )}
            >
              {canCalculate ? "Lot size updates instantly based on your selected risk mode." : validationMessage}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
