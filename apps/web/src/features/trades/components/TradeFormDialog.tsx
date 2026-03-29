import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FloatingActionPanel } from "@/components/ui/floating-action-panel";
import type { Account, SetupDefinition, Trade } from "@/types";
import {
  TradeActionsBar,
  TradeChecklistSection,
  TradeContextFields,
  TradeCoreFields,
  TradeJournalSection,
  TradeScreenshotSection,
  type TradeSavePayload,
  useTradeFormController,
} from "./TradeForm";

interface TradeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (trade: TradeSavePayload) => Promise<Trade | void> | Trade | void;
  editTrade?: Trade | null;
  accounts: Account[];
  setups: SetupDefinition[];
  isSaving?: boolean;
  onScreenshotsChange?: (trade: Trade) => void;
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
  const controller = useTradeFormController({
    isActive: open,
    onSave,
    editTrade,
    accounts,
    setups,
    onScreenshotsChange,
    onComplete: () => onOpenChange(false),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] w-[calc(100vw-1rem)] max-w-3xl overflow-y-auto rounded-2xl p-4 sm:w-[calc(100vw-2rem)] sm:p-6">
        <DialogHeader>
          <DialogTitle>{editTrade ? "Edit Trade" : "New Trade"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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

          <TradeScreenshotSection
            activeTrade={controller.activeTrade}
            draftScreenshots={controller.draftScreenshots}
            setDraftScreenshots={controller.setDraftScreenshots}
            handleScreenshotsChange={controller.handleScreenshotsChange}
          />
        </div>

        <div className="sticky bottom-0 z-10 flex justify-end pb-1 pt-4">
          <FloatingActionPanel className="w-full sm:w-auto sm:min-w-[320px]">
            <TradeActionsBar
              onCancel={() => onOpenChange(false)}
              onSave={controller.handleSave}
              isSaving={isSaving}
              isUploadingDraftScreenshots={controller.isUploadingDraftScreenshots}
              isDisabled={controller.isSaveBlocked}
              saveLabel={controller.activeTrade ? "Update Trade" : "Save Trade"}
              saveHint={controller.saveBlockReason}
            />
          </FloatingActionPanel>
        </div>
      </DialogContent>
    </Dialog>
  );
}
