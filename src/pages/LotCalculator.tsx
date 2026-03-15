import { useState } from "react";
import { Calculator } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PAIRS } from "@/lib/types";

const PIP_VALUES: Record<string, { pipSize: number; pipValue: number }> = {
  // Forex majors (per standard lot, USD account)
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
  // Gold
  XAUUSD: { pipSize: 0.1, pipValue: 10 },
  // Crypto
  BTCUSD: { pipSize: 1, pipValue: 1 },
  ETHUSD: { pipSize: 0.1, pipValue: 1 },
  // Indices
  NAS100: { pipSize: 0.1, pipValue: 1 },
  US30: { pipSize: 1, pipValue: 1 },
  SPX500: { pipSize: 0.1, pipValue: 1 },
};

export default function LotCalculator() {
  const [pair, setPair] = useState("XAUUSD");
  const [accountBalance, setAccountBalance] = useState("10000");
  const [riskPercent, setRiskPercent] = useState("1");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLossPrice, setStopLossPrice] = useState("");

  const balance = parseFloat(accountBalance) || 0;
  const risk = parseFloat(riskPercent) || 0;
  const entry = parseFloat(entryPrice) || 0;
  const sl = parseFloat(stopLossPrice) || 0;

  const riskAmount = balance * (risk / 100);
  const slDistance = Math.abs(entry - sl);

  const pairInfo = PIP_VALUES[pair] || { pipSize: 0.0001, pipValue: 10 };
  const pipsAtRisk = pairInfo.pipSize > 0 ? slDistance / pairInfo.pipSize : 0;
  const lotSize = pipsAtRisk > 0 && pairInfo.pipValue > 0
    ? riskAmount / (pipsAtRisk * pairInfo.pipValue)
    : 0;

  const canCalculate = entry > 0 && sl > 0 && entry !== sl && balance > 0 && risk > 0;

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
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAIRS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Account Balance ($)</Label>
            <Input type="number" step="any" value={accountBalance} onChange={e => setAccountBalance(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Risk (%)</Label>
            <Input type="number" step="0.1" min="0" max="100" value={riskPercent} onChange={e => setRiskPercent(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Risk Amount ($)</Label>
            <div className="flex h-10 items-center rounded-md border bg-muted/50 px-3 text-sm font-mono">
              {riskAmount.toFixed(2)}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Entry Price</Label>
            <Input type="number" step="any" placeholder="0.00" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Stop Loss Price</Label>
            <Input type="number" step="any" placeholder="0.00" value={stopLossPrice} onChange={e => setStopLossPrice(e.target.value)} />
          </div>
        </div>

        {canCalculate && (
          <div className="border-t pt-4 mt-2 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">SL Distance</span>
              <span className="text-sm font-mono">{pipsAtRisk.toFixed(1)} pips</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Recommended Lot Size</span>
              <span className="text-xl font-semibold text-foreground font-mono">{lotSize.toFixed(2)}</span>
            </div>
            <div className="grid gap-3 pt-1 sm:grid-cols-3">
              {[
                ["Mini Lots", (lotSize * 10).toFixed(1)],
                ["Micro Lots", (lotSize * 100).toFixed(0)],
                ["Units", (lotSize * 100000).toFixed(0)],
              ].map(([label, val]) => (
                <div key={String(label)} className="text-center border rounded-md py-2">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="text-sm font-mono font-medium">{val}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
