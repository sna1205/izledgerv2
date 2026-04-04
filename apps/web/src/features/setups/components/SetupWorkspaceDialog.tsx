import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FloatingActionPanel } from "@/components/ui/floating-action-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DataBadge } from "@/components/DataBadge";
import { SetupForm } from "@/features/setups/components/SetupForm";
import { SetupPreTradeSection } from "@/features/setups/components/SetupPreTradeSection";
import {
  buildStrategyForm,
  buildUniqueFormColor,
  resolveDisplayColor,
  toStrategyPayload,
  type SetupStrategyPayload,
  type StrategyFormState,
} from "@/features/setups/components/setup-form-state";
import { toast } from "@/components/ui/sonner";
import { normalizeSetupColor, type SetupDefinition } from "@/types";

export type WorkspaceTab = "strategy" | "pre-trade";

type SetupWorkspaceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setup: SetupDefinition | null;
  setups: SetupDefinition[];
  initialTab?: WorkspaceTab;
  isSavingStrategy?: boolean;
  onSaveStrategy: (setupId: string | null, payload: SetupStrategyPayload) => Promise<SetupDefinition>;
};

export function SetupWorkspaceDialog({
  open,
  onOpenChange,
  setup,
  setups,
  initialTab = "strategy",
  isSavingStrategy = false,
  onSaveStrategy,
}: SetupWorkspaceDialogProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialTab);
  const [currentSetup, setCurrentSetup] = useState<SetupDefinition | null>(setup);
  const [form, setForm] = useState<StrategyFormState>(() => buildStrategyForm(setup, setups));

  useEffect(() => {
    if (!open) {
      return;
    }

    setCurrentSetup(setup);
    setForm(buildStrategyForm(setup, setups));
    setActiveTab(initialTab);
  }, [initialTab, open, setup, setups]);

  const previewColor = resolveDisplayColor(form.color);
  const formColorLabel = normalizeSetupColor(form.color) ?? previewColor;
  const strategyPayload = useMemo(() => toStrategyPayload(form), [form]);

  const regenerateFormColor = () => {
    setForm((current) => ({
      ...current,
      color: buildUniqueFormColor(setups, currentSetup?.id),
    }));
  };

  const handleSaveStrategy = async () => {
    const savedSetup = await onSaveStrategy(currentSetup?.id ?? null, strategyPayload);

    setCurrentSetup(savedSetup);
    setForm(buildStrategyForm(savedSetup, setups));

    if (!setup) {
      setActiveTab("pre-trade");
      toast.success("Strategy saved. You can add setup-specific pre-trade items now.");
      return;
    }

    toast.success("Strategy updated.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] w-[calc(100vw-1rem)] max-w-5xl overflow-y-auto rounded-[32px] p-4 sm:w-[calc(100vw-2rem)] sm:p-6">
        <DialogHeader>
          <DialogTitle>{currentSetup ? currentSetup.name : "New Setup"}</DialogTitle>
          <DialogDescription>Manage strategy and pre-trade in one place.</DialogDescription>
        </DialogHeader>

        <div className="rounded-[28px] border border-border bg-card/70 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <DataBadge tone={form.isArchived ? "warning" : "primary"}>
                  {form.isArchived ? "Archived" : "Active"}
                </DataBadge>
                {currentSetup ? <DataBadge tone="neutral">Saved</DataBadge> : <DataBadge tone="neutral">Draft</DataBadge>}
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as WorkspaceTab)} className="w-full lg:w-auto">
              <TabsList className="grid h-auto w-full grid-cols-2 lg:w-[280px]">
                <TabsTrigger value="strategy">Strategy</TabsTrigger>
                <TabsTrigger value="pre-trade">Pre-Trade</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as WorkspaceTab)} className="space-y-6">
          <TabsContent value="strategy" className="space-y-6">
            <SetupForm
              form={form}
              onFormChange={(updater) => setForm((current) => updater(current))}
              previewColor={previewColor}
              formColorLabel={formColorLabel}
              onRegenerateColor={regenerateFormColor}
            />
          </TabsContent>

          <TabsContent value="pre-trade">
            <SetupPreTradeSection setup={currentSetup} isOpen={open && activeTab === "pre-trade"} />
          </TabsContent>
        </Tabs>

        <div className="sticky bottom-0 z-10 flex justify-end pb-1 pt-4">
          <FloatingActionPanel className="w-full sm:w-auto sm:min-w-[260px]">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {activeTab === "strategy" ? (
                <Button onClick={() => void handleSaveStrategy()} disabled={isSavingStrategy}>
                  {isSavingStrategy ? "Saving..." : "Save"}
                </Button>
              ) : null}
            </div>
          </FloatingActionPanel>
        </div>
      </DialogContent>
    </Dialog>
  );
}
