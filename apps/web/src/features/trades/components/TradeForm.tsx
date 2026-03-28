import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { privateQueryKey } from "@/services/query-client";
import { useAuth } from "@/features/auth/auth-context";
import { listChecklistRules } from "@/services/api/checklist-rules";
import { uploadTradeScreenshot } from "@/services/api/screenshots";
import { ApiError } from "@/services/api/client";
import { ScreenshotUpload } from "@/features/screenshots/components/ScreenshotUpload";
import { TradeChecklistCard } from "@/features/checklist/components/TradeChecklistCard";
import { ResultBadge } from "./ResultBadge";
import { InstrumentSelect } from "./InstrumentSelect";
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

export type TradeFormValue = {
  date: string;
  accountId: string;
  pair: string;
  entry: string;
  stopLoss: string;
  takeProfit: string;
  quantity: string;
  lotSize: string;
  exitPrice: string;
  fees: string;
  riskAmount: string;
  riskPercent: string;
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

export type TradeSavePayload = {
  date: string;
  accountId: string;
  pair: string;
  direction: Direction;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  quantity?: number | null;
  lotSize?: number | null;
  exitPrice?: number | null;
  fees?: number | null;
  riskAmount?: number | null;
  riskPercent?: number | null;
  grossPnl?: number | null;
  netPnl?: number | null;
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
};

type TradeFormSharedProps = {
  isActive?: boolean;
  onSave: (trade: TradeSavePayload) => Promise<Trade | void> | Trade | void;
  editTrade?: Trade | null;
  accounts: Account[];
  setups: SetupDefinition[];
  isSaving?: boolean;
  onScreenshotsChange?: (trade: Trade) => void;
  onCancel: () => void;
  onComplete?: (trade: Trade | null) => void;
};

type FieldContainerProps = {
  children: ReactNode;
};

type UpdateField = <K extends keyof TradeFormValue>(field: K, value: TradeFormValue[K]) => void;

function FieldContainer({ children }: FieldContainerProps) {
  return <div className="space-y-2">{children}</div>;
}

function ReadonlyBadge({
  emptyLabel,
  children,
}: {
  emptyLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-10 items-center rounded-xl border border-input/65 bg-muted/35 px-3">
      {children ?? <span className="text-sm text-muted-foreground">{emptyLabel}</span>}
    </div>
  );
}

function buildEmptyForm(accounts: Account[]): TradeFormValue {
  return {
    date: new Date().toISOString().split("T")[0],
    accountId: accounts[0]?.id ?? "",
    pair: "XAUUSD",
    entry: "",
    stopLoss: "",
    takeProfit: "",
    quantity: "",
    lotSize: "",
    exitPrice: "",
    fees: "",
    riskAmount: "",
    riskPercent: "",
    profit: "",
    setupId: "__none",
    session: "London",
    emotion: "Calm",
    notes: "",
  };
}

export function useTradeFormController({
  isActive = true,
  onSave,
  editTrade,
  accounts,
  setups,
  onScreenshotsChange,
  onComplete,
}: Omit<TradeFormSharedProps, "isSaving" | "onCancel">) {
  const { user } = useAuth();
  const [form, setForm] = useState<TradeFormValue>(() => buildEmptyForm(accounts));
  const [checklistSelections, setChecklistSelections] = useState<Record<string, { checked: boolean }>>({});
  const [createdTrade, setCreatedTrade] = useState<Trade | null>(null);
  const [draftScreenshots, setDraftScreenshots] = useState<File[]>([]);
  const [isUploadingDraftScreenshots, setIsUploadingDraftScreenshots] = useState(false);
  const activeTrade = editTrade ?? createdTrade;

  const updateField: UpdateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

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
    if (!isActive) {
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
        quantity: editTrade.quantity === null || editTrade.quantity === undefined ? "" : String(editTrade.quantity),
        lotSize: editTrade.lotSize === null || editTrade.lotSize === undefined ? "" : String(editTrade.lotSize),
        exitPrice: editTrade.exitPrice === null || editTrade.exitPrice === undefined ? "" : String(editTrade.exitPrice),
        fees: editTrade.fees === null || editTrade.fees === undefined ? "" : String(editTrade.fees),
        riskAmount: editTrade.riskAmount === null || editTrade.riskAmount === undefined ? "" : String(editTrade.riskAmount),
        riskPercent: editTrade.riskPercent === null || editTrade.riskPercent === undefined ? "" : String(editTrade.riskPercent),
        profit: String(editTrade.profit),
        setupId: editTrade.setupId ?? "__none",
        session: editTrade.session ?? "",
        emotion: editTrade.emotion ?? "",
        notes: editTrade.notes,
      });
      return;
    }

    setForm(buildEmptyForm(accounts));
  }, [accounts, editTrade, isActive]);

  useEffect(() => {
    if (isActive) {
      return;
    }

    setCreatedTrade(null);
    setDraftScreenshots([]);
    setIsUploadingDraftScreenshots(false);
    setChecklistSelections({});
  }, [isActive]);

  const derivedResult = useMemo(() => deriveTradeResultFromProfit(form.profit), [form.profit]);
  const parsedProfit = useMemo(() => parseTradeProfitInput(form.profit), [form.profit]);
  const parsedEntry = useMemo(() => parseTradeNumericInput(form.entry), [form.entry]);
  const parsedStopLoss = useMemo(() => parseTradeNumericInput(form.stopLoss), [form.stopLoss]);
  const parsedTakeProfit = useMemo(() => parseTradeNumericInput(form.takeProfit), [form.takeProfit]);
  const parsedQuantity = useMemo(() => parseTradeNumericInput(form.quantity), [form.quantity]);
  const parsedLotSize = useMemo(() => parseTradeNumericInput(form.lotSize), [form.lotSize]);
  const parsedExitPrice = useMemo(() => parseTradeNumericInput(form.exitPrice), [form.exitPrice]);
  const parsedFees = useMemo(() => parseTradeNumericInput(form.fees), [form.fees]);
  const parsedRiskAmount = useMemo(() => parseTradeNumericInput(form.riskAmount), [form.riskAmount]);
  const parsedRiskPercent = useMemo(() => parseTradeNumericInput(form.riskPercent), [form.riskPercent]);
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

  const selectedSetupId = form.setupId === "__none" ? null : form.setupId;
  const selectedSetup = selectedSetupId
    ? setups.find((setup) => setup.id === selectedSetupId) ?? null
    : null;
  const selectedAccount = availableAccountOptions.find((account) => account.value === form.accountId) ?? null;
  const editTradeChecklistResponseMap = useMemo(() => new Map(
    (editTrade?.checklistResponses ?? [])
      .filter((response): response is NonNullable<Trade["checklistResponses"]>[number] & { checklistRuleId: string } => Boolean(response.checklistRuleId))
      .map((response) => [response.checklistRuleId, response]),
  ), [editTrade?.checklistResponses]);

  const checklistRulesQuery = useQuery({
    queryKey: privateQueryKey(
      user.id,
      "checklist-rules",
      "trade-form",
      form.accountId || "__account-required",
      selectedSetupId ?? "__all-setups",
    ),
    queryFn: async () => listChecklistRules({
      activeOnly: true,
      accountId: form.accountId || null,
      setupId: selectedSetupId,
      scopeMode: "applicable",
    }),
    enabled: isActive && Boolean(form.accountId),
  });

  const checklistRules = useMemo(
    () => checklistRulesQuery.data?.items ?? [],
    [checklistRulesQuery.data?.items],
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
  const completedChecklistCount = checklistRules.filter((rule) => checklistSelections[rule.id]?.checked).length;
  const isChecklistStrictlyBlocked = !editTrade && checklistMode === "strict" && incompleteRequiredChecklistCount > 0;

  useEffect(() => {
    if (!isActive || !form.accountId) {
      setChecklistSelections({});
      return;
    }

    setChecklistSelections((current) => Object.fromEntries(
      checklistRules.map((rule) => [
        rule.id,
        {
          checked: current[rule.id]?.checked ?? editTradeChecklistResponseMap.get(rule.id)?.checked ?? false,
        },
      ]),
    ));
  }, [checklistRules, editTradeChecklistResponseMap, form.accountId, isActive]);

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
      quantity: parsedQuantity,
      lotSize: parsedLotSize,
      exitPrice: parsedExitPrice,
      fees: parsedFees,
      riskAmount: parsedRiskAmount,
      riskPercent: parsedRiskPercent,
      profit: parsedProfit,
      netPnl: parsedProfit,
      grossPnl: parsedProfit !== null && parsedFees !== null ? Number((parsedProfit + parsedFees).toFixed(2)) : null,
      result: derivedResult,
      setupId: selectedSetupId,
      setup: selectedSetup?.name ?? null,
      session: form.session || null,
      emotion: form.emotion || null,
      notes: form.notes.trim(),
      checklistResponses: form.accountId && (!editTrade || checklistRules.length > 0)
        ? checklistRules.map((rule) => ({
          checklistRuleId: rule.id,
          checked: checklistSelections[rule.id]?.checked ?? false,
        }))
        : undefined,
      checklistScopeMode: form.accountId && (!editTrade || checklistRules.length > 0) ? "applicable" : undefined,
    });

    const persistedTrade: Trade | null = savedTrade && typeof savedTrade === "object"
      ? savedTrade
      : activeTrade;

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

    onComplete?.(persistedTrade ?? null);
  };

  return {
    form,
    updateField,
    activeTrade,
    availableAccountOptions,
    availableSetupOptions,
    derivedDirection,
    derivedResult,
    directionError,
    takeProfitWarning,
    selectedAccount,
    selectedSetup,
    checklistRules,
    checklistSelections,
    checklistMode,
    checklistErrorMessage,
    isChecklistLoading: checklistRules.length === 0 && checklistRulesQuery.isLoading,
    completedChecklistCount,
    incompleteRequiredChecklistCount,
    isChecklistStrictlyBlocked,
    draftScreenshots,
    setDraftScreenshots,
    isUploadingDraftScreenshots,
    handleSave,
    handleScreenshotsChange,
    setChecklistSelections,
    isSaveBlocked:
      accounts.length === 0
      || derivedResult === null
      || derivedDirection === null
      || parsedTakeProfit === null
      || isChecklistStrictlyBlocked,
  };
}

type TradeCoreFieldsProps = {
  form: TradeFormValue;
  updateField: UpdateField;
  availableAccountOptions: Array<{ value: string; label: string; isArchived: boolean }>;
  accounts: Account[];
  derivedDirection: Direction | null;
  derivedResult: Result | null;
  directionError: string | null;
  takeProfitWarning: string | null;
};

export function TradeCoreFields({
  form,
  updateField,
  availableAccountOptions,
  accounts,
  derivedDirection,
  derivedResult,
  directionError,
  takeProfitWarning,
}: TradeCoreFieldsProps) {
  return (
    <section className="surface space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-medium text-foreground">Core</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FieldContainer>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Account</Label>
          <Select value={form.accountId} onValueChange={(value) => updateField("accountId", value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {availableAccountOptions.map((account) => (
                <SelectItem key={account.value} value={account.value}>{account.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {accounts.length === 0 ? <p className="text-xs text-muted-foreground">Add an account before saving.</p> : null}
          {availableAccountOptions.some((account) => account.value === form.accountId && account.isArchived)
            ? <p className="text-xs text-muted-foreground">Archived account kept for historical edits.</p>
            : null}
        </FieldContainer>

        <FieldContainer>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Date</Label>
          <Input type="date" value={form.date} onChange={(event) => updateField("date", event.target.value)} />
        </FieldContainer>

        <FieldContainer>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Pair</Label>
          <InstrumentSelect value={form.pair} onChange={(value) => updateField("pair", value)} />
        </FieldContainer>

        <FieldContainer>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Direction</Label>
          <ReadonlyBadge emptyLabel="Auto">
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
            ) : null}
          </ReadonlyBadge>
          {directionError ? <p className="text-xs text-danger">{directionError}</p> : null}
        </FieldContainer>

        <FieldContainer>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Result</Label>
          <ReadonlyBadge emptyLabel="Auto">
            {derivedResult ? <ResultBadge result={derivedResult} /> : null}
          </ReadonlyBadge>
        </FieldContainer>

        <FieldContainer>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Entry</Label>
          <Input type="number" step="any" value={form.entry} onChange={(event) => updateField("entry", event.target.value)} />
        </FieldContainer>

        <FieldContainer>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Stop Loss</Label>
          <Input type="number" step="any" value={form.stopLoss} onChange={(event) => updateField("stopLoss", event.target.value)} />
        </FieldContainer>

        <FieldContainer>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Take Profit</Label>
          <Input type="number" step="any" value={form.takeProfit} onChange={(event) => updateField("takeProfit", event.target.value)} />
          {takeProfitWarning ? <p className="text-xs text-amber-600 dark:text-amber-300">{takeProfitWarning}</p> : null}
        </FieldContainer>

        <FieldContainer>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">PnL</Label>
          <Input type="number" step="any" value={form.profit} onChange={(event) => updateField("profit", event.target.value)} />
        </FieldContainer>
      </div>
    </section>
  );
}

type TradeContextFieldsProps = {
  form: TradeFormValue;
  updateField: UpdateField;
  availableSetupOptions: Array<{ value: string; label: string }>;
};

export function TradeContextFields({
  form,
  updateField,
  availableSetupOptions,
}: TradeContextFieldsProps) {
  return (
    <section className="surface space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-medium text-foreground">Context</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FieldContainer>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Exit Price</Label>
          <Input type="number" step="any" value={form.exitPrice} onChange={(event) => updateField("exitPrice", event.target.value)} />
        </FieldContainer>

        <FieldContainer>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Fees</Label>
          <Input type="number" step="any" value={form.fees} onChange={(event) => updateField("fees", event.target.value)} />
        </FieldContainer>

        <FieldContainer>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Quantity</Label>
          <Input type="number" step="any" value={form.quantity} onChange={(event) => updateField("quantity", event.target.value)} />
        </FieldContainer>

        <FieldContainer>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Lot Size</Label>
          <Input type="number" step="any" value={form.lotSize} onChange={(event) => updateField("lotSize", event.target.value)} />
        </FieldContainer>

        <FieldContainer>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Risk Amount</Label>
          <Input type="number" step="any" value={form.riskAmount} onChange={(event) => updateField("riskAmount", event.target.value)} />
        </FieldContainer>

        <FieldContainer>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Risk %</Label>
          <Input type="number" step="any" value={form.riskPercent} onChange={(event) => updateField("riskPercent", event.target.value)} />
        </FieldContainer>

        <div className="md:col-span-2">
          <FieldContainer>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Setup</Label>
            <Select value={form.setupId} onValueChange={(value) => updateField("setupId", value)}>
              <SelectTrigger><SelectValue placeholder="Select setup" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">No setup</SelectItem>
                {availableSetupOptions.map((setup) => (
                  <SelectItem key={setup.value} value={setup.value}>{setup.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldContainer>
        </div>

        <FieldContainer>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Session</Label>
          <Select
            value={form.session || "__none"}
            onValueChange={(value) => updateField("session", value === "__none" ? "" : value as TradeSession)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">Not set</SelectItem>
              {SESSIONS.map((session) => (
                <SelectItem key={session} value={session}>{session}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldContainer>

        <FieldContainer>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Emotion</Label>
          <Select
            value={form.emotion || "__none"}
            onValueChange={(value) => updateField("emotion", value === "__none" ? "" : value as TradeEmotion)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">Not set</SelectItem>
              {EMOTIONS.map((emotion) => (
                <SelectItem key={emotion} value={emotion}>{emotion}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldContainer>
      </div>
    </section>
  );
}

type TradeJournalSectionProps = {
  form: TradeFormValue;
  updateField: UpdateField;
};

export function TradeJournalSection({
  form,
  updateField,
}: TradeJournalSectionProps) {
  return (
    <section className="surface space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-medium text-foreground">Notes</h2>
      </div>

      <FieldContainer>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Notes</Label>
        <Textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} rows={5} />
      </FieldContainer>
    </section>
  );
}

type TradeChecklistSectionProps = {
  editTrade?: Trade | null;
  selectedSetup: SetupDefinition | null;
  selectedSetupId: string | null;
  checklistRules: ReturnType<typeof useTradeFormController>["checklistRules"];
  checklistSelections: Record<string, { checked: boolean }>;
  checklistMode: ChecklistEnforcementMode;
  checklistErrorMessage: string | null;
  isChecklistLoading: boolean;
  accountId: string;
  setChecklistSelections: Dispatch<SetStateAction<Record<string, { checked: boolean }>>>;
};

export function TradeChecklistSection({
  editTrade,
  selectedSetup,
  selectedSetupId,
  checklistRules,
  checklistSelections,
  checklistMode,
  checklistErrorMessage,
  isChecklistLoading,
  accountId,
  setChecklistSelections,
}: TradeChecklistSectionProps) {
  if (!accountId) {
    return (
      <TradeChecklistCard
        rules={[]}
        selections={{}}
        checklistMode={checklistMode}
      title="Pre-Trade"
      emptyTitle="No account selected"
      emptyDescription="Rules load from the selected account and setup."
      onToggle={() => undefined}
    />
  );
  }

  return (
    <TradeChecklistCard
      rules={checklistRules}
      selections={checklistSelections}
      checklistMode={checklistMode}
      isLoading={isChecklistLoading}
      errorMessage={checklistErrorMessage}
      title="Pre-Trade"
      description={
        checklistRules.length > 0
          ? editTrade
            ? selectedSetupId
              ? "Review before update."
              : "Review before update. Setup rules appear after you choose a setup."
            : selectedSetupId
              ? "Review before save."
              : "Review before save. Setup rules appear after you choose a setup."
          : selectedSetupId
            ? "No active items for this account and setup."
            : "No active items for this account."
      }
      emptyTitle={
        selectedSetupId
          ? `No items for ${selectedSetup?.name ?? "this setup"}`
          : "No account items"
      }
      emptyDescription={
        selectedSetupId
          ? "Active global, account, and setup rules appear here."
          : "Active global and account rules appear here. Setup rules appear after you choose a setup."
      }
      onToggle={(ruleId, checked) => setChecklistSelections((current) => ({
        ...current,
        [ruleId]: {
          checked,
        },
      }))}
    />
  );
}

type TradeScreenshotSectionProps = {
  activeTrade: Trade | null;
  draftScreenshots: File[];
  setDraftScreenshots: (files: File[]) => void;
  handleScreenshotsChange: (screenshots: TradeScreenshotAsset[]) => void;
};

export function TradeScreenshotSection({
  activeTrade,
  draftScreenshots,
  setDraftScreenshots,
  handleScreenshotsChange,
}: TradeScreenshotSectionProps) {
  return (
    <section className="surface space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-medium text-foreground">Screenshots</h2>
        <p className="mt-1 text-xs text-muted-foreground">Queued until the trade is saved.</p>
      </div>

      <ScreenshotUpload
        tradeId={activeTrade?.id}
        screenshots={activeTrade?.screenshotAssets ?? []}
        draftFiles={draftScreenshots}
        onDraftFilesChange={setDraftScreenshots}
        onChange={handleScreenshotsChange}
      />
    </section>
  );
}

type TradeSummaryPanelProps = {
  selectedAccountLabel: string | null;
  form: TradeFormValue;
  derivedDirection: Direction | null;
  derivedResult: Result | null;
  selectedSetupName: string | null;
  completedChecklistCount: number;
  totalChecklistCount: number;
  requiredChecklistRemaining: number;
  screenshotCount: number;
};

export function TradeSummaryPanel({
  selectedAccountLabel,
  form,
  derivedDirection,
  derivedResult,
  selectedSetupName,
  completedChecklistCount,
  totalChecklistCount,
  requiredChecklistRemaining,
  screenshotCount,
}: TradeSummaryPanelProps) {
  return (
    <aside className="surface space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-medium text-foreground">Summary</h2>
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Account</p>
          <p className="mt-1 text-sm font-medium text-foreground">{selectedAccountLabel ?? "Not selected"}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Pair</p>
          <p className="mt-1 text-sm font-medium text-foreground">{form.pair || "Not set"}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Direction</p>
            <p className="mt-1 text-sm font-medium text-foreground">{derivedDirection ?? "Auto"}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Result</p>
            <p className="mt-1 text-sm font-medium text-foreground">{derivedResult ?? "Auto"}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Context</p>
          <p className="mt-1 text-sm font-medium text-foreground">{selectedSetupName ?? "No setup"}</p>
          <p className="mt-1 text-xs text-muted-foreground">{form.session || "No session"} / {form.emotion || "No emotion"}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Checklist</p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {totalChecklistCount > 0 ? `${completedChecklistCount}/${totalChecklistCount} complete` : "No items"}
          </p>
          {requiredChecklistRemaining > 0 ? (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-300">{requiredChecklistRemaining} required open</p>
          ) : null}
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Screenshots</p>
          <p className="mt-1 text-sm font-medium text-foreground">{screenshotCount} file{screenshotCount === 1 ? "" : "s"}</p>
        </div>
      </div>
    </aside>
  );
}

type TradeActionsBarProps = {
  onCancel: () => void;
  onSave: () => Promise<void> | void;
  isSaving: boolean;
  isUploadingDraftScreenshots: boolean;
  isDisabled: boolean;
  saveLabel: string;
  className?: string;
};

export function TradeActionsBar({
  onCancel,
  onSave,
  isSaving,
  isUploadingDraftScreenshots,
  isDisabled,
  saveLabel,
  className,
}: TradeActionsBarProps) {
  return (
    <div className={className ?? "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"}>
      <Button className="w-full sm:w-auto" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button
        onClick={() => void onSave()}
        className="w-full sm:w-auto"
        disabled={isSaving || isUploadingDraftScreenshots || isDisabled}
      >
        {isUploadingDraftScreenshots ? "Uploading screenshots..." : isSaving ? "Saving..." : saveLabel}
      </Button>
    </div>
  );
}
