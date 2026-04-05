import { SetupPreTradeSection, type SetupChecklistDraftItem } from "@/features/setups/components/SetupPreTradeSection";

export function SetupBuilderChecklistStep({
  setupId,
  items,
  onItemsChange,
}: {
  setupId: string | null;
  items: SetupChecklistDraftItem[];
  onItemsChange: (updater: (current: SetupChecklistDraftItem[]) => SetupChecklistDraftItem[]) => void;
}) {
  return (
    <div className="space-y-5">
      <SetupPreTradeSection setupId={setupId} items={items} onItemsChange={onItemsChange} />
    </div>
  );
}
