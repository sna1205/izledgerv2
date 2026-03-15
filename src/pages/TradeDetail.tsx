import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTradeById, updateTrade, deleteTrade } from "@/lib/trades";
import { ResultBadge } from "@/components/ResultBadge";
import { ProfitDisplay } from "@/components/ProfitDisplay";
import { SetupTag } from "@/components/SetupTag";
import { TradeFormDialog } from "@/components/TradeFormDialog";
import { Trade } from "@/lib/types";
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

export default function TradeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trade, setTrade] = useState(() => getTradeById(id || ''));
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!trade) {
    return (
      <div className="p-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/trades')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <p className="mt-8 text-center text-muted-foreground">Trade not found.</p>
      </div>
    );
  }

  const handleSave = (updated: Trade) => {
    updateTrade(updated);
    setTrade(updated);
  };

  const handleDelete = () => {
    deleteTrade(trade.id);
    navigate('/trades');
  };

  const risk = Math.abs(trade.entry - trade.stopLoss);
  const reward = Math.abs(trade.takeProfit - trade.entry);
  const rr = risk > 0 ? (reward / risk).toFixed(2) : '—';

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/trades')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </Button>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Left: Trade Info */}
        <div className="w-2/5 space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{trade.pair}</h1>
            <p className="text-xs text-muted-foreground">{trade.date}</p>
          </div>

          <div className="flex items-center gap-3">
            <ResultBadge result={trade.result} />
            <ProfitDisplay value={trade.profit} className="text-lg" />
            {trade.setup && <SetupTag label={trade.setup} />}
          </div>

          <div className="border rounded-lg divide-y">
            {[
              ['Direction', trade.direction],
              ['Entry', trade.entry],
              ['Stop Loss', trade.stopLoss],
              ['Take Profit', trade.takeProfit],
              ['Risk:Reward', `1:${rr}`],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-center justify-between py-2 px-4">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
                <span className="text-sm font-mono-price">{value}</span>
              </div>
            ))}
          </div>

          {trade.notes && (
            <div>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Notes</h3>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{trade.notes}</p>
            </div>
          )}
        </div>

        {/* Right: Screenshots */}
        <div className="w-3/5">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Screenshots</h3>
          {trade.screenshots.length === 0 ? (
            <div className="border-2 border-dashed rounded-lg p-16 text-center">
              <CameraOff className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No visual logged</p>
            </div>
          ) : (
            <div className="space-y-4">
              {trade.screenshots.map((src, i) => (
                <div key={i} className="border rounded-lg overflow-hidden">
                  <img src={src} alt={`Trade screenshot ${i + 1}`} className="w-full" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <TradeFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={handleSave}
        editTrade={trade}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trade</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
