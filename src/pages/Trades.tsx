import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Camera,
  CameraOff,
  ChevronLeft,
  ChevronRight,
  Eye,
  Images,
  LayoutList,
  MessageSquarePlus,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { TradeReviewDialog } from "@/components/TradeReviewDialog";
import { TradeReviewStatusBadge } from "@/components/TradeReviewStatusBadge";
import { ProfitDisplay } from "@/components/ProfitDisplay";
import { ResultBadge } from "@/components/ResultBadge";
import { TradeFormDialog } from "@/components/TradeFormDialog";
import { filterTradesByAccount, useAccountFilter } from "@/lib/account-filter";
import { getAccounts } from "@/lib/accounts";
import { getReviews, addReview } from "@/lib/reviews";
import { getSetups } from "@/lib/setups";
import { addTrade, deleteTrade, getTrades, updateTrade } from "@/lib/trades";
import { EMOTIONS, Review, SESSIONS, Trade, TradeEmotion, TradeSession } from "@/lib/types";
import { cn } from "@/lib/utils";
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
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      delay: i * 0.03,
    },
  }),
};

const LEDGER_PAGE_SIZE = 10;
const SCREENBOOK_PAGE_SIZE = 9;

const directionStyles = {
  Buy: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Sell: "border-rose-200 bg-rose-50 text-rose-700",
} as const;

const emotionStyles: Record<TradeEmotion, string> = {
  Calm: "border-sky-200 bg-sky-50 text-sky-700",
  Focused: "border-teal-200 bg-teal-50 text-teal-700",
  Confident: "border-violet-200 bg-violet-50 text-violet-700",
  Anxious: "border-rose-200 bg-rose-50 text-rose-700",
  Frustrated: "border-amber-200 bg-amber-50 text-amber-700",
};

const sessionStyles: Record<TradeSession, string> = {
  Asia: "border-slate-200 bg-slate-50 text-slate-700",
  London: "border-blue-200 bg-blue-50 text-blue-700",
  "New York": "border-indigo-200 bg-indigo-50 text-indigo-700",
};

function compactSetupLabel(setup: string) {
  const normalized = setup.trim();
  const lower = normalized.toLowerCase();

  if (!normalized) return "";
  if (lower === "support/resistance") return "S/R";
  if (lower === "support resistance") return "S/R";
  if (lower === "breakout") return "BO";
  if (lower === "pullback") return "PB";

  const parts = normalized.split(/[\s/-]+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].length <= 10 ? parts[0] : `${parts[0].slice(0, 8)}…`;
  }

  const initials = parts.map((part) => part[0]?.toUpperCase()).join("");
  return initials.length <= 4 ? initials : initials.slice(0, 4);
}

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
    <div className="min-w-[180px] space-y-2">
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

function SetupChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium tracking-[0.12em] text-slate-700">
      {compactSetupLabel(label)}
    </span>
  );
}

function EmotionChip({ emotion }: { emotion?: TradeEmotion }) {
  if (!emotion) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium", emotionStyles[emotion])}>
      {emotion}
    </span>
  );
}

function SessionChip({ session }: { session?: TradeSession }) {
  if (!session) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium", sessionStyles[session])}>
      {session}
    </span>
  );
}

function PaginationControls({
  currentPage,
  totalPages,
  itemLabel,
  onPrevious,
  onNext,
}: {
  currentPage: number;
  totalPages: number;
  itemLabel: string;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t bg-background/60 px-4 py-3">
      <p className="text-sm text-muted-foreground">
        Page <span className="font-medium text-foreground">{currentPage}</span> of{" "}
        <span className="font-medium text-foreground">{totalPages}</span> {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-9 rounded-xl px-3" onClick={onPrevious} disabled={currentPage === 1}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Previous
        </Button>
        <Button variant="outline" size="sm" className="h-9 rounded-xl px-3" onClick={onNext} disabled={currentPage === totalPages}>
          Next
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function Trades() {
  const [trades, setTrades] = useState<Trade[]>(() => getTrades());
  const [reviews, setReviews] = useState<Review[]>(() => getReviews());
  const [formOpen, setFormOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [reviewTrade, setReviewTrade] = useState<Trade | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [accountFilter, setAccountFilter] = useAccountFilter();
  const [sessionFilter, setSessionFilter] = useState<string>("all");
  const [setupFilter, setSetupFilter] = useState<string>("all");
  const [emotionFilter, setEmotionFilter] = useState<string>("all");
  const [activeView, setActiveView] = useState<"ledger" | "screenbook">("ledger");
  const [ledgerPage, setLedgerPage] = useState(1);
  const [screenbookPage, setScreenbookPage] = useState(1);
  const navigate = useNavigate();

  const accounts = useMemo(() => getAccounts(), [trades, accountFilter]);
  const setups = useMemo(() => getSetups(), [trades]);
  const accountNames = useMemo(
    () => Object.fromEntries(accounts.map((account) => [account.id, account.name])),
    [accounts],
  );
  const tradeReviewMap = useMemo(
    () =>
      Object.fromEntries(
        reviews
          .filter((review) => review.reviewScope === "trade" && review.tradeId)
          .map((review) => [review.tradeId as string, review]),
      ),
    [reviews],
  );

  const filteredTrades = useMemo(() => {
    return filterTradesByAccount(trades, accountFilter).filter((trade) => {
      if (sessionFilter !== "all" && trade.session !== sessionFilter) return false;
      if (setupFilter !== "all" && trade.setup !== setupFilter) return false;
      if (emotionFilter !== "all" && trade.emotion !== emotionFilter) return false;
      return true;
    });
  }, [accountFilter, emotionFilter, sessionFilter, setupFilter, trades]);

  const ledgerTotalPages = Math.max(1, Math.ceil(filteredTrades.length / LEDGER_PAGE_SIZE));
  const screenbookTotalPages = Math.max(1, Math.ceil(filteredTrades.length / SCREENBOOK_PAGE_SIZE));
  const currentLedgerPage = Math.min(ledgerPage, ledgerTotalPages);
  const currentScreenbookPage = Math.min(screenbookPage, screenbookTotalPages);
  const ledgerTrades = useMemo(() => {
    const startIndex = (currentLedgerPage - 1) * LEDGER_PAGE_SIZE;
    return filteredTrades.slice(startIndex, startIndex + LEDGER_PAGE_SIZE);
  }, [currentLedgerPage, filteredTrades]);
  const screenbookTrades = useMemo(() => {
    const startIndex = (currentScreenbookPage - 1) * SCREENBOOK_PAGE_SIZE;
    return filteredTrades.slice(startIndex, startIndex + SCREENBOOK_PAGE_SIZE);
  }, [currentScreenbookPage, filteredTrades]);

  useEffect(() => {
    setLedgerPage(1);
    setScreenbookPage(1);
  }, [accountFilter, emotionFilter, sessionFilter, setupFilter]);

  useEffect(() => {
    if (ledgerPage > ledgerTotalPages) {
      setLedgerPage(ledgerTotalPages);
    }
  }, [ledgerPage, ledgerTotalPages]);

  useEffect(() => {
    if (screenbookPage > screenbookTotalPages) {
      setScreenbookPage(screenbookTotalPages);
    }
  }, [screenbookPage, screenbookTotalPages]);

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
          },
        },
      });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;

    deleteTrade(deleteId);
    setDeleteId(null);
    refresh();
  };

  const handleSaveTradeReview = (review: Review) => {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...draft } = review;
    addReview(draft);
    setReviewTrade(null);
    setReviews(getReviews());
    toast.success("Trade review created.");
  };

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
            <div className="grid flex-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FilterField
                label="Account"
                value={accountFilter}
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
                options={[{ label: "All Setups", value: "all" }, ...setups.map((setup) => ({ label: setup.name, value: setup.name }))]}
              />
              <FilterField
                label="Emotion"
                value={emotionFilter}
                onValueChange={setEmotionFilter}
                options={[{ label: "All Emotions", value: "all" }, ...EMOTIONS.map((emotion) => ({ label: emotion, value: emotion }))]}
              />
            </div>

            <div className="rounded-2xl border bg-background/60 px-4 py-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{filteredTrades.length}</span>{" "}
              {filteredTrades.length === 1 ? "trade" : "trades"} in view
            </div>
          </div>
        </div>

        {trades.length === 0 ? (
          <div className="rounded-2xl border bg-card p-16 text-center shadow-sm">
            <p className="text-base font-medium text-foreground">No trades logged yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">Start building your execution journal with your first trade.</p>
            <Button className="mt-4" size="sm" onClick={() => setFormOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Log your first trade
            </Button>
          </div>
        ) : (
          <Tabs value={activeView} onValueChange={(value) => setActiveView(value as "ledger" | "screenbook")} className="w-full">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <TabsList className="grid h-11 w-full max-w-[320px] grid-cols-2 rounded-2xl border bg-muted/40 p-1">
                <TabsTrigger value="ledger" className="rounded-xl gap-2 data-[state=active]:shadow-sm">
                  <LayoutList className="h-4 w-4" />
                  Ledger
                </TabsTrigger>
                <TabsTrigger value="screenbook" className="rounded-xl gap-2 data-[state=active]:shadow-sm">
                  <Images className="h-4 w-4" />
                  Screenbook
                </TabsTrigger>
              </TabsList>
              <p className="text-sm text-muted-foreground">
                Review the structured ledger or switch to a screenshot-first trade grid.
              </p>
            </div>

            <TabsContent value="ledger" className="mt-4">
              <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                <div className="overflow-x-hidden">
                  <table className="w-full table-fixed text-left">
                    <thead>
                      <tr className="border-b border-border/70 bg-muted/35">
                        {["Date", "Pair", "Result", "Profit", "Session", "Setup", "Emotion", "Review", "Account", "Position", "Journal", "Actions"].map((header) => (
                          <th
                            key={header}
                            className={cn(
                              "sticky top-0 z-10 bg-muted/90 px-3 py-3 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground backdrop-blur",
                              header === "Journal" && "w-[112px] text-center",
                              header === "Actions" && "w-[88px] text-right",
                              header === "Date" && "w-[82px]",
                              header === "Pair" && "w-[120px]",
                              header === "Result" && "w-[78px]",
                              header === "Profit" && "w-[108px]",
                              header === "Session" && "w-[102px]",
                              header === "Setup" && "w-[92px]",
                              header === "Emotion" && "w-[118px]",
                              header === "Review" && "w-[132px]",
                              header === "Account" && "w-[96px]",
                              header === "Position" && "w-[116px]",
                              header === "Profit" && "text-right",
                            )}
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerTrades.map((trade, index) => {
                        const linkedReview = tradeReviewMap[trade.id];

                        return (
                          <motion.tr
                            key={trade.id}
                            custom={index}
                            variants={rowVariants}
                            initial="hidden"
                            animate="visible"
                            className="group border-b border-border/60 last:border-b-0 transition-colors hover:bg-muted/20"
                          >
                            <td className="px-3 py-4 align-top">
                              <button type="button" className="text-left" onClick={() => navigate(`/trades/${trade.id}`)}>
                                <p className="text-sm font-medium text-foreground">{format(parseISO(trade.date), "MMM d")}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{format(parseISO(trade.date), "yyyy")}</p>
                              </button>
                            </td>
                            <td className="px-3 py-4 align-top">
                              <button type="button" className="text-left" onClick={() => navigate(`/trades/${trade.id}`)}>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-foreground xl:text-base">{trade.pair}</p>
                                  {trade.screenshots.length > 0 ? <Camera className="h-4 w-4 text-muted-foreground" /> : null}
                                </div>
                                <span className={cn("mt-2 inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", directionStyles[trade.direction])}>
                                  {trade.direction}
                                </span>
                              </button>
                            </td>
                            <td className="px-3 py-4 align-top">
                              <ResultBadge result={trade.result} />
                            </td>
                            <td className="px-3 py-4 text-right align-top">
                              <ProfitDisplay value={trade.profit} className="text-base font-semibold xl:text-lg" />
                            </td>
                            <td className="px-3 py-4 align-top">
                              <SessionChip session={trade.session} />
                            </td>
                            <td className="px-3 py-4 align-top">
                              {trade.setup ? <SetupChip label={trade.setup} /> : <span className="text-sm text-muted-foreground">—</span>}
                            </td>
                            <td className="px-3 py-4 align-top">
                              <EmotionChip emotion={trade.emotion} />
                            </td>
                            <td className="overflow-hidden px-3 py-4 align-top">
                              <TradeReviewStatusBadge trade={trade} reviewed={!!linkedReview} />
                            </td>
                            <td className="px-3 py-4 align-top">
                              <p className="truncate text-sm font-medium text-foreground">{accountNames[trade.accountId || ""] || "Main Account"}</p>
                            </td>
                            <td className="px-3 py-4 align-top">
                              <div className="space-y-1 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="min-w-9 uppercase tracking-[0.14em] text-muted-foreground">EN</span>
                                  <span className="font-mono-price text-xs text-foreground xl:text-sm">{trade.entry}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="min-w-9 uppercase tracking-[0.14em] text-muted-foreground">SL</span>
                                  <span className="font-mono-price text-xs text-foreground xl:text-sm">{trade.stopLoss}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="min-w-9 uppercase tracking-[0.14em] text-muted-foreground">TP</span>
                                  <span className="font-mono-price text-xs text-foreground xl:text-sm">{trade.takeProfit}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-4 align-top">
                              <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  title="View trade"
                                  className="h-9 rounded-xl px-2.5"
                                  onClick={() => navigate(`/trades/${trade.id}`)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {!linkedReview ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    title="Add review"
                                    className="h-9 rounded-xl px-2.5"
                                    onClick={() => setReviewTrade(trade)}
                                  >
                                    <MessageSquarePlus className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    title="Open review"
                                    className="h-9 rounded-xl px-2.5"
                                    onClick={() => navigate(`/trades/${trade.id}`)}
                                  >
                                    <MessageSquarePlus className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-4 align-top">
                              <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                                <button
                                  type="button"
                                  title="Edit trade"
                                  aria-label="Edit trade"
                                  className="rounded-lg p-2 transition-colors hover:bg-accent"
                                  onClick={() => {
                                    setEditingTrade(trade);
                                    setFormOpen(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4 text-muted-foreground" />
                                </button>
                                <button
                                  type="button"
                                  title="Delete trade"
                                  aria-label="Delete trade"
                                  className="rounded-lg p-2 transition-colors hover:bg-destructive/10"
                                  onClick={() => setDeleteId(trade.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                      {filteredTrades.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="px-6 py-16 text-center">
                            <p className="text-base font-medium text-foreground">No trades match these filters.</p>
                            <p className="mt-2 text-sm text-muted-foreground">Adjust your account, session, setup, or emotion filters to widen the ledger view.</p>
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
                <PaginationControls
                  currentPage={currentLedgerPage}
                  totalPages={ledgerTotalPages}
                  itemLabel="in ledger"
                  onPrevious={() => setLedgerPage((page) => Math.max(1, page - 1))}
                  onNext={() => setLedgerPage((page) => Math.min(ledgerTotalPages, page + 1))}
                />
              </div>
            </TabsContent>

            <TabsContent value="screenbook" className="mt-4">
              {filteredTrades.length === 0 ? (
                <div className="rounded-2xl border bg-card p-12 text-center shadow-sm">
                  <p className="text-base font-medium text-foreground">No trades match these filters.</p>
                  <p className="mt-2 text-sm text-muted-foreground">Try broadening the ledger filters to bring more screenshot entries into view.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {screenbookTrades.map((trade, index) => {
                    const preview = trade.screenshots[0];
                    const linkedReview = tradeReviewMap[trade.id];

                    return (
                      <motion.article
                        key={trade.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1], delay: index * 0.03 }}
                        className="group overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <button type="button" className="block w-full text-left" onClick={() => navigate(`/trades/${trade.id}`)}>
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
                              {trade.screenshots.length > 0 ? (
                                <span className="inline-flex items-center rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm">
                                  <Camera className="mr-1 h-3.5 w-3.5" />
                                  {trade.screenshots.length}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="space-y-4 p-5">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h2 className="text-base font-semibold text-foreground">{trade.pair}</h2>
                                  <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", directionStyles[trade.direction])}>
                                    {trade.direction}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {formatTradeDate(trade.date)}
                                  {` • ${accountNames[trade.accountId || ""] || "Main Account"}`}
                                </p>
                              </div>
                              <ProfitDisplay value={trade.profit} className="text-base font-semibold" />
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <SessionChip session={trade.session} />
                              {trade.setup ? <SetupChip label={trade.setup} /> : null}
                              <EmotionChip emotion={trade.emotion} />
                            </div>

                            <div className="flex items-center justify-between gap-3 rounded-2xl border bg-background/60 px-3 py-3">
                              <TradeReviewStatusBadge trade={trade} reviewed={!!linkedReview} />
                              <div className="text-right text-xs">
                                <p className="uppercase tracking-[0.18em] text-muted-foreground">EN / SL / TP</p>
                                <p className="mt-1 font-mono-price text-sm text-foreground">
                                  {trade.entry} / {trade.stopLoss} / {trade.takeProfit}
                                </p>
                              </div>
                            </div>
                          </div>
                        </button>

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-5 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button variant="outline" size="sm" className="h-9 rounded-xl px-3" onClick={() => navigate(`/trades/${trade.id}`)}>
                              <Eye className="mr-1.5 h-4 w-4" />
                              View Trade
                            </Button>
                            {!linkedReview ? (
                              <Button variant="outline" size="sm" className="h-9 rounded-xl px-3" onClick={() => setReviewTrade(trade)}>
                                <MessageSquarePlus className="mr-1.5 h-4 w-4" />
                                Add Review
                              </Button>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              title="Edit trade"
                              aria-label="Edit trade"
                              className="rounded-lg p-2 transition-colors hover:bg-accent"
                              onClick={() => {
                                setEditingTrade(trade);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                            </button>
                            <button
                              type="button"
                              title="Delete trade"
                              aria-label="Delete trade"
                              className="rounded-lg p-2 transition-colors hover:bg-destructive/10"
                              onClick={() => setDeleteId(trade.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </button>
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              )}
              <PaginationControls
                currentPage={currentScreenbookPage}
                totalPages={screenbookTotalPages}
                itemLabel="in screenbook"
                onPrevious={() => setScreenbookPage((page) => Math.max(1, page - 1))}
                onNext={() => setScreenbookPage((page) => Math.min(screenbookTotalPages, page + 1))}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>

      <TradeFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingTrade(null);
        }}
        onSave={handleSave}
        editTrade={editingTrade}
      />

      {reviewTrade ? (
        <TradeReviewDialog
          open={!!reviewTrade}
          onOpenChange={(open) => {
            if (!open) setReviewTrade(null);
          }}
          trade={reviewTrade}
          review={null}
          onSave={handleSaveTradeReview}
        />
      ) : null}

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
