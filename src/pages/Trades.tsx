import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CameraOff, Eye, Images, LayoutList, MessageSquarePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { AccountFilterSelect } from "@/components/AccountFilterSelect";
import { TradeReviewDialog } from "@/components/TradeReviewDialog";
import { TradeReviewStatusBadge } from "@/components/TradeReviewStatusBadge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { filterTradesByAccount, useAccountFilter } from "@/lib/account-filter";
import { getAccounts } from "@/lib/accounts";
import { addReview, getReviews, updateReview } from "@/lib/reviews";
import { getTrades, addTrade, updateTrade, deleteTrade } from "@/lib/trades";
import { Review, Trade } from "@/lib/types";
import { TradeFormDialog } from "@/components/TradeFormDialog";
import { ResultBadge } from "@/components/ResultBadge";
import { ProfitDisplay } from "@/components/ProfitDisplay";
import { SetupTag } from "@/components/SetupTag";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [reviews, setReviews] = useState<Review[]>(() => getReviews());
  const [reviewTrade, setReviewTrade] = useState<Trade | null>(null);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [accountFilter, setAccountFilter] = useAccountFilter();
  const navigate = useNavigate();
  const accountNames = useMemo(
    () => Object.fromEntries(getAccounts().map((account) => [account.id, account.name])),
    [trades, accountFilter],
  );
  const filteredTrades = useMemo(() => filterTradesByAccount(trades, accountFilter), [accountFilter, trades]);
  const tradeReviewMap = useMemo(
    () =>
      Object.fromEntries(
        reviews
          .filter((review) => review.reviewScope === "trade" && review.tradeId)
          .map((review) => [review.tradeId as string, review]),
      ),
    [reviews],
  );

  const refresh = useCallback(() => {
    setTrades(getTrades());
    setReviews(getReviews());
  }, []);

  const handleSave = (trade: Trade) => {
    const isNewTrade = !editingTrade;

    if (editingTrade) {
      updateTrade(trade);
    } else {
      addTrade(trade);
    }
    setEditingTrade(null);
    refresh();

    if (isNewTrade) {
      toast.success("Trade saved successfully.", {
        action: {
          label: "Review trade",
          onClick: () => {
            setReviewTrade(trade);
            setEditingReview(null);
          },
        },
      });
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteTrade(deleteId);
      setDeleteId(null);
      refresh();
    }
  };

  const handleSaveTradeReview = (review: Review) => {
    if (editingReview) {
      updateReview(review);
    } else {
      const { id, createdAt, updatedAt, ...draft } = review;
      addReview(draft);
    }

    setReviewTrade(null);
    setEditingReview(null);
    setReviews(getReviews());
    toast.success(editingReview ? "Trade review updated." : "Trade review created.");
  };

  const openCreateReview = (trade: Trade) => {
    setReviewTrade(trade);
    setEditingReview(null);
  };

  const openEditReview = (trade: Trade) => {
    setReviewTrade(trade);
    setEditingReview(tradeReviewMap[trade.id] || null);
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Trades</h1>
          <p className="mt-1 text-xs text-muted-foreground">Your ledger and screenshots stay scoped to the active account.</p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end sm:justify-end">
          <AccountFilterSelect value={accountFilter} onValueChange={setAccountFilter} />
          <Button
            size="sm"
            onClick={() => { setEditingTrade(null); setFormOpen(true); }}
            className="active:translate-y-[1px] sm:mb-px"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Trade
          </Button>
        </div>
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
        <Tabs defaultValue="ledger" className="w-full">
          <div className="mb-4 flex items-center justify-between gap-4">
            <TabsList className="grid w-full max-w-[320px] grid-cols-2">
              <TabsTrigger value="ledger" className="gap-2">
                <LayoutList className="h-4 w-4" />
                Ledger
              </TabsTrigger>
              <TabsTrigger value="screenbook" className="gap-2">
                <Images className="h-4 w-4" />
                Screenbook
              </TabsTrigger>
            </TabsList>
            <p className="hidden text-xs text-muted-foreground md:block">
              Switch between the trade table and a screenshot-first review grid.
            </p>
          </div>

          <TabsContent value="ledger" className="mt-0">
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {['Date','Pair','Account','Session','Direction','Entry','SL','TP','Setup','Emotion','Review','Result','Profit','Actions'].map(h => (
                      <th
                        key={h}
                        className={`py-2 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground ${h === 'Actions' ? 'min-w-[220px] text-right' : ''}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTrades.map((trade, i) => (
                    <motion.tr
                      key={trade.id}
                      custom={i}
                      variants={rowVariants}
                      initial="hidden"
                      animate="visible"
                      className="group border-b last:border-b-0 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/trades/${trade.id}`)}
                    >
                      <td className="py-2 px-4 text-sm tabular">{trade.date}</td>
                      <td className="py-2 px-4 text-sm font-medium">{trade.pair}</td>
                      <td className="py-2 px-4 text-sm text-muted-foreground">{accountNames[trade.accountId || ""] || "Main Account"}</td>
                      <td className="py-2 px-4 text-sm text-muted-foreground">{trade.session || '—'}</td>
                      <td className="py-2 px-4 text-sm text-muted-foreground">{trade.direction}</td>
                      <td className="py-2 px-4 text-sm font-mono-price">{trade.entry}</td>
                      <td className="py-2 px-4 text-sm font-mono-price">{trade.stopLoss}</td>
                      <td className="py-2 px-4 text-sm font-mono-price">{trade.takeProfit}</td>
                      <td className="py-2 px-4">{trade.setup && <SetupTag label={trade.setup} />}</td>
                      <td className="py-2 px-4 text-sm text-muted-foreground">{trade.emotion || '—'}</td>
                      <td className="py-2 px-4"><TradeReviewStatusBadge trade={trade} reviewed={!!tradeReviewMap[trade.id]} /></td>
                      <td className="py-2 px-4"><ResultBadge result={trade.result} /></td>
                      <td className="py-2 px-4 text-right"><ProfitDisplay value={trade.profit} /></td>
                      <td className="min-w-[220px] py-2 px-4">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          {tradeReviewMap[trade.id] ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 px-3"
                              onClick={(e) => { e.stopPropagation(); navigate(`/trades/${trade.id}`); }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Open Review
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 px-3"
                              onClick={(e) => { e.stopPropagation(); openCreateReview(trade); }}
                            >
                              <MessageSquarePlus className="h-3.5 w-3.5" />
                              Write Review
                            </Button>
                          )}
                          <button
                            type="button"
                            title="Edit trade"
                            aria-label="Edit trade"
                            className="p-1 rounded hover:bg-accent transition-colors"
                            onClick={(e) => { e.stopPropagation(); setEditingTrade(trade); setFormOpen(true); }}
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          <button
                            type="button"
                            title="Delete trade"
                            aria-label="Delete trade"
                            className="p-1 rounded hover:bg-destructive/10 transition-colors"
                            onClick={(e) => { e.stopPropagation(); setDeleteId(trade.id); }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                  {filteredTrades.length === 0 && (
                    <tr>
                      <td colSpan={14} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        No trades found for the selected account.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="screenbook" className="mt-0">
            {filteredTrades.length === 0 ? (
              <div className="rounded-xl border border-dashed p-12 text-center">
                <p className="text-sm text-muted-foreground">No screenshot trades found for the selected account.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredTrades.map((trade, i) => {
                  const preview = trade.screenshots[0];
                  const linkedReview = tradeReviewMap[trade.id];

                  return (
                    <motion.article
                      key={trade.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1], delay: i * 0.03 }}
                      className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <button
                        type="button"
                        className="block w-full text-left"
                        onClick={() => navigate(`/trades/${trade.id}`)}
                      >
                        <div className="relative aspect-[4/3] bg-muted/40">
                          {preview ? (
                            <img
                              src={preview}
                              alt={`${trade.pair} trade screenshot`}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground">
                              <div className="text-center">
                                <CameraOff className="mx-auto mb-2 h-6 w-6" />
                                <p className="text-sm">No screenshot</p>
                              </div>
                            </div>
                          )}
                          <div className="absolute left-3 top-3 flex items-center gap-2">
                            <ResultBadge result={trade.result} />
                            {trade.screenshots.length > 0 && (
                              <span className="rounded-full bg-background/90 px-2 py-1 text-[11px] font-medium text-foreground shadow-sm">
                                {trade.screenshots.length} shot{trade.screenshots.length === 1 ? "" : "s"}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-4">
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                              <h2 className="text-sm font-semibold text-foreground">{trade.pair}</h2>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {trade.date}
                                {` • ${accountNames[trade.accountId || ""] || "Main Account"}`}
                                {trade.session ? ` • ${trade.session}` : ""}
                                {trade.emotion ? ` • ${trade.emotion}` : ""}
                              </p>
                            </div>
                            <ProfitDisplay value={trade.profit} />
                          </div>

                          <div className="mb-3">
                            <TradeReviewStatusBadge trade={trade} reviewed={!!linkedReview} />
                          </div>

                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            {trade.setup && <SetupTag label={trade.setup} />}
                            <span className="text-xs text-muted-foreground">{trade.direction}</span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="rounded-md bg-muted/50 p-2">
                              <p className="mb-1 uppercase tracking-wider text-muted-foreground">Entry</p>
                              <p className="font-mono-price text-foreground">{trade.entry}</p>
                            </div>
                            <div className="rounded-md bg-muted/50 p-2">
                              <p className="mb-1 uppercase tracking-wider text-muted-foreground">SL</p>
                              <p className="font-mono-price text-foreground">{trade.stopLoss}</p>
                            </div>
                            <div className="rounded-md bg-muted/50 p-2">
                              <p className="mb-1 uppercase tracking-wider text-muted-foreground">TP</p>
                              <p className="font-mono-price text-foreground">{trade.takeProfit}</p>
                            </div>
                          </div>
                        </div>
                      </button>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-wrap items-center gap-1">
                          {linkedReview ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 px-3"
                              onClick={(e) => { e.stopPropagation(); navigate(`/trades/${trade.id}`); }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Open Review
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 px-3"
                              onClick={(e) => { e.stopPropagation(); openCreateReview(trade); }}
                            >
                              <MessageSquarePlus className="h-3.5 w-3.5" />
                              Write Review
                            </Button>
                          )}
                        </div>
                        <button
                          type="button"
                          title="Edit trade"
                          aria-label="Edit trade"
                          className="p-1 rounded hover:bg-accent transition-colors"
                          onClick={(e) => { e.stopPropagation(); setEditingTrade(trade); setFormOpen(true); }}
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <button
                          type="button"
                          title="Delete trade"
                          aria-label="Delete trade"
                          className="p-1 rounded hover:bg-destructive/10 transition-colors"
                          onClick={(e) => { e.stopPropagation(); setDeleteId(trade.id); }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <TradeFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingTrade(null); }}
        onSave={handleSave}
        editTrade={editingTrade}
      />

      {reviewTrade && (
        <TradeReviewDialog
          open={!!reviewTrade}
          onOpenChange={(open) => {
            if (!open) {
              setReviewTrade(null);
              setEditingReview(null);
            }
          }}
          trade={reviewTrade}
          review={editingReview}
          onSave={handleSaveTradeReview}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trade</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Any linked trade review will be preserved in Reviews as journal history.
            </AlertDialogDescription>
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
