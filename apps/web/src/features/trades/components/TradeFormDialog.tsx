import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { ScreenshotUpload } from "@/features/screenshots/components/ScreenshotUpload";
import { TradeChecklistCard } from "@/features/checklist/components/TradeChecklistCard";
import { ApiError } from "@/services/api/client";
import { listChecklistRules } from "@/services/api/checklist-rules";
import { uploadTradeScreenshot } from "@/services/api/screenshots";
import { getEconomicCalendarList } from "@/services/api/economic-calendar";
import { privateQueryKey } from "@/services/query-client";
import { useAuth } from "@/features/auth/auth-context";
import { getLocalDateKey, getTradeEventWarning } from "@/features/economic-calendar/utils";
import { InstrumentSelect } from "./InstrumentSelect";
import { ResultBadge } from "./ResultBadge";
import type {
  Account,
  ChecklistEnforcementMode,
  Direction,
  Result,
  SetupDefinition,
  Trade,
  TradeEmotion,
  TradeScreenshotAsset,
  TradeSession,
} from "@/types";
import { EMOTIONS, SESSIONS } from "@/types";
import {
  deriveTradeDirectionFromPrices,
  deriveTradeResultFromProfit,
  getTakeProfitDirectionWarning,
  getTradeDirectionError,
  parseTradeNumericInput,
  parseTradeProfitInput,
} from "@/utils/trade-results";

type TradeFormValue = {
  date: string;
  accountId: string;
  pair: string;
  entry: string;
  stopLoss: string;
  takeProfit: string;
  profit: string;
  setupId: string;
  session: TradeSession | "";
  emotion: TradeEmotion | "";
  notes: string;
  checklistResponses?: Array<{
    checklistRuleId: string;
    checked: boolean;
    note?: string | null;
  }>;
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
    checklistResponses?: Array<{
      checklistRuleId: string;
      checked: boolean;
      note?: string | null;
    }>;
    checklistScopeMode?: "applicable" | "exact";
  }) => Promise<Trade | void> | Trade | void;
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
    entry: "",
    stopLoss: "",
    takeProfit: "",
    profit: "",
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
  const { user } = useAuth();
  const [form, setForm] = useState<TradeFormValue>(() => buildEmptyForm(accounts));
  const [checklistSelections, setChecklistSelections] = useState<Record<string, { checked: boolean }>>({});
  const [createdTrade, setCreatedTrade] = useState<Trade | null>(null);
  const [draftScreenshots, setDraftScreenshots] = useState<File[]>([]);
  const [isUploadingDraftScreenshots, setIsUploadingDraftScreenshots] = useState(false);
  const activeTrade = editTrade ?? createdTrade;

  const availableAccountOptions = useMemo(() => {
    const baseOptions = accounts.map((account) => ({
      value: account.id,
      label: account.name,
      isArchived: false,
    }));

    if (editTrade?.account && !accounts.some((account) => account.id === editTrade.accountId)) {
      return [{ value: editTrade.accountId, label: `${editTrade.account.name} (archived)`, isArchived: true }, ...baseOptions];
    }

    return baseOptions;
  }, [accounts, editTrade?.account, editTrade?.accountId]);

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
        entry: String(editTrade.entry),
        stopLoss: String(editTrade.stopLoss),
        takeProfit: String(editTrade.takeProfit),
        profit: String(editTrade.profit),
        setupId: editTrade.setupId ?? "__none",
        session: editTrade.session ?? "",
        emotion: editTrade.emotion ?? "",
        notes: editTrade.notes,
      });
      return;
    }

    setForm(buildEmptyForm(accounts));
  }, [accounts, editTrade, open]);

  useEffect(() => {
    if (open) {
      return;
    }

    setCreatedTrade(null);
    setDraftScreenshots([]);
    setIsUploadingDraftScreenshots(false);
    setChecklistSelections({});
  }, [open]);

  const derivedResult = useMemo(() => deriveTradeResultFromProfit(form.profit), [form.profit]);
  const parsedProfit = useMemo(() => parseTradeProfitInput(form.profit), [form.profit]);
  const parsedEntry = useMemo(() => parseTradeNumericInput(form.entry), [form.entry]);
  const parsedStopLoss = useMemo(() => parseTradeNumericInput(form.stopLoss), [form.stopLoss]);
  const parsedTakeProfit = useMemo(() => parseTradeNumericInput(form.takeProfit), [form.takeProfit]);
  const derivedDirection = useMemo(
    () => deriveTradeDirectionFromPrices(form.entry, form.stopLoss),
    [form.entry, form.stopLoss],
  );
  const directionError = useMemo(
    () => getTradeDirectionError(form.entry, form.stopLoss),
    [form.entry, form.stopLoss],
  );
  const takeProfitWarning = useMemo(
    () => getTakeProfitDirectionWarning(form.entry, form.stopLoss, form.takeProfit),
    [form.entry, form.stopLoss, form.takeProfit],
  );
  const economicCalendarQuery = useQuery({
    queryKey: privateQueryKey(user.id, "economic-calendar", "trade-warning", form.date, form.pair),
    queryFn: () => getEconomicCalendarList({
      dateFrom: form.date,
      dateTo: form.date,
      impacts: ["high"],
      instrument: form.pair,
      relevantOnly: true,
    }),
    enabled: open,
  });
  const isTradeDateToday = form.date === getLocalDateKey(new Date());
  const tradeWarning = useMemo(() => {
    if (!isTradeDateToday) {
      return null;
    }

    return getTradeEventWarning({
      events: economicCalendarQuery.data?.items ?? [],
      instrument: form.pair,
      now: new Date(),
    });
  }, [economicCalendarQuery.data?.items, form.pair, isTradeDateToday]);
  const selectedSetupId = form.setupId === "__none" ? null : form.setupId;
  const selectedSetup = selectedSetupId
    ? setups.find((setup) => setup.id === selectedSetupId) ?? null
    : null;
  const setupChecklistRules = selectedSetup?.preTradeChecklist;
  const checklistRulesQuery = useQuery({
    queryKey: privateQueryKey(user.id, "checklist-rules", "trade-form", selectedSetupId ?? "__setup-required"),
    queryFn: async () => listChecklistRules({
      activeOnly: true,
      setupId: selectedSetupId,
      scopeMode: "exact",
    }),
    enabled: open && !editTrade && Boolean(selectedSetupId),
  });
  const checklistRules = useMemo(
    () => checklistRulesQuery.data?.items ?? setupChecklistRules ?? [],
    [checklistRulesQuery.data?.items, setupChecklistRules],
  );
  const checklistMode: ChecklistEnforcementMode = user.checklistEnforcementMode ?? "soft";
  const checklistErrorMessage = checklistRules.length === 0 && checklistRulesQuery.error instanceof ApiError
    ? checklistRulesQuery.error.message
    : checklistRules.length === 0 && checklistRulesQuery.error
      ? "Checklist rules could not be loaded right now."
      : null;
  const incompleteRequiredChecklistCount = checklistRules.filter(
    (rule) => rule.isRequired && !checklistSelections[rule.id]?.checked,
  ).length;
  const isChecklistStrictlyBlocked = !editTrade && checklistMode === "strict" && incompleteRequiredChecklistCount > 0;

  const handleSave = async () => {
    if (
      !form.accountId
      || derivedResult === null
      || parsedProfit === null
      || derivedDirection === null
      || parsedEntry === null
      || parsedStopLoss === null
      || parsedTakeProfit === null
    ) {
      return;
    }

    const savedTrade = await onSave({
      date: form.date,
      accountId: form.accountId,
      pair: form.pair,
      direction: derivedDirection,
      entry: parsedEntry,
      stopLoss: parsedStopLoss,
      takeProfit: parsedTakeProfit,
      profit: parsedProfit,
      result: derivedResult,
      setupId: form.setupId === "__none" ? null : form.setupId,
      setup: selectedSetup?.name ?? null,
      session: form.session || null,
      emotion: form.emotion || null,
      notes: form.notes.trim(),
      checklistResponses: selectedSetupId
        ? checklistRules.map((rule) => ({
        checklistRuleId: rule.id,
        checked: checklistSelections[rule.id]?.checked ?? false,
      }))
        : [],
      checklistScopeMode: selectedSetupId ? "exact" : undefined,
    });

    const persistedTrade = savedTrade ?? activeTrade;

    if (!activeTrade && savedTrade) {
      setCreatedTrade(savedTrade);
    }

    if (draftScreenshots.length > 0) {
      if (!persistedTrade) {
        toast.error("Trade saved, but screenshot upload could not start. Reopen the trade to add screenshots.");
        return;
      }

      setIsUploadingDraftScreenshots(true);

      try {
        let nextTrade = persistedTrade;
        const pendingFiles = [...draftScreenshots];

        for (const file of draftScreenshots) {
          const screenshot = await uploadTradeScreenshot({
            tradeId: nextTrade.id,
            file,
            sortOrder: nextTrade.screenshotAssets?.length ?? 0,
          });

          const nextScreenshots: TradeScreenshotAsset[] = [...(nextTrade.screenshotAssets ?? []), screenshot];

          nextTrade = {
            ...nextTrade,
            screenshotAssets: nextScreenshots,
            screenshots: nextScreenshots.map((item) => item.url),
          };

          setCreatedTrade(nextTrade);
          onScreenshotsChange?.(nextTrade);
          pendingFiles.shift();
          setDraftScreenshots([...pendingFiles]);
        }

        setDraftScreenshots([]);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Trade saved, but screenshot upload failed.";
        toast.error(message);
        return;
      } finally {
        setIsUploadingDraftScreenshots(false);
      }
    }

    onOpenChange(false);
  };

  const handleScreenshotsChange = (screenshots: TradeScreenshotAsset[]) => {
    if (!activeTrade) {
      return;
    }

    const updatedTrade = {
      ...activeTrade,
      screenshotAssets: screenshots,
      screenshots: screenshots.map((screenshot) => screenshot.url),
    };

    if (!editTrade) {
      setCreatedTrade(updatedTrade);
    }

    onScreenshotsChange?.(updatedTrade);
  };

  useEffect(() => {
    if (!open || editTrade || !selectedSetupId) {
      setChecklistSelections({});
      return;
    }

    setChecklistSelections((current) => Object.fromEntries(
      checklistRules.map((rule) => [
        rule.id,
        {
          checked: current[rule.id]?.checked ?? false,
        },
      ]),
    ));
  }, [checklistRules, editTrade, open, selectedSetupId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto rounded-2xl p-4 sm:w-[calc(100vw-2rem)] sm:p-6">
        <DialogHeader>
          <DialogTitle>{editTrade ? "Edit Trade" : "New Trade"}</DialogTitle>
        </DialogHeader>

        {tradeWarning ? (
          <Alert className="border-amber-400/30 bg-amber-500/10 text-amber-950 dark:text-amber-100">
            <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-300" />
            <AlertTitle>
              Relevant high-impact event
              {" "}
              {tradeWarning.direction === "upcoming" ? "in" : ""}
              {" "}
              {tradeWarning.minutesAway}
              m
              {tradeWarning.direction === "recent" ? " ago" : ""}
            </AlertTitle>
            <AlertDescription>
              {tradeWarning.event.currency}
              {" "}
              {tradeWarning.event.title}
              {" "}
              is within the
              {" "}
              {tradeWarning.thresholdMinutes}
              m risk window for
              {" "}
              {form.pair}
              .
              {" "}
              {tradeWarning.relevance.reason}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Account</Label>
            <Select value={form.accountId} onValueChange={(value) => setForm((current) => ({ ...current, accountId: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableAccountOptions.map((account) => <SelectItem key={account.value} value={account.value}>{account.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {accounts.length === 0 ? <p className="text-xs text-muted-foreground">Create an account before saving trades.</p> : null}
            {availableAccountOptions.some((account) => account.value === form.accountId && account.isArchived)
              ? <p className="text-xs text-muted-foreground">Archived accounts stay available here only so historical trades can still be edited safely.</p>
              : null}
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Date</Label>
            <Input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Pair</Label>
            <InstrumentSelect value={form.pair} onChange={(value) => setForm((current) => ({ ...current, pair: value }))} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Direction</Label>
            <div className="flex min-h-10 items-center rounded-xl border border-input/65 bg-muted/35 px-3">
              {derivedDirection ? (
                <span
                  className={
                    derivedDirection === "Buy"
                      ? "inline-flex items-center rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-xs font-medium text-success"
                      : "inline-flex items-center rounded-full border border-danger/20 bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger"
                  }
                >
                  {derivedDirection}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">Auto</span>
              )}
            </div>
            {directionError ? <p className="text-xs text-danger">{directionError}</p> : null}
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Result</Label>
            <div className="flex min-h-10 items-center rounded-xl border border-input/65 bg-muted/35 px-3">
              {derivedResult ? (
                <ResultBadge result={derivedResult} />
              ) : (
                <span className="text-sm text-muted-foreground">Auto</span>
              )}
            </div>
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
            {takeProfitWarning ? <p className="text-xs text-amber-600 dark:text-amber-300">{takeProfitWarning}</p> : null}
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">PnL</Label>
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

          {!editTrade ? (
            <div className="space-y-2 sm:col-span-2">
              {selectedSetupId ? (
                <TradeChecklistCard
                  rules={checklistRules}
                  selections={checklistSelections}
                  checklistMode={checklistMode}
                  isLoading={checklistRules.length === 0 && checklistRulesQuery.isLoading}
                  errorMessage={checklistErrorMessage}
                  title="Pre-Trade"
                  description={
                    checklistRules.length > 0
                      ? "Review the active checklist items attached to this setup before saving the trade."
                      : "This setup does not have an active pre-trade checklist yet."
                  }
                  emptyTitle={`No pre-trade items for ${selectedSetup?.name ?? "this setup"} yet.`}
                  emptyDescription="Setup-specific discipline lives in Setups and will appear here once items are added."
                  onToggle={(ruleId, checked) => setChecklistSelections((current) => ({
                    ...current,
                    [ruleId]: {
                      checked,
                    },
                  }))}
                />
              ) : (
                <TradeChecklistCard
                  rules={[]}
                  selections={{}}
                  checklistMode={checklistMode}
                  title="Pre-Trade"
                  description="Select a setup to load its active pre-trade checklist before saving this trade."
                  emptyTitle="No setup selected"
                  emptyDescription="Setup-specific discipline stays tied to the strategy you choose for this trade."
                  onToggle={() => undefined}
                />
              )}
            </div>
          ) : null}

          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Screenshots</Label>
            <ScreenshotUpload
              tradeId={activeTrade?.id}
              screenshots={activeTrade?.screenshotAssets ?? []}
              draftFiles={draftScreenshots}
              onDraftFilesChange={setDraftScreenshots}
              onChange={handleScreenshotsChange}
            />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
          <Button className="w-full sm:w-auto" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSave()}
            className="w-full sm:w-auto"
            disabled={
              isSaving
              || isUploadingDraftScreenshots
              || accounts.length === 0
              || derivedResult === null
              || derivedDirection === null
              || parsedTakeProfit === null
              || isChecklistStrictlyBlocked
            }
          >
            {isUploadingDraftScreenshots ? "Uploading screenshots..." : isSaving ? "Saving..." : activeTrade ? "Update Trade" : "Save Trade"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
