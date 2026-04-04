import { PageHeader, PageShell } from "@/layouts/PageShell";
import { FloatingActionPanel } from "@/components/ui/floating-action-panel";
import type { Account, SetupDefinition, Trade } from "@/types";
import {
  TradeActionsBar,
  TradeChecklistSection,
  TradeContextFields,
  TradeCoreFields,
  TradeJournalSection,
  TradeScreenshotSection,
  TradeSummaryPanel,
  type TradeSavePayload,
  useTradeFormController,
} from "./TradeForm";

interface TradeFormPageProps {
  onSave: (trade: TradeSavePayload) => Promise<Trade | void> | Trade | void;
  onCancel: () => void;
  onComplete: (trade: Trade | null) => void;
  accounts: Account[];
  setups: SetupDefinition[];
  editTrade?: Trade | null;
  isSaving?: boolean;
  onScreenshotsChange?: (trade: Trade) => void;
}

export function TradeFormPage({
  onSave,
  onCancel,
  onComplete,
  accounts,
  setups,
  editTrade,
  isSaving = false,
  onScreenshotsChange,
}: TradeFormPageProps) {
  const controller = useTradeFormController({
    isActive: true,
    onSave,
    editTrade,
    accounts,
    setups,
    onScreenshotsChange,
    onComplete,
  });

  return (
    <PageShell size="wide">
      <PageHeader title={editTrade ? "Edit Trade" : "New Trade"} />
      <div className="grid gap-6 pb-28 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <TradeCoreFields
            form={controller.form}
            updateField={controller.updateField}
            availableAccountOptions={controller.availableAccountOptions}
            accounts={accounts}
            derivedDirection={controller.derivedDirection}
            derivedResult={controller.derivedResult}
            directionError={controller.directionError}
            takeProfitWarning={controller.takeProfitWarning}
          />

          <TradeContextFields
            form={controller.form}
            updateField={controller.updateField}
            availableSetupOptions={controller.availableSetupOptions}
          />

          <TradeJournalSection
            form={controller.form}
            updateField={controller.updateField}
          />

          <TradeScreenshotSection
            activeTrade={controller.activeTrade}
            draftScreenshots={controller.draftScreenshots}
            setDraftScreenshots={controller.setDraftScreenshots}
            handleScreenshotsChange={controller.handleScreenshotsChange}
          />
        </div>

        <div className="space-y-6">
          <TradeSummaryPanel
            selectedAccountLabel={controller.selectedAccount?.label ?? null}
            form={controller.form}
            derivedDirection={controller.derivedDirection}
            derivedResult={controller.derivedResult}
            selectedSetupName={controller.selectedSetup?.name ?? null}
            completedChecklistCount={controller.completedChecklistCount}
            totalChecklistCount={controller.checklistRules.length}
            requiredChecklistRemaining={controller.incompleteRequiredChecklistCount}
            screenshotCount={(controller.activeTrade?.screenshotAssets?.length ?? 0) + controller.draftScreenshots.length}
          />

          <TradeChecklistSection
            editTrade={editTrade}
            selectedSetup={controller.selectedSetup}
            selectedSetupId={controller.form.setupId === "__none" ? null : controller.form.setupId}
            checklistRules={controller.checklistRules}
            checklistSelections={controller.checklistSelections}
            checklistMode={controller.checklistMode}
            checklistErrorMessage={controller.checklistErrorMessage}
            isChecklistLoading={controller.isChecklistLoading}
            accountId={controller.form.accountId}
            setChecklistSelections={controller.setChecklistSelections}
          />
        </div>
      </div>

      <div className="fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] sm:w-auto">
        <FloatingActionPanel className="ml-auto w-full sm:min-w-[320px] sm:max-w-[420px]">
          <TradeActionsBar
            onCancel={onCancel}
            onSave={controller.handleSave}
            isSaving={isSaving}
            isUploadingDraftScreenshots={controller.isUploadingDraftScreenshots}
            isDisabled={controller.isSaveBlocked}
            saveLabel={editTrade ? "Update Trade" : "Save Trade"}
            saveHint={controller.saveBlockReason}
          />
        </FloatingActionPanel>
      </div>
    </PageShell>
  );
}
