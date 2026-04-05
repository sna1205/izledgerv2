import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Archive, ArrowLeft, ChevronDown, Copy, Layers3, Pencil, Plus } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { PageErrorState } from "@/components/PageErrorState";
import { SetupTag } from "@/components/SetupTag";
import { SetupsSkeleton } from "@/components/skeletons/SetupsSkeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/features/auth/auth-context";
import { useUnauthorizedSessionGuard } from "@/features/auth/use-unauthorized-session-guard";
import { buildDuplicateSetupName } from "@/features/setups/setup-duplication";
import { PageShell } from "@/layouts/PageShell";
import { createChecklistRule } from "@/services/api/checklist-rules";
import { ApiError } from "@/services/api/client";
import { createSetup, listSetups, updateSetup, type SetupPayload } from "@/services/api/setups";
import { listTrades } from "@/services/api/trades";
import { privateQueryKey } from "@/services/query-client";
import { formatMoneyDisplay, formatNumberDisplay, formatPercentageDisplay } from "@/utils/analytics-rendering";
import { cn } from "@/utils/class-names";
import { withMinimumDelay } from "@/utils/loading";
import { getPageErrorState } from "@/utils/page-errors";
import type { SetupDefinition, Trade } from "@/types";
import { toast } from "@/components/ui/sonner";

const PLAYBOOK_TRADE_PAGE_SIZE = 8;
const DETAIL_QUERY_PAGE_SIZE = 100;

function invalidateSetupQueries(queryClient: ReturnType<typeof useQueryClient>, userId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "setups") }),
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "trades") }),
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "dashboard-summary") }),
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "analytics-breakdowns") }),
    queryClient.invalidateQueries({ queryKey: privateQueryKey(userId, "analytics-calendar") }),
  ]);
}

function splitRuleText(value?: string | null) {
  return (value ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s\-*•\d.)]+/, "").trim())
    .filter(Boolean);
}

function buildSectionItems(setup: SetupDefinition, key: "entryLogic" | "confirmationLogic" | "invalidationLogic") {
  const items = splitRuleText(setup[key]);

  if (items.length > 0) {
    return items;
  }

  if (!setup.description.trim()) {
    return [];
  }

  return key === "entryLogic" ? splitRuleText(setup.description) : [];
}

function formatTradeDate(date: string) {
  return format(parseISO(date), "MMM d");
}

function formatR(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "--";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumberDisplay(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}R`;
}

function ChecklistBadge({ required }: { required: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em]",
        required ? "bg-foreground/[0.08] text-foreground" : "bg-background/60 text-muted-foreground",
      )}
    >
      {required ? "Required" : "Optional"}
    </span>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
      {children}
    </h2>
  );
}

function PlaybookSection({
  title,
  items,
  tone = "default",
}: {
  title: string;
  items: string[];
  tone?: "default" | "danger";
}) {
  return (
    <section className="space-y-3">
      <SectionLabel>{title}</SectionLabel>
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item}
              className={cn(
                "text-sm leading-7 text-foreground",
                tone === "danger" && "text-rose-700 dark:text-rose-300",
              )}
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">None.</p>
      )}
    </section>
  );
}

export function SetupDetailPage() {
  const { user } = useAuth();
  const { id: routeSetupId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [checkedRules, setCheckedRules] = useState<Record<string, boolean>>({});

  const setupsQuery = useQuery({
    queryKey: privateQueryKey(user.id, "setups", "detail-source"),
    queryFn: async () => {
      const response = await withMinimumDelay(() => listSetups({
        page: 1,
        pageSize: DETAIL_QUERY_PAGE_SIZE,
        status: "all",
        sortBy: "name",
        sortOrder: "asc",
      }));
      return response.items;
    },
  });

  const currentSetup = useMemo(
    () => (setupsQuery.data ?? []).find((setup) => setup.id === routeSetupId) ?? null,
    [routeSetupId, setupsQuery.data],
  );

  const tradesQuery = useQuery({
    queryKey: privateQueryKey(user.id, "setups", routeSetupId, "recent-trades"),
    enabled: Boolean(routeSetupId),
    queryFn: async () => withMinimumDelay(() => listTrades({
      setupId: routeSetupId,
      page: 1,
      pageSize: PLAYBOOK_TRADE_PAGE_SIZE,
      sortBy: "date",
      sortOrder: "desc",
    })),
  });

  const allTradesQuery = useQuery({
    queryKey: privateQueryKey(user.id, "setups", routeSetupId, "stats-trades"),
    enabled: Boolean(routeSetupId),
    queryFn: async () => withMinimumDelay(() => listTrades({
      setupId: routeSetupId,
      page: 1,
      pageSize: DETAIL_QUERY_PAGE_SIZE,
      sortBy: "date",
      sortOrder: "desc",
    })),
  });

  useUnauthorizedSessionGuard(setupsQuery.error, tradesQuery.error, allTradesQuery.error);

  const duplicateMutation = useMutation({
    mutationFn: async (setup: SetupDefinition) => {
      const existingNames = (setupsQuery.data ?? []).map((item) => item.name);
      const payload: SetupPayload = {
        name: buildDuplicateSetupName(setup.name, existingNames),
        description: setup.description,
        entryLogic: setup.entryLogic ?? "",
        confirmationLogic: setup.confirmationLogic ?? "",
        invalidationLogic: setup.invalidationLogic ?? "",
        notes: setup.notes ?? "",
        color: setup.color,
        isArchived: false,
      };

      const result = await createSetup(payload);
      const createdSetupId = result.setup.id;

      for (const item of setup.preTradeChecklist ?? []) {
        await createChecklistRule({
          title: item.title,
          description: item.description,
          isRequired: item.isRequired,
          isActive: item.isActive,
          setupId: createdSetupId,
        });
      }

      return result.setup;
    },
    onSuccess: async (setup) => {
      await invalidateSetupQueries(queryClient, user.id);
      toast.success("Setup duplicated.");
      navigate(`/setups/${setup.id}`);
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not duplicate the setup right now.";
      toast.error(message);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async ({ setupId, isArchived }: { setupId: string; isArchived: boolean }) => {
      const result = await updateSetup(setupId, { isArchived });
      return result.setup;
    },
    onSuccess: async (setup) => {
      await invalidateSetupQueries(queryClient, user.id);
      toast.success(setup.isArchived ? "Setup archived." : "Setup restored.");
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not update the setup status right now.";
      toast.error(message);
    },
  });

  if (setupsQuery.isLoading && !setupsQuery.data) {
    return <SetupsSkeleton />;
  }

  if (setupsQuery.isError || tradesQuery.isError || allTradesQuery.isError) {
    const pageError = setupsQuery.error ?? tradesQuery.error ?? allTradesQuery.error;
    const errorState = getPageErrorState(pageError, {
      unavailableTitle: "Setup unavailable",
      unavailableDescription: "This setup could not be loaded right now. Please try again.",
      unauthorizedDescription: "Your session expired or could not be verified. Redirecting to login.",
      timeoutTitle: "Setup request timed out",
      timeoutDescription: "Loading this setup took too long. Please try again.",
    });

    return (
      <PageErrorState
        title={errorState.title}
        description={errorState.description}
        layout="page"
        size="wide"
        onRetry={errorState.allowRetry ? () => {
          void Promise.all([setupsQuery.refetch(), tradesQuery.refetch(), allTradesQuery.refetch()]);
        } : undefined}
        isRetrying={setupsQuery.isFetching || tradesQuery.isFetching || allTradesQuery.isFetching}
      />
    );
  }

  if (!currentSetup) {
    return (
      <PageShell size="wide">
        <EmptyState
          icon={Layers3}
          title="Setup not found"
          description="This setup does not exist anymore or you no longer have access to it."
          action={(
            <Button asChild>
              <Link to="/setups">Back to Setups</Link>
            </Button>
          )}
        />
      </PageShell>
    );
  }

  const entryItems = buildSectionItems(currentSetup, "entryLogic");
  const confirmationItems = buildSectionItems(currentSetup, "confirmationLogic");
  const invalidationItems = buildSectionItems(currentSetup, "invalidationLogic");
  const checklistItems = (currentSetup.preTradeChecklist ?? []).filter((item) => item.isActive);
  const recentTrades = tradesQuery.data?.items ?? [];
  const statTrades = allTradesQuery.data?.items ?? [];
  const winCount = statTrades.filter((trade) => trade.result === "Win").length;
  const completedChecklistCount = checklistItems.filter((item) => checkedRules[item.id]).length;
  const avgR = statTrades.length > 0
    ? statTrades.reduce((sum, trade) => sum + (trade.realizedR ?? 0), 0) / statTrades.length
    : null;

  return (
    <PageShell size="wide" className="bg-muted/[0.18] pb-40 sm:pb-44">
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-8">
          <div className="min-w-0 space-y-4">
            <div className="flex items-center gap-3">
              <SetupTag label={currentSetup.isArchived ? "Archived" : "Active"} color={currentSetup.color} />
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl">
                {currentSetup.name}
              </h1>
              {currentSetup.description.trim() ? (
                <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                  {currentSetup.description}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Trades</p>
              <p className="text-3xl font-semibold tracking-[-0.04em] text-foreground">
                {formatNumberDisplay(statTrades.length)}
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Win Rate</p>
              <p className="text-3xl font-semibold tracking-[-0.04em] text-foreground">
                {formatPercentageDisplay(statTrades.length > 0 ? (winCount / statTrades.length) * 100 : 0)}
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Avg R</p>
              <p className="text-3xl font-semibold tracking-[-0.04em] text-foreground">{formatR(avgR)}</p>
            </div>
          </div>
        </header>

        <section className="space-y-8">
          <SectionLabel>Setup Logic</SectionLabel>

          <div className="space-y-7 rounded-2xl bg-background/70 px-6 py-6 shadow-sm shadow-black/[0.03] ring-1 ring-black/5 dark:ring-white/5">
            <PlaybookSection title="Entry" items={entryItems.slice(0, 2)} />
            <PlaybookSection title="Confirmation" items={confirmationItems} />
            <PlaybookSection title="Invalidation" items={invalidationItems} tone="danger" />
          </div>
        </section>

        <section className="space-y-4">
          <div className="sticky top-20 z-20 -mx-2 rounded-xl bg-muted/[0.82] px-2 py-3 backdrop-blur">
            <div className="flex items-end justify-between gap-4">
              <div className="space-y-1">
                <SectionLabel>Checklist</SectionLabel>
                <p className="text-sm text-muted-foreground">Pre-trade control system</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">
                  {formatNumberDisplay(completedChecklistCount)}/{formatNumberDisplay(checklistItems.length)}
                </p>
                <p className="text-xs text-muted-foreground">complete</p>
              </div>
            </div>
          </div>

          {checklistItems.length > 0 ? (
            <div className="space-y-2">
              {checklistItems.map((item) => (
                <label
                  key={item.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-4 rounded-xl bg-background/72 px-4 py-4 shadow-sm shadow-black/[0.03] ring-1 ring-black/5 transition-colors hover:bg-background dark:ring-white/5",
                    checkedRules[item.id] && "bg-emerald-500/[0.08] ring-emerald-500/15",
                  )}
                >
                  <Checkbox
                    className="mt-0.5 h-5 w-5 rounded-md"
                    checked={Boolean(checkedRules[item.id])}
                    onCheckedChange={(checked) => {
                      setCheckedRules((current) => ({
                        ...current,
                        [item.id]: checked === true,
                      }));
                    }}
                    aria-label={item.title}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-base font-medium leading-6 text-foreground">{item.title}</span>
                      <ChecklistBadge required={item.isRequired} />
                    </div>
                    {item.description ? (
                      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{item.description}</p>
                    ) : null}
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No checklist items.</p>
          )}
        </section>

        {currentSetup.notes?.trim() ? (
          <details className="space-y-0 rounded-2xl bg-background/60 px-6 py-5 shadow-sm shadow-black/[0.03] ring-1 ring-black/5 dark:ring-white/5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <SectionLabel>Notes</SectionLabel>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </summary>
            <div className="pt-4">
              <p className="max-w-3xl whitespace-pre-line text-[15px] leading-7 text-foreground">
                {currentSetup.notes}
              </p>
            </div>
          </details>
        ) : null}

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <SectionLabel>Trade History</SectionLabel>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/trades" state={{ setupFilterId: currentSetup.id }}>
                View All
              </Link>
            </Button>
          </div>

          {recentTrades.length > 0 ? (
            <div className="overflow-hidden rounded-2xl bg-background/65 px-4 py-2 shadow-sm shadow-black/[0.03] ring-1 ring-black/5 dark:ring-white/5">
              <Table className="border-collapse">
                <TableHeader className="bg-transparent [&_tr]:border-border/35">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-0">Date</TableHead>
                    <TableHead>Pair</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>R</TableHead>
                    <TableHead className="text-right">PnL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTrades.map((trade: Trade) => (
                    <TableRow
                      key={trade.id}
                      className="cursor-pointer border-border/35 hover:bg-accent/8"
                      onClick={() => navigate(`/trades/${trade.id}`)}
                    >
                      <TableCell className="px-0 text-sm text-muted-foreground">{formatTradeDate(trade.date)}</TableCell>
                      <TableCell className="text-sm font-medium text-foreground">{trade.pair}</TableCell>
                      <TableCell className="text-sm text-foreground">{trade.result}</TableCell>
                      <TableCell className="text-sm text-foreground">{formatR(trade.realizedR)}</TableCell>
                      <TableCell className="text-right text-sm font-medium text-foreground">
                        {formatMoneyDisplay(trade.profit, { currency: trade.accountCurrency, fallback: "--" })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-background/60 px-5 py-5 shadow-sm shadow-black/[0.03] ring-1 ring-black/5 dark:ring-white/5">
              <p className="text-sm text-muted-foreground">No trades logged with this setup yet.</p>
              <Button
                onClick={() => navigate("/trades/new", { state: { prefillSetupId: currentSetup.id } })}
                disabled={currentSetup.isArchived}
              >
                <Plus className="h-4 w-4" />
                Use this setup
              </Button>
            </div>
          )}
        </section>

        <div aria-hidden="true" className="h-12 sm:h-16" />
      </div>

      <div className="fixed bottom-4 left-4 right-4 z-40">
        <div className="mx-auto flex w-full max-w-4xl justify-center">
          <div className="flex w-full flex-col gap-3 rounded-xl bg-background/92 px-3 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              <Button variant="ghost" className="rounded-lg px-3 text-muted-foreground" asChild>
                <Link to="/setups">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Link>
              </Button>
              <Button variant="ghost" className="rounded-lg px-3" asChild>
                <Link to={`/setups/${currentSetup.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <Button
                variant="ghost"
                className="rounded-lg px-3"
                onClick={() => duplicateMutation.mutate(currentSetup)}
                disabled={duplicateMutation.isPending}
              >
                <Copy className="h-4 w-4" />
                Duplicate
              </Button>
              <Button
                variant="ghost"
                className="rounded-lg px-3 text-muted-foreground"
                onClick={() => archiveMutation.mutate({
                  setupId: currentSetup.id,
                  isArchived: !currentSetup.isArchived,
                })}
                disabled={archiveMutation.isPending}
              >
                <Archive className="h-4 w-4" />
                {currentSetup.isArchived ? "Restore" : "Archive"}
              </Button>
            </div>

            <Button
              onClick={() => navigate("/trades/new", { state: { prefillSetupId: currentSetup.id } })}
              disabled={currentSetup.isArchived}
            >
              <Plus className="h-4 w-4" />
              Use Setup
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
