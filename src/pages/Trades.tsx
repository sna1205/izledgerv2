import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTrades, addTrade, updateTrade, deleteTrade } from "@/lib/trades";
import { Trade } from "@/lib/types";
import { TradeFormDialog } from "@/components/TradeFormDialog";
import { ResultBadge } from "@/components/ResultBadge";
import { ProfitDisplay } from "@/components/ProfitDisplay";
import { SetupTag } from "@/components/SetupTag";
import { motion } from "framer-motion";
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

const rowVariants = {
  hidden: { opacity: 0, y: 5 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number], delay: i * 0.03 },
  }),
};

export default function Trades() {
  const [trades, setTrades] = useState<Trade[]>(() => getTrades());
  const [formOpen, setFormOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();

  const refresh = useCallback(() => setTrades(getTrades()), []);

  const handleSave = (trade: Trade) => {
    if (editingTrade) {
      updateTrade(trade);
    } else {
      addTrade(trade);
    }
    setEditingTrade(null);
    refresh();
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteTrade(deleteId);
      setDeleteId(null);
      refresh();
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-foreground">Trades</h1>
        <Button
          size="sm"
          onClick={() => { setEditingTrade(null); setFormOpen(true); }}
          className="active:translate-y-[1px]"
        >
          <Plus className="h-4 w-4 mr-1" />
          New Trade
        </Button>
      </div>

      {trades.length === 0 ? (
        <div className="border rounded-lg p-16 text-center">
          <p className="text-sm text-muted-foreground mb-3">No trades logged yet.</p>
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Log your first trade
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b bg-muted/50">
                {['Date','Pair','Direction','Entry','SL','TP','Setup','Result','Profit',''].map(h => (
                  <th key={h} className="text-xs font-medium uppercase tracking-wider text-muted-foreground py-2 px-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map((trade, i) => (
                <motion.tr
                  key={trade.id}
                  custom={i}
                  variants={rowVariants}
                  initial="hidden"
                  animate="visible"
                  className="border-b last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/trades/${trade.id}`)}
                >
                  <td className="py-2 px-4 text-sm tabular">{trade.date}</td>
                  <td className="py-2 px-4 text-sm font-medium">{trade.pair}</td>
                  <td className="py-2 px-4 text-sm text-muted-foreground">{trade.direction}</td>
                  <td className="py-2 px-4 text-sm font-mono-price">{trade.entry}</td>
                  <td className="py-2 px-4 text-sm font-mono-price">{trade.stopLoss}</td>
                  <td className="py-2 px-4 text-sm font-mono-price">{trade.takeProfit}</td>
                  <td className="py-2 px-4">{trade.setup && <SetupTag label={trade.setup} />}</td>
                  <td className="py-2 px-4"><ResultBadge result={trade.result} /></td>
                  <td className="py-2 px-4 text-right"><ProfitDisplay value={trade.profit} /></td>
                  <td className="py-2 px-4">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100" onClick={e => e.stopPropagation()}>
                      <button
                        className="p-1 rounded hover:bg-accent transition-colors"
                        onClick={(e) => { e.stopPropagation(); setEditingTrade(trade); setFormOpen(true); }}
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button
                        className="p-1 rounded hover:bg-destructive/10 transition-colors"
                        onClick={(e) => { e.stopPropagation(); setDeleteId(trade.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TradeFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingTrade(null); }}
        onSave={handleSave}
        editTrade={editingTrade}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
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
