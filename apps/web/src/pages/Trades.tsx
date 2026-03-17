import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { CameraOff, Images, LayoutList, Pencil, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageErrorState } from "@/components/PageErrorState";
import { PaginationControls } from "@/components/PaginationControls";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/sonner";
import { ProfitDisplay } from "@/components/ProfitDisplay";
import { ResultBadge } from "@/components/ResultBadge";
import { TradeFormDialog } from "@/components/TradeFormDialog";
import { TradeReviewDialog } from "@/components/TradeReviewDialog";
import { TradeReviewStatusBadge } from "@/components/TradeReviewStatusBadge";
import { listAccounts } from "@/lib/api/accounts";
import { ApiError } from "@/lib/api/client";
import { listReviews, createReview, updateReview } from "@/lib/api/reviews";
import { listSetups } from "@/lib/api/setups";
import { createTrade, deleteTrade, listTrades, updateTrade } from "@/lib/api/trades";
import { resolveAccountFilter, useAccountFilter } from "@/lib/account-filter";
import { useAuth } from "@/lib/auth";
import { getPageErrorState } from "@/lib/page-errors";
import { privateQueryKey, removeTradeQueryData, syncTradeScreenshotQueryData, updateTradeQueryData } from "@/lib/react-query";
import { EMOTIONS, SESSIONS, type Review, type Trade } from "@/lib/types";
import { cn } from "@/lib/utils";

const LEDGER_PAGE_SIZE = 10;
const SCREENBOOK_PAGE_SIZE = 9;

const directionStyles = {
  Buy: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  Sell: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
} as const;

const emotionStyles = {
  Calm: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300",
  Focused: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300",
  Confident: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300",
  Anxious: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
  Frustrated: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
} as const;

const sessionStyles = {
  Asia: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/25 dark:bg-slate-500/10 dark:text-slate-300",
  London: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300",
  "New York": "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300",
} as const;

function formatTradeDate(date: string) {
  return format(parseISO(date), "MMM d, yyyy");
}

function FilterField({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="min-w-0 w-full space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-10 rounded-xl border-border/70 bg-background/80">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function invalidateJournalQueries(queryClient: ReturnType<typeof useQueryClient>, userId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "trades") }),
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "reviews") }),
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "dashboard-summary") }),
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "analytics-breakdowns") }),
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "analytics-calendar") }),
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "setups") }),
  ]);
}

export default function Trades() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{ trade: Trade; review?: Review | null } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [accountFilter, setAccountFilter] = useAccountFilter();
  const [sessionFilter, setSessionFilter] = useState<string>("all");
  const [setupFilter, setSetupFilter] = useState<string>("all");
  const [emotionFilter, setEmotionFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "createdAt" | "profit" | "pair">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [activeView, setActiveView] = useState<"ledger" | "screenbook">("ledger");
  const [ledgerPage, setLedgerPage] = useState(1);
  const [screenbookPage, setScreenbookPage] = useState(1);

  const accountsQuery = useQuery({
    queryKey: privateQueryKey(user.id, "accounts"),
    queryFn: async () => {
      const response = await listAccounts();
      return response.items;
    },
  });
  const setupsQuery = useQuery({
    queryKey: privateQueryKey(user.id, "setups", "options"),
    queryFn: async () => {
      const response = await listSetups({ page: 1, pageSize: 100, status: "all", sortBy: "name", sortOrder: "asc" });
      return response.items;
    },
  });
  const accounts = accountsQuery.data;
  const setups = setupsQuery.data ?? [];
  const resolvedAccountFilter = useMemo(
    () => resolveAccountFilter(accountFilter, accounts ?? []),
    [accountFilter, accounts],
  );
  const currentPage = activeView === "ledger" ? ledgerPage : screenbookPage;
  const tradesQuery = useQuery({
    queryKey: privateQueryKey(user.id, "trades", "list", {
      page: currentPage,
      pageSize: activeView === "ledger" ? LEDGER_PAGE_SIZE : SCREENBOOK_PAGE_SIZE,
      accountId: resolvedAccountFilter,
      session: sessionFilter,
      setupId: setupFilter,
      emotion: emotionFilter,
      sortBy,
      sortOrder,
    }),
    queryFn: async () => {
      return listTrades({
        page: currentPage,
        pageSize: activeView === "ledger" ? LEDGER_PAGE_SIZE : SCREENBOOK_PAGE_SIZE,
        accountId: resolvedAccountFilter !== "all" ? resolvedAccountFilter : undefined,
        session: sessionFilter !== "all" ? sessionFilter as NonNullable<Trade["session"]> : undefined,
        setupId: setupFilter !== "all" ? setupFilter : undefined,
        emotion: emotionFilter !== "all" ? emotionFilter as NonNullable<Trade["emotion"]> : undefined,
        sortBy,
        sortOrder,
      });
    },
  });

  useEffect(() => {
    if (resolvedAccountFilter !== accountFilter) {
      setAccountFilter(resolvedAccountFilter);
    }
  }, [accountFilter, resolvedAccountFilter, setAccountFilter]);

  const accountNames = useMemo(
    () => Object.fromEntries((accounts ?? []).map((account) => [account.id, account.name])),
    [accounts],
  );
  const visibleTrades = tradesQuery.data?.items;
  const trades = visibleTrades ?? [];
  const totalTradePages = tradesQuery.data?.pagination.totalPages ?? 1;
  const totalTrades = tradesQuery.data?.pagination.total ?? 0;
  const hasActiveFilters = resolvedAccountFilter !== "all" || sessionFilter !== "all" || setupFilter !== "all" || emotionFilter !== "all";

  const tradeReviewQueries = useQueries({
    queries: (visibleTrades ?? []).map((trade) => ({
      queryKey: privateQueryKey(user.id, "reviews", "trade", trade.id, "summary"),
      queryFn: async () => {
        const response = await listReviews({
          type: "trade",
          tradeId: trade.id,
          page: 1,
          pageSize: 1,
          sortBy: "updatedAt",
          sortOrder: "desc",
        });
        return response.items[0] ?? null;
      },
    })),
  });

  const tradeReviewMap = useMemo(
    () =>
      Object.fromEntries(
        (visibleTrades ?? []).map((trade, index) => [trade.id, tradeReviewQueries[index]?.data ?? null]),
      ),
    [tradeReviewQueries, visibleTrades],
  );

  useEffect(() => {
    setLedgerPage(1);
    setScreenbookPage(1);
  }, [resolvedAccountFilter, emotionFilter, sessionFilter, setupFilter, sortBy, sortOrder]);

  const saveTradeMutation = useMutation({
    mutationFn: async (payload: Parameters<NonNullable<React.ComponentProps<typeof TradeFormDialog>["onSave"]>>[0]) => {
      if (editingTrade) {
        return updateTrade(editingTrade.id, payload);
      }

      return createTrade(payload);
    },
    onSuccess: async (result) => {
      updateTradeQueryData(queryClient, user.id, result.trade);
      await invalidateJournalQueries(queryClient, user.id);
      toast.success(editingTrade ? "Trade updated successfully." : "Trade saved successfully.");
      setEditingTrade(null);
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not save the trade right now.";
      toast.error(message);
    },
  });

  const deleteTradeMutation = useMutation({
    mutationFn: async (tradeId: string) => deleteTrade(tradeId),
    onSuccess: async (_data, tradeId) => {
      removeTradeQueryData(queryClient, user.id, tradeId);
      await invalidateJournalQueries(queryClient, user.id);
      toast.success("Trade deleted.");
      setDeleteId(null);
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not delete the trade right now.";
      toast.error(message);
    },
  });

  const saveReviewMutation = useMutation({
    mutationFn: async (review: Review) => {
      const payload = {
        type: "trade" as const,
        tradeId: review.tradeId!,
        reviewDate: review.reviewDate ?? null,
        lessonLearned: review.lessonLearned ?? null,
        disciplineScore: review.disciplineScore ?? null,
        executionRating: review.executionRating ?? null,
        emotionRating: review.emotionRating ?? null,
        whatWentWell: review.whatWentWell ?? null,
        whatWentWrong: review.whatWentWrong ?? null,
        mistakesMade: review.mistakesMade ?? null,
        improvementForNextTrade: review.improvementForNextTrade ?? null,
        wouldTakeAgain: review.wouldTakeAgain ?? null,
      };

      if (reviewTarget?.review?.id) {
        return updateReview(reviewTarget.review.id, payload);
      }

      return createReview(payload);
    },
    onSuccess: async () => {
      await invalidateJournalQueries(queryClient, user.id);
      toast.success(reviewTarget?.review ? "Trade review updated." : "Trade review created.");
      setReviewTarget(null);
    },
  });

  const isLoading = [accountsQuery, setupsQuery, tradesQuery].some((query) => query.isLoading && !query.data);
  const hasError = [accountsQuery, setupsQuery, tradesQuery].some((query) => query.isError);
  const journalError = [accountsQuery, setupsQuery, tradesQuery].find((query) => query.isError)?.error;

  if (isLoading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">Loading trades...</div>;
  }

  if (hasError) {
    const errorState = getPageErrorState(journalError, {
      unavailableTitle: "Trades unavailable",
      unavailableDescription: "The trading journal is temporarily unavailable. Please try again in a moment.",
      unauthorizedDescription: "Your session is not allowed to view this trading journal right now.",
      validationTitle: "Trade request invalid",
      validationDescription: "The trade filters in this request are invalid.",
      timeoutTitle: "Trades request timed out",
      timeoutDescription: "Loading your trading journal took too long. Please try again.",
    });

    return (
      <PageErrorState
        title={errorState.title}
        description={errorState.description}
        onRetry={errorState.allowRetry ? () => {
          void Promise.all([accountsQuery.refetch(), setupsQuery.refetch(), tradesQuery.refetch()]);
        } : undefined}
        isRetrying={accountsQuery.isFetching || setupsQuery.isFetching || tradesQuery.isFetching}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto w-full max-w-[1600px] space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Trades</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Scan execution quality, profit, session context, and review status in one ledger.
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => {
              setEditingTrade(null);
              setFormOpen(true);
            }}
            className="h-10 rounded-xl px-4"
          >
            <Plus className="mr-1 h-4 w-4" />
            New Trade
          </Button>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <FilterField
                label="Account"
                value={resolvedAccountFilter}
                onValueChange={setAccountFilter}
                options={[
                  { label: "All Accounts", value: "all" },
                  ...accounts.map((account) => ({ label: account.name, value: account.id })),
                ]}
              />
              <FilterField
                label="Session"
                value={sessionFilter}
                onValueChange={setSessionFilter}
                options={[{ label: "All Sessions", value: "all" }, ...SESSIONS.map((session) => ({ label: session, value: session }))]}
              />
              <FilterField
                label="Setup"
                value={setupFilter}
                onValueChange={setSetupFilter}
                options={[{ label: "All Setups", value: "all" }, ...setups.map((setup) => ({ label: setup.name, value: setup.id }))]}
              />
              <FilterField
                label="Emotion"
                value={emotionFilter}
                onValueChange={setEmotionFilter}
                options={[{ label: "All Emotions", value: "all" }, ...EMOTIONS.map((emotion) => ({ label: emotion, value: emotion }))]}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:min-w-[320px]">
              <FilterField
                label="Sort By"
                value={sortBy}
                onValueChange={(value) => setSortBy(value as typeof sortBy)}
                options={[
                  { label: "Trade Date", value: "date" },
                  { label: "Created At", value: "createdAt" },
                  { label: "PnL", value: "profit" },
                  { label: "Pair", value: "pair" },
                ]}
              />
              <FilterField
                label="Order"
                value={sortOrder}
                onValueChange={(value) => setSortOrder(value as typeof sortOrder)}
                options={[
                  { label: "Descending", value: "desc" },
                  { label: "Ascending", value: "asc" },
                ]}
              />
            </div>

            <div className="rounded-2xl border bg-background/60 px-4 py-3 text-sm text-muted-foreground xl:min-w-[172px]">
              <span className="font-medium text-foreground">{totalTrades}</span>{" "}
              {totalTrades === 1 ? "trade" : "trades"} in view
            </div>
          </div>
        </div>

        {totalTrades === 0 ? (
          <div className="rounded-2xl border bg-card p-16 text-center shadow-sm">
            <p className="text-base font-medium text-foreground">{hasActiveFilters ? "No trades match these filters." : "No trades logged yet."}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {hasActiveFilters
                ? "Adjust the filters or log a new trade."
                : "Start building your execution journal with your first trade."}
            </p>
            {!hasActiveFilters ? (
              <Button className="mt-4" size="sm" onClick={() => setFormOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Log your first trade
              </Button>
            ) : null}
          </div>
        ) : (
          <Tabs value={activeView} onValueChange={(value) => setActiveView(value as "ledger" | "screenbook")} className="w-full">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <TabsList className="grid h-11 w-full grid-cols-2 rounded-2xl border bg-muted/40 p-1 sm:max-w-[320px]">
                <TabsTrigger value="ledger" className="rounded-xl gap-2 data-[state=active]:shadow-sm">
                  <LayoutList className="h-4 w-4" />
                  Ledger
                </TabsTrigger>
                <TabsTrigger value="screenbook" className="rounded-xl gap-2 data-[state=active]:shadow-sm">
                  <Images className="h-4 w-4" />
                  Screenbook
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="ledger" className="mt-4">
              {trades.length === 0 ? (
                <div className="rounded-2xl border bg-card p-16 text-center shadow-sm">
                  <p className="text-base font-medium text-foreground">No trades match these filters.</p>
                  <p className="mt-2 text-sm text-muted-foreground">Adjust the filters or log a new trade.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                        <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Pair</th>
                        <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Account</th>
                        <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Context</th>
                        <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">Review</th>
                        <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-muted-foreground">PnL</th>
                        <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades.map((trade) => {
                        const linkedReview = tradeReviewMap[trade.id];

                        return (
                          <tr key={trade.id} className="border-b last:border-b-0">
                            <td className="px-4 py-4 text-sm">{formatTradeDate(trade.date)}</td>
                            <td className="px-4 py-4">
                              <button type="button" className="text-left" onClick={() => navigate(`/trades/${trade.id}`)}>
                                <p className="text-sm font-semibold text-foreground">{trade.pair}</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium", directionStyles[trade.direction])}>
                                    {trade.direction}
                                  </span>
                                  <ResultBadge result={trade.result} />
                                </div>
                              </button>
                            </td>
                            <td className="px-4 py-4 text-sm text-muted-foreground">{accountNames[trade.accountId] ?? "Unknown Account"}</td>
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-2">
                                {trade.setup ? <span className="rounded-full border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">{trade.setup}</span> : null}
                                {trade.session ? <span className={cn("rounded-full border px-2.5 py-1 text-[11px]", sessionStyles[trade.session])}>{trade.session}</span> : null}
                                {trade.emotion ? <span className={cn("rounded-full border px-2.5 py-1 text-[11px]", emotionStyles[trade.emotion])}>{trade.emotion}</span> : null}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <button type="button" onClick={() => setReviewTarget({ trade, review: linkedReview })}>
                                <TradeReviewStatusBadge trade={trade} reviewed={Boolean(linkedReview)} />
                              </button>
                            </td>
                            <td className="px-4 py-4 text-right"><ProfitDisplay value={trade.profit} /></td>
                            <td className="px-4 py-4">
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => { setEditingTrade(trade); setFormOpen(true); }}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(trade.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalTradePages}
                    itemLabel="ledger pages"
                    onPrevious={() => setLedgerPage((page) => Math.max(1, page - 1))}
                    onNext={() => setLedgerPage((page) => Math.min(totalTradePages, page + 1))}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="screenbook" className="mt-4">
              {trades.length === 0 ? (
                <div className="rounded-2xl border bg-card p-16 text-center shadow-sm">
                  <p className="text-base font-medium text-foreground">No trades match these filters.</p>
                  <p className="mt-2 text-sm text-muted-foreground">Adjust the filters or log a new trade.</p>
                </div>
              ) : (
                <div className="rounded-2xl border bg-card shadow-sm">
                  <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
                    {trades.map((trade) => {
                      const screenshots = trade.screenshotAssets ?? [];

                      return (
                        <article key={trade.id} className="overflow-hidden rounded-2xl border bg-background/60">
                          {screenshots.length > 0 ? (
                            <button type="button" className="block w-full text-left" onClick={() => navigate(`/trades/${trade.id}`)}>
                              <img src={screenshots[0].url} alt={`${trade.pair} screenshot`} className="aspect-[16/10] w-full object-cover" />
                            </button>
                          ) : (
                            <div className="flex aspect-[16/10] items-center justify-center bg-muted/40 text-sm text-muted-foreground">
                              <CameraOff className="mr-2 h-4 w-4" />
                              No screenshots
                            </div>
                          )}

                          <div className="space-y-4 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <button type="button" className="text-left" onClick={() => navigate(`/trades/${trade.id}`)}>
                                  <p className="text-sm font-semibold text-foreground">{trade.pair}</p>
                                </button>
                                <p className="mt-1 text-xs text-muted-foreground">{formatTradeDate(trade.date)}</p>
                              </div>
                              <ProfitDisplay value={trade.profit} />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <ResultBadge result={trade.result} />
                              {trade.setup ? <span className="rounded-full border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">{trade.setup}</span> : null}
                              <TradeReviewStatusBadge trade={trade} reviewed={Boolean(tradeReviewMap[trade.id])} />
                            </div>
                            <div className="flex justify-between gap-2">
                              <Button variant="outline" size="sm" onClick={() => { setEditingTrade(trade); setFormOpen(true); }}>
                                <Pencil className="mr-1 h-4 w-4" />
                                Edit
                              </Button>
                              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(trade.id)}>
                                <Trash2 className="mr-1 h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalTradePages}
                    itemLabel="screenbook pages"
                    onPrevious={() => setScreenbookPage((page) => Math.max(1, page - 1))}
                    onNext={() => setScreenbookPage((page) => Math.min(totalTradePages, page + 1))}
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <TradeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={async (payload) => {
          await saveTradeMutation.mutateAsync(payload);
        }}
        editTrade={editingTrade}
        accounts={accounts}
        setups={setups}
        isSaving={saveTradeMutation.isPending}
        onScreenshotsChange={(trade) => {
          void syncTradeScreenshotQueryData(queryClient, user.id, trade);
          setEditingTrade(trade);
        }}
      />

      {reviewTarget ? (
        <TradeReviewDialog
          open={Boolean(reviewTarget)}
          onOpenChange={(open) => !open && setReviewTarget(null)}
          trade={reviewTarget.trade}
          review={reviewTarget.review}
          onSave={async (review) => {
            await saveReviewMutation.mutateAsync(review);
          }}
          isSaving={saveReviewMutation.isPending}
        />
      ) : null}

      <AlertDialog open={!!deleteId} onOpenChange={(openState) => !openState && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trade</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Any linked trade review will be preserved in Reviews as journal history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteTradeMutation.mutate(deleteId)} disabled={deleteTradeMutation.isPending}>
              {deleteTradeMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
