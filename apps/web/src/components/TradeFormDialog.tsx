import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScreenshotUpload } from "./ScreenshotUpload";
import type { Account, Direction, Result, SetupDefinition, Trade, TradeEmotion, TradeSession } from "@/lib/types";
import { EMOTIONS, PAIRS, SESSIONS } from "@/lib/types";

type TradeFormValue = {
  date: string;
  accountId: string;
  pair: string;
  direction: Direction;
  entry: string;
  stopLoss: string;
  takeProfit: string;
  profit: string;
  result: Result;
  setupId: string;
  session: TradeSession | "";
  emotion: TradeEmotion | "";
  notes: string;
};

interface TradeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (trade: {
    date: string;
    accountId: string;
    pair: string;
    direction: Direction;
    entry: number;
    stopLoss: number;
    takeProfit: number;
    profit: number;
    result: Result;
    setupId?: string | null;
    setup?: string | null;
    session?: TradeSession | null;
    emotion?: TradeEmotion | null;
    notes: string;
  }) => Promise<void> | void;
  editTrade?: Trade | null;
  accounts: Account[];
  setups: SetupDefinition[];
  isSaving?: boolean;
  onScreenshotsChange?: (trade: Trade) => void;
}

function buildEmptyForm(accounts: Account[]): TradeFormValue {
  return {
    date: new Date().toISOString().split("T")[0],
    accountId: accounts[0]?.id ?? "",
    pair: "XAUUSD",
    direction: "Buy",
    entry: "",
    stopLoss: "",
    takeProfit: "",
    profit: "",
    result: "Win",
    setupId: "__none",
    session: "London",
    emotion: "Calm",
    notes: "",
  };
}

export function TradeFormDialog({
  open,
  onOpenChange,
  onSave,
  editTrade,
  accounts,
  setups,
  isSaving = false,
  onScreenshotsChange,
}: TradeFormDialogProps) {
  const [form, setForm] = useState<TradeFormValue>(() => buildEmptyForm(accounts));

  const availableSetupOptions = useMemo(() => {
    const baseOptions = setups.map((setup) => ({
      value: setup.id,
      label: setup.name,
    }));

    if (editTrade?.setup && editTrade.setupId && !setups.some((setup) => setup.id === editTrade.setupId)) {
      return [{ value: editTrade.setupId, label: `${editTrade.setup} (archived)` }, ...baseOptions];
    }

    return baseOptions;
  }, [editTrade?.setup, editTrade?.setupId, setups]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (editTrade) {
      setForm({
        date: editTrade.date,
        accountId: editTrade.accountId,
        pair: editTrade.pair,
        direction: editTrade.direction,
        entry: String(editTrade.entry),
        stopLoss: String(editTrade.stopLoss),
        takeProfit: String(editTrade.takeProfit),
        profit: String(editTrade.profit),
        result: editTrade.result,
        setupId: editTrade.setupId ?? "__none",
        session: editTrade.session ?? "",
        emotion: editTrade.emotion ?? "",
        notes: editTrade.notes,
      });
      return;
    }

    setForm(buildEmptyForm(accounts));
  }, [accounts, editTrade, open]);

  const handleSave = async () => {
    if (!form.accountId) {
      return;
    }

    const selectedSetup = setups.find((setup) => setup.id === form.setupId);

    await onSave({
      date: form.date,
      accountId: form.accountId,
      pair: form.pair,
      direction: form.direction,
      entry: Number.parseFloat(form.entry) || 0,
      stopLoss: Number.parseFloat(form.stopLoss) || 0,
      takeProfit: Number.parseFloat(form.takeProfit) || 0,
      profit: Number.parseFloat(form.profit) || 0,
      result: form.result,
      setupId: form.setupId === "__none" ? null : form.setupId,
      setup: selectedSetup?.name ?? null,
      session: form.session || null,
      emotion: form.emotion || null,
      notes: form.notes.trim(),
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto rounded-2xl p-4 sm:w-[calc(100vw-2rem)] sm:p-6">
        <DialogHeader>
          <DialogTitle>{editTrade ? "Edit Trade" : "New Trade"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Account</Label>
            <Select value={form.accountId} onValueChange={(value) => setForm((current) => ({ ...current, accountId: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {accounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {accounts.length === 0 ? <p className="text-xs text-muted-foreground">Create an account before saving trades.</p> : null}
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Date</Label>
            <Input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Pair</Label>
            <Select value={form.pair} onValueChange={(value) => setForm((current) => ({ ...current, pair: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAIRS.map((pair) => <SelectItem key={pair} value={pair}>{pair}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Direction</Label>
            <Select value={form.direction} onValueChange={(value) => setForm((current) => ({ ...current, direction: value as Direction }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Buy">Buy</SelectItem>
                <SelectItem value="Sell">Sell</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Result</Label>
            <Select value={form.result} onValueChange={(value) => setForm((current) => ({ ...current, result: value as Result }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Win">Win</SelectItem>
                <SelectItem value="Loss">Loss</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Entry</Label>
            <Input type="number" step="any" value={form.entry} onChange={(event) => setForm((current) => ({ ...current, entry: event.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Stop Loss</Label>
            <Input type="number" step="any" value={form.stopLoss} onChange={(event) => setForm((current) => ({ ...current, stopLoss: event.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Take Profit</Label>
            <Input type="number" step="any" value={form.takeProfit} onChange={(event) => setForm((current) => ({ ...current, takeProfit: event.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Profit ($)</Label>
            <Input type="number" step="any" value={form.profit} onChange={(event) => setForm((current) => ({ ...current, profit: event.target.value }))} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Setup</Label>
            <Select value={form.setupId} onValueChange={(value) => setForm((current) => ({ ...current, setupId: value }))}>
              <SelectTrigger><SelectValue placeholder="Select setup..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">No setup</SelectItem>
                {availableSetupOptions.map((setup) => <SelectItem key={setup.value} value={setup.value}>{setup.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Session</Label>
            <Select value={form.session || "__none"} onValueChange={(value) => setForm((current) => ({ ...current, session: value === "__none" ? "" : value as TradeSession }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Not set</SelectItem>
                {SESSIONS.map((session) => <SelectItem key={session} value={session}>{session}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Emotion</Label>
            <Select value={form.emotion || "__none"} onValueChange={(value) => setForm((current) => ({ ...current, emotion: value === "__none" ? "" : value as TradeEmotion }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Not set</SelectItem>
                {EMOTIONS.map((emotion) => <SelectItem key={emotion} value={emotion}>{emotion}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Notes</Label>
            <Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={3} />
          </div>

          {editTrade ? (
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Screenshots</Label>
              <ScreenshotUpload
                tradeId={editTrade.id}
                screenshots={editTrade.screenshotAssets ?? []}
                onChange={(screenshots) => {
                  if (!onScreenshotsChange) {
                    return;
                  }

                  onScreenshotsChange({
                    ...editTrade,
                    screenshotAssets: screenshots,
                    screenshots: screenshots.map((screenshot) => screenshot.url),
                  });
                }}
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
          <Button className="w-full sm:w-auto" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} className="w-full sm:w-auto" disabled={isSaving || accounts.length === 0}>
            {isSaving ? "Saving..." : editTrade ? "Update Trade" : "Save Trade"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
