import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScreenshotUpload } from "./ScreenshotUpload";
import { Trade, Direction, Result, PAIRS, SETUPS } from "@/lib/types";
import { generateId } from "@/lib/trades";

interface TradeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (trade: Trade) => void;
  editTrade?: Trade | null;
}

export function TradeFormDialog({ open, onOpenChange, onSave, editTrade }: TradeFormDialogProps) {
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    pair: 'XAUUSD',
    direction: 'Buy' as Direction,
    entry: '',
    stopLoss: '',
    takeProfit: '',
    profit: '',
    result: 'Win' as Result,
    setup: '',
    notes: '',
    screenshots: [] as string[],
  });

  useEffect(() => {
    if (editTrade) {
      setForm({
        date: editTrade.date,
        pair: editTrade.pair,
        direction: editTrade.direction,
        entry: String(editTrade.entry),
        stopLoss: String(editTrade.stopLoss),
        takeProfit: String(editTrade.takeProfit),
        profit: String(editTrade.profit),
        result: editTrade.result,
        setup: editTrade.setup,
        notes: editTrade.notes,
        screenshots: editTrade.screenshots,
      });
    } else {
      setForm({
        date: new Date().toISOString().split('T')[0],
        pair: 'XAUUSD',
        direction: 'Buy',
        entry: '',
        stopLoss: '',
        takeProfit: '',
        profit: '',
        result: 'Win',
        setup: '',
        notes: '',
        screenshots: [],
      });
    }
  }, [editTrade, open]);

  const handleSave = () => {
    const trade: Trade = {
      id: editTrade?.id || generateId(),
      date: form.date,
      pair: form.pair,
      direction: form.direction,
      entry: parseFloat(form.entry) || 0,
      stopLoss: parseFloat(form.stopLoss) || 0,
      takeProfit: parseFloat(form.takeProfit) || 0,
      profit: parseFloat(form.profit) || 0,
      result: form.result,
      setup: form.setup,
      notes: form.notes,
      screenshots: form.screenshots,
      createdAt: editTrade?.createdAt || new Date().toISOString(),
    };
    onSave(trade);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editTrade ? 'Edit Trade' : 'New Trade'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
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
          <div className="col-span-2 space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Setup</Label>
            <Select value={form.setup} onValueChange={v => setForm({ ...form, setup: v })}>
              <SelectTrigger><SelectValue placeholder="Select setup..." /></SelectTrigger>
              <SelectContent>
                {SETUPS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Notes</Label>
            <Textarea placeholder="Trade notes..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />
          </div>
          <div className="col-span-2 space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Screenshots</Label>
            <ScreenshotUpload screenshots={form.screenshots} onChange={s => setForm({ ...form, screenshots: s })} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} className="active:translate-y-[1px]">
            {editTrade ? 'Update' : 'Save Trade'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
