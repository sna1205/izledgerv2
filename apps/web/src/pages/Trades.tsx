import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { CameraOff, Eye, Images, LayoutList, Pencil, Plus, Share2, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar, FilterField } from "@/components/FilterBar";
import { PageErrorState } from "@/components/PageErrorState";
import { PageHeader, PageShell, SectionCard } from "@/layouts/PageShell";
import { PaginationControls } from "@/components/PaginationControls";
import { ProfitDisplay } from "@/features/trades/components/ProfitDisplay";
import { ResultBadge } from "@/features/trades/components/ResultBadge";
import { ShareTradeModal } from "@/features/trade-sharing/components/ShareTradeModal";
import { StatCard } from "@/components/StatCard";
import { TradeFormDialog } from "@/features/trades/components/TradeFormDialog";
import { TradeReviewDialog } from "@/features/reviews/components/TradeReviewDialog";
import { TradeReviewStatusBadge } from "@/features/reviews/components/TradeReviewStatusBadge";
import { SetupTag } from "@/components/SetupTag";
import { TradesSkeleton } from "@/components/skeletons/TradesSkeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagChip } from "@/components/ui/TagChip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { toast } from "@/components/ui/sonner";
import { DataBadge } from "@/components/DataBadge";
import { listAccounts } from "@/services/api/accounts";
import { ApiError } from "@/services/api/client";
import { listReviews, createReview, updateReview } from "@/services/api/reviews";
import { listSetups } from "@/services/api/setups";
import { createTrade, deleteTrade, listTrades, updateTrade } from "@/services/api/trades";
import { resolveAccountFilter, useAccountFilter } from "@/utils/account-filter";
import { formatCurrencyDisplay, formatNumberDisplay } from "@/utils/analytics-rendering";
import { useAuth } from "@/features/auth/auth-context";
import { useUnauthorizedSessionGuard } from "@/features/auth/use-unauthorized-session-guard";
import { withMinimumDelay } from "@/utils/loading";
import { getPageErrorState } from "@/utils/page-errors";
import { privateQueryKey, removeTradeQueryData, syncTradeScreenshotQueryData, updateTradeQueryData } from "@/services/query-client";
import { EMOTIONS, SESSIONS, type Review, type Trade } from "@/types";

const LEDGER_PAGE_SIZE = 10;
const SCREENBOOK_PAGE_SIZE = 9;
const EMPTY_TRADES: Trade[] = [];

function formatTradeDate(date: string) {
  return format(parseISO(date), "MMM d, yyyy");
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

function toneForDirection(direction: Trade["direction"]) {
  return direction === "Buy" ? "success" : "danger";
}

export default function Trades() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [sharingTrade, setSharingTrade] = useState<Trade | null>(null);
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
    queryKey: privateQueryKey(user.id, "accounts", "active"),
    queryFn: async () => {
      const response = await withMinimumDelay(() => listAccounts({ status: "active" }));
      return response.items;
    },
  });

  const setupsQuery = useQuery({
    queryKey: privateQueryKey(user.id, "setups", "options"),
    queryFn: async () => {
      const response = await withMinimumDelay(() => listSetups({
        page: 1,
        pageSize: 100,
        status: "all",
        sortBy: "name",
        sortOrder: "asc",
      }));
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
    queryFn: async () => withMinimumDelay(() => listTrades({
      page: currentPage,
      pageSize: activeView === "ledger" ? LEDGER_PAGE_SIZE : SCREENBOOK_PAGE_SIZE,
      accountId: resolvedAccountFilter !== "all" ? resolvedAccountFilter : undefined,
      session: sessionFilter !== "all" ? sessionFilter as NonNullable<Trade["session"]> : undefined,
      setupId: setupFilter !== "all" ? setupFilter : undefined,
      emotion: emotionFilter !== "all" ? emotionFilter as NonNullable<Trade["emotion"]> : undefined,
      sortBy,
      sortOrder,
    })),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (resolvedAccountFilter !== accountFilter) {
      setAccountFilter(resolvedAccountFilter);
    }
  }, [accountFilter, resolvedAccountFilter, setAccountFilter]);

  useEffect(() => {
    setLedgerPage(1);
    setScreenbookPage(1);
  }, [resolvedAccountFilter, emotionFilter, sessionFilter, setupFilter, sortBy, sortOrder]);

  const accountNames = useMemo(
    () => Object.fromEntries((accounts ?? []).map((account) => [account.id, account.name])),
    [accounts],
  );

  const visibleTrades = tradesQuery.data?.items;
  const trades = visibleTrades ?? EMPTY_TRADES;
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
    () => Object.fromEntries((visibleTrades ?? []).map((trade, index) => [trade.id, tradeReviewQueries[index]?.data ?? null])),
    [tradeReviewQueries, visibleTrades],
  );

  const reviewedCount = useMemo(
    () => trades.reduce((count, trade) => count + (tradeReviewMap[trade.id] ? 1 : 0), 0),
    [tradeReviewMap, trades],
  );
  const totalPnlInView = useMemo(
    () => trades.reduce((sum, trade) => sum + trade.profit, 0),
    [trades],
  );

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

  useUnauthorizedSessionGuard(accountsQuery.error, setupsQuery.error, tradesQuery.error);

  if (isLoading) {
    return <TradesSkeleton />;
  }

  if (hasError) {
    const errorState = getPageErrorState(journalError, {
      unavailableTitle: "Trades unavailable",
      unavailableDescription: "The trading journal is temporarily unavailable. Please try again in a moment.",
      unauthorizedDescription: "Your session expired or could not be verified. Redirecting to login.",
      validationTitle: "Trade request invalid",
      validationDescription: "The trade filters in this request are invalid.",
      timeoutTitle: "Trades request timed out",
      timeoutDescription: "Loading your trading journal took too long. Please try again.",
    });

    return (
      <PageErrorState
        title={errorState.title}
        description={errorState.description}
        layout="page"
        size="wide"
        onRetry={errorState.allowRetry ? () => {
          void Promise.all([accountsQuery.refetch(), setupsQuery.refetch(), tradesQuery.refetch()]);
        } : undefined}
        isRetrying={accountsQuery.isFetching || setupsQuery.isFetching || tradesQuery.isFetching}
      />
    );
  }

  return (
    <PageShell size="wide">
      <PageHeader
        title="Trades"
        actions={(
          <Button onClick={() => { setEditingTrade(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" />
            New Trade
          </Button>
        )}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard label="Trades In View" value={formatNumberDisplay(totalTrades)} icon={LayoutList} />
        <StatCard label="Reviewed" value={formatNumberDisplay(reviewedCount)} icon={Eye} />
        <StatCard
          label="PnL In View"
          value={formatCurrencyDisplay(totalPnlInView)}
          tone={totalPnlInView > 0 ? "positive" : totalPnlInView < 0 ? "negative" : "default"}
          icon={Images}
        />
      </div>

      <FilterBar meta={<><span className="font-medium text-foreground">{totalTrades}</span>&nbsp;trades in view</>}>
        <FilterField label="Account">
          <Select value={resolvedAccountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts?.map((account) => (
                <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Session">
          <Select value={sessionFilter} onValueChange={setSessionFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sessions</SelectItem>
              {SESSIONS.map((session) => (
                <SelectItem key={session} value={session}>{session}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Setup">
          <Select value={setupFilter} onValueChange={setSetupFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Setups</SelectItem>
              {setups.map((setup) => (
                <SelectItem key={setup.id} value={setup.id}>{setup.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Emotion">
          <Select value={emotionFilter} onValueChange={setEmotionFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Emotions</SelectItem>
              {EMOTIONS.map((emotion) => (
                <SelectItem key={emotion} value={emotion}>{emotion}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
      </FilterBar>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <Tabs value={activeView} onValueChange={(value) => setActiveView(value as "ledger" | "screenbook")} className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-2 sm:max-w-[320px]">
            <TabsTrigger value="ledger" className="gap-2">
              <LayoutList className="h-4 w-4" />
              Ledger
            </TabsTrigger>
            <TabsTrigger value="screenbook" className="gap-2">
              <Images className="h-4 w-4" />
              Screenbook
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row">
            <div className="w-full sm:w-[180px]">
              <FilterField label="Sort By">
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Trade Date</SelectItem>
                    <SelectItem value="createdAt">Created At</SelectItem>
                    <SelectItem value="profit">PnL</SelectItem>
                    <SelectItem value="pair">Pair</SelectItem>
                  </SelectContent>
                </Select>
              </FilterField>
            </div>
            <div className="w-full sm:w-[180px]">
              <FilterField label="Order">
                <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as typeof sortOrder)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Descending</SelectItem>
                    <SelectItem value="asc">Ascending</SelectItem>
                  </SelectContent>
                </Select>
              </FilterField>
            </div>
          </div>

          <TabsContent value="ledger" className="space-y-6">
            {totalTrades === 0 ? (
              <EmptyState
                icon={LayoutList}
                title={hasActiveFilters ? "No trades match these filters" : "No trades logged yet"}
                description={hasActiveFilters
                  ? "Adjust filters and try again."
                  : "Log a trade to populate this view."}
                action={!hasActiveFilters ? (
                  <Button onClick={() => setFormOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Add trade
                  </Button>
                ) : null}
              />
            ) : (
              <SectionCard className="overflow-hidden p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Date</TableHead>
                      <TableHead>Pair / Direction</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Context</TableHead>
                      <TableHead>Review</TableHead>
                      <TableHead className="text-right">PnL</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trades.map((trade) => {
                      const linkedReview = tradeReviewMap[trade.id];

                      return (
                        <TableRow
                          key={trade.id}
                          className="group cursor-pointer"
                          onClick={() => navigate(`/trades/${trade.id}`)}
                        >
                          <TableCell className="text-sm text-muted-foreground">{formatTradeDate(trade.date)}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-foreground">{trade.pair}</p>
                              <div className="flex flex-wrap gap-2">
                                <DataBadge tone={toneForDirection(trade.direction)}>{trade.direction}</DataBadge>
                                <ResultBadge result={trade.result} />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {trade.account?.name ?? accountNames[trade.accountId] ?? "Unknown Account"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              {trade.setup ? <SetupTag label={trade.setup} color={trade.setupColor} /> : null}
                              {trade.session ? <TagChip label={trade.session} kind="session" /> : null}
                              {trade.emotion ? <TagChip label={trade.emotion} kind="emotion" /> : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setReviewTarget({ trade, review: linkedReview });
                              }}
                            >
                              <TradeReviewStatusBadge trade={trade} reviewed={Boolean(linkedReview)} />
                            </button>
                          </TableCell>
                          <TableCell className="text-right">
                            <ProfitDisplay value={trade.profit} className="text-base" />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSharingTrade(trade);
                                }}
                              >
                                <Share2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setEditingTrade(trade);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setDeleteId(trade.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalTradePages}
                  itemLabel="ledger pages"
                  onPrevious={() => setLedgerPage((page) => Math.max(1, page - 1))}
                  onNext={() => setLedgerPage((page) => Math.min(totalTradePages, page + 1))}
                />
              </SectionCard>
            )}
          </TabsContent>

          <TabsContent value="screenbook" className="space-y-6">
            {totalTrades === 0 ? (
              <EmptyState
                icon={Images}
                title={hasActiveFilters ? "No trades match these filters" : "Screenbook is empty"}
                description={hasActiveFilters
                  ? "Adjust filters and try again."
                  : "Add screenshots to trades to populate this view."}
              />
            ) : (
              <SectionCard>
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {trades.map((trade) => {
                    const screenshots = trade.screenshotAssets ?? [];

                    return (
                      <article key={trade.id} className="surface flex h-full flex-col overflow-hidden p-0">
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

                        <div className="flex h-full flex-col gap-4 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <button type="button" className="text-left" onClick={() => navigate(`/trades/${trade.id}`)}>
                                <p className="text-sm font-medium text-foreground">{trade.pair}</p>
                              </button>
                              <p className="mt-1 text-xs text-muted-foreground">{formatTradeDate(trade.date)}</p>
                            </div>
                            <ProfitDisplay value={trade.profit} className="text-base" />
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <DataBadge tone={toneForDirection(trade.direction)}>{trade.direction}</DataBadge>
                            <ResultBadge result={trade.result} />
                            {trade.setup ? <SetupTag label={trade.setup} color={trade.setupColor} /> : null}
                            <TradeReviewStatusBadge trade={trade} reviewed={Boolean(tradeReviewMap[trade.id])} />
                          </div>

                          <div className="mt-auto flex justify-between gap-2">
                            <Button variant="outline" size="sm" onClick={() => navigate(`/trades/${trade.id}`)}>
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                            <div className="flex gap-2">
                              <Button variant="outline" size="icon" onClick={() => setSharingTrade(trade)}>
                                <Share2 className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="icon" onClick={() => { setEditingTrade(trade); setFormOpen(true); }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(trade.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="mt-6 overflow-hidden rounded-2xl border border-border">
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalTradePages}
                    itemLabel="screenbook pages"
                    onPrevious={() => setScreenbookPage((page) => Math.max(1, page - 1))}
                    onNext={() => setScreenbookPage((page) => Math.min(totalTradePages, page + 1))}
                  />
                </div>
              </SectionCard>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <TradeFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);

          if (!open) {
            setEditingTrade(null);
          }
        }}
        onSave={async (payload) => {
          const result = await saveTradeMutation.mutateAsync(payload);
          return result.trade;
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

      {sharingTrade ? (
        <ShareTradeModal
          open={Boolean(sharingTrade)}
          onOpenChange={(open) => !open && setSharingTrade(null)}
          trade={sharingTrade}
          accountName={accountNames[sharingTrade.accountId]}
        />
      ) : null}

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(openState) => !openState && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trade</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Linked trade reviews remain in Reviews as journal history.
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
    </PageShell>
  );
}
