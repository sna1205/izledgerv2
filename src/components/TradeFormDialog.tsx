import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScreenshotUpload } from "./ScreenshotUpload";
import { getAccounts, getDefaultAccountId } from "@/lib/accounts";
import { getSetups } from "@/lib/setups";
import { Trade, Direction, Result, PAIRS, SESSIONS, EMOTIONS, type TradeEmotion, type TradeSession } from "@/lib/types";
import { generateId } from "@/lib/trades";

interface TradeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (trade: Trade) => void;
  editTrade?: Trade | null;
}

export function TradeFormDialog({ open, onOpenChange, onSave, editTrade }: TradeFormDialogProps) {
  const [accounts, setAccounts] = useState(() => getAccounts());
  const [setups, setSetups] = useState(() => getSetups());
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    accountId: getDefaultAccountId(),
    pair: 'XAUUSD',
    direction: 'Buy' as Direction,
    entry: '',
    stopLoss: '',
    takeProfit: '',
    profit: '',
    result: 'Win' as Result,
    setup: '',
    session: 'London' as TradeSession,
    emotion: 'Calm' as TradeEmotion,
    notes: '',
    screenshots: [] as string[],
  });

  useEffect(() => {
    if (open) {
      setAccounts(getAccounts());
      setSetups(getSetups());
    }

    if (editTrade) {
      setForm({
        date: editTrade.date,
        accountId: editTrade.accountId || getDefaultAccountId(),
        pair: editTrade.pair,
        direction: editTrade.direction,
        entry: String(editTrade.entry),
        stopLoss: String(editTrade.stopLoss),
        takeProfit: String(editTrade.takeProfit),
        profit: String(editTrade.profit),
        result: editTrade.result,
        setup: editTrade.setup,
        session: editTrade.session || 'London',
        emotion: editTrade.emotion || 'Calm',
        notes: editTrade.notes,
        screenshots: editTrade.screenshots,
      });
    } else {
      setForm({
        date: new Date().toISOString().split('T')[0],
        accountId: getDefaultAccountId(),
        pair: 'XAUUSD',
        direction: 'Buy',
        entry: '',
        stopLoss: '',
        takeProfit: '',
        profit: '',
        result: 'Win',
        setup: '',
        session: 'London',
        emotion: 'Calm',
        notes: '',
        screenshots: [],
      });
    }
  }, [editTrade, open]);

  const handleSave = () => {
    const trade: Trade = {
      id: editTrade?.id || generateId(),
      date: form.date,
      accountId: form.accountId,
      pair: form.pair,
      direction: form.direction,
      entry: parseFloat(form.entry) || 0,
      stopLoss: parseFloat(form.stopLoss) || 0,
      takeProfit: parseFloat(form.takeProfit) || 0,
      profit: parseFloat(form.profit) || 0,
      result: form.result,
      setup: form.setup,
      session: form.session,
      emotion: form.emotion,
      notes: form.notes,
      screenshots: form.screenshots,
      createdAt: editTrade?.createdAt || new Date().toISOString(),
    };
    onSave(trade);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto rounded-2xl p-4 sm:w-[calc(100vw-2rem)] sm:p-6">
        <DialogHeader>
          <DialogTitle>{editTrade ? 'Edit Trade' : 'New Trade'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Account</Label>
            <Select value={form.accountId} onValueChange={v => setForm({ ...form, accountId: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {accounts.map(account => <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Date</Label>
            <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Pair</Label>
            <Select value={form.pair} onValueChange={v => setForm({ ...form, pair: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAIRS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Direction</Label>
            <Select value={form.direction} onValueChange={v => setForm({ ...form, direction: v as Direction })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Buy">Buy</SelectItem>
                <SelectItem value="Sell">Sell</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Result</Label>
            <Select value={form.result} onValueChange={v => setForm({ ...form, result: v as Result })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Win">Win</SelectItem>
                <SelectItem value="Loss">Loss</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Entry</Label>
            <Input type="number" step="any" placeholder="0.00" value={form.entry} onChange={e => setForm({ ...form, entry: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Stop Loss</Label>
            <Input type="number" step="any" placeholder="0.00" value={form.stopLoss} onChange={e => setForm({ ...form, stopLoss: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Take Profit</Label>
            <Input type="number" step="any" placeholder="0.00" value={form.takeProfit} onChange={e => setForm({ ...form, takeProfit: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Profit ($)</Label>
            <Input type="number" step="any" placeholder="0.00" value={form.profit} onChange={e => setForm({ ...form, profit: e.target.value })} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Setup</Label>
            <Select value={form.setup || "__none"} onValueChange={v => setForm({ ...form, setup: v === "__none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Select setup..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">No setup</SelectItem>
                {setups.map((setup) => <SelectItem key={setup.id} value={setup.name}>{setup.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {setups.length === 0 && (
              <p className="text-xs text-muted-foreground">Create setups in the Setups page to use them here.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Session</Label>
            <Select value={form.session} onValueChange={v => setForm({ ...form, session: v as TradeSession })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SESSIONS.map(session => <SelectItem key={session} value={session}>{session}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Emotion</Label>
            <Select value={form.emotion} onValueChange={v => setForm({ ...form, emotion: v as TradeEmotion })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EMOTIONS.map(emotion => <SelectItem key={emotion} value={emotion}>{emotion}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Notes</Label>
            <Textarea placeholder="Trade notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Screenshots</Label>
            <ScreenshotUpload screenshots={form.screenshots} onChange={s => setForm({ ...form, screenshots: s })} />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
          <Button className="w-full sm:w-auto" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} className="w-full active:translate-y-[1px] sm:w-auto">
            {editTrade ? 'Update' : 'Save Trade'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
