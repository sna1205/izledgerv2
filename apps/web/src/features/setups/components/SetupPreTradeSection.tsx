import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/features/auth/auth-context";
import { SetupChecklistEmptyState } from "@/features/setups/components/SetupChecklistEmptyState";
import { SetupChecklistItemRow } from "@/features/setups/components/SetupChecklistItemRow";
import { SetupChecklistQuickAdd } from "@/features/setups/components/SetupChecklistQuickAdd";
import { ApiError } from "@/services/api/client";
import {
  createChecklistRule,
  deleteChecklistRule,
  reorderChecklistRules,
  toggleChecklistRuleActive,
  updateChecklistRule,
  type ChecklistRulePayload,
} from "@/services/api/checklist-rules";
import { privateQueryKey } from "@/services/query-client";
import type { ChecklistRule } from "@/types";

export type SetupChecklistDraftItem = {
  id: string;
  title: string;
  description: string | null;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
  isLocalOnly: boolean;
  setupId: string | null;
  accountId: string | null;
};

function toChecklistDraftItem(rule: ChecklistRule): SetupChecklistDraftItem {
  return {
    id: rule.id,
    title: rule.title,
    description: rule.description,
    isRequired: rule.isRequired,
    isActive: rule.isActive,
    sortOrder: rule.sortOrder,
    isLocalOnly: false,
    setupId: rule.setupId,
    accountId: rule.accountId,
  };
}

export function buildChecklistDraftItems(rules: ChecklistRule[] = []): SetupChecklistDraftItem[] {
  return rules.map(toChecklistDraftItem);
}

export function createLocalChecklistDraftItem(title = ""): SetupChecklistDraftItem {
  return {
    id: `local-${crypto.randomUUID()}`,
    title,
    description: null,
    isRequired: false,
    isActive: true,
    sortOrder: 0,
    isLocalOnly: true,
    setupId: null,
    accountId: null,
  };
}

function normalizeChecklistItems(items: SetupChecklistDraftItem[]) {
  return items.map((item, index) => ({
    ...item,
    sortOrder: index,
  }));
}

function moveItem(items: SetupChecklistDraftItem[], fromIndex: number, toIndex: number) {
  if (toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) {
    return items;
  }

  const nextItems = [...items];
  const [moved] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, moved);
  return normalizeChecklistItems(nextItems);
}

function toRulePayload(item: SetupChecklistDraftItem, setupId: string): ChecklistRulePayload {
  return {
    title: item.title.trim(),
    description: item.description?.trim() ? item.description.trim() : null,
    isRequired: item.isRequired,
    isActive: item.isActive,
    setupId,
    accountId: null,
  };
}

export function SetupPreTradeSection({
  setupId,
  items,
  onItemsChange,
}: {
  setupId: string | null;
  items: SetupChecklistDraftItem[];
  onItemsChange: (updater: (current: SetupChecklistDraftItem[]) => SetupChecklistDraftItem[]) => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  const normalizedItems = useMemo(() => normalizeChecklistItems(items), [items]);
  const requiredCount = normalizedItems.filter((item) => item.isRequired).length;

  const invalidateChecklistData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: privateQueryKey(user.id, "checklist-rules") }),
      queryClient.invalidateQueries({ queryKey: privateQueryKey(user.id, "setups") }),
      queryClient.invalidateQueries({ queryKey: privateQueryKey(user.id, "trades") }),
    ]);
  };

  const createRuleMutation = useMutation({
    mutationFn: (payload: ChecklistRulePayload) => createChecklistRule(payload),
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not save the pre-trade item right now.";
      toast.error(message);
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ ruleId, payload }: { ruleId: string; payload: ChecklistRulePayload }) => updateChecklistRule(ruleId, payload),
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not update the pre-trade item right now.";
      toast.error(message);
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId: string) => deleteChecklistRule(ruleId),
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not delete the pre-trade item right now.";
      toast.error(message);
    },
  });

  const reorderRuleMutation = useMutation({
    mutationFn: (ruleIds: string[]) => reorderChecklistRules(ruleIds),
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not update the checklist order right now.";
      toast.error(message);
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: ({ ruleId, isActive }: { ruleId: string; isActive: boolean }) => toggleChecklistRuleActive(ruleId, isActive),
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Could not update the pre-trade item right now.";
      toast.error(message);
    },
  });

  const persistExistingRule = async (item: SetupChecklistDraftItem) => {
    if (!setupId || item.isLocalOnly || !item.title.trim()) {
      return;
    }

    await updateRuleMutation.mutateAsync({
      ruleId: item.id,
      payload: toRulePayload(item, setupId),
    });
    await invalidateChecklistData();
  };

  const persistOrderIfNeeded = async (nextItems: SetupChecklistDraftItem[]) => {
    if (!setupId) {
      return;
    }

    const persistedIds = nextItems.filter((item) => !item.isLocalOnly).map((item) => item.id);

    if (persistedIds.length === 0) {
      return;
    }

    await reorderRuleMutation.mutateAsync(persistedIds);
    await invalidateChecklistData();
  };

  const handleQuickAdd = async (title: string) => {
    const localItem = createLocalChecklistDraftItem(title);

    onItemsChange((current) => normalizeChecklistItems([...current, localItem]));

    if (!setupId) {
      return;
    }

    try {
      const response = await createRuleMutation.mutateAsync(toRulePayload(localItem, setupId));
      onItemsChange((current) => normalizeChecklistItems(
        current.map((item) => (
          item.id === localItem.id
            ? {
                ...toChecklistDraftItem(response.rule),
                sortOrder: item.sortOrder,
              }
            : item
        )),
      ));
      await persistOrderIfNeeded(normalizedItems.concat({
        ...toChecklistDraftItem(response.rule),
        sortOrder: normalizedItems.length,
      }));
      await invalidateChecklistData();
      toast.success("Pre-trade item added.");
    } catch {
      onItemsChange((current) => current.filter((item) => item.id !== localItem.id));
    }
  };

  const handleFieldChange = (itemId: string, updater: (item: SetupChecklistDraftItem) => SetupChecklistDraftItem) => {
    let nextItem: SetupChecklistDraftItem | null = null;

    onItemsChange((current) => normalizeChecklistItems(current.map((item) => {
      if (item.id !== itemId) {
        return item;
      }

      nextItem = updater(item);
      return nextItem;
    })));

    if (!nextItem) {
      return;
    }

    if (setupId && !nextItem.isLocalOnly && nextItem.title.trim()) {
      void persistExistingRule(nextItem);
    }
  };

  const handleDelete = async (item: SetupChecklistDraftItem) => {
    const previousItems = normalizedItems;
    const nextItems = previousItems.filter((currentItem) => currentItem.id !== item.id);
    onItemsChange(() => normalizeChecklistItems(nextItems));

    if (item.isLocalOnly || !setupId) {
      return;
    }

    try {
      await deleteRuleMutation.mutateAsync(item.id);
      await persistOrderIfNeeded(nextItems);
      await invalidateChecklistData();
      toast.success("Pre-trade item deleted.");
    } catch {
      onItemsChange(() => previousItems);
    }
  };

  const handleToggleActive = async (item: SetupChecklistDraftItem, nextActive: boolean) => {
    const previousItem = item;
    handleFieldChange(item.id, (current) => ({ ...current, isActive: nextActive }));

    if (!setupId || item.isLocalOnly) {
      return;
    }

    try {
      await toggleRuleMutation.mutateAsync({ ruleId: item.id, isActive: nextActive });
      await invalidateChecklistData();
    } catch {
      onItemsChange((current) => current.map((currentItem) => (
        currentItem.id === item.id ? previousItem : currentItem
      )));
    }
  };

  const handleDropOnItem = async (targetItemId: string) => {
    if (!draggedItemId || draggedItemId === targetItemId) {
      setDraggedItemId(null);
      return;
    }

    const fromIndex = normalizedItems.findIndex((item) => item.id === draggedItemId);
    const toIndex = normalizedItems.findIndex((item) => item.id === targetItemId);

    if (fromIndex === -1 || toIndex === -1) {
      setDraggedItemId(null);
      return;
    }

    const reorderedItems = moveItem(normalizedItems, fromIndex, toIndex);
    const previousItems = normalizedItems;
    onItemsChange(() => reorderedItems);
    setDraggedItemId(null);

    try {
      await persistOrderIfNeeded(reorderedItems);
    } catch {
      onItemsChange(() => previousItems);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {normalizedItems.length} {normalizedItems.length === 1 ? "item" : "items"}{" "}
          <span aria-hidden="true">•</span>{" "}
          {requiredCount} required
        </p>
      </div>

      <SetupChecklistQuickAdd
        onAdd={(title) => void handleQuickAdd(title)}
        disabled={createRuleMutation.isPending}
      />

      <div>
        {normalizedItems.length === 0 ? (
          <SetupChecklistEmptyState />
        ) : normalizedItems.map((item) => (
          <SetupChecklistItemRow
            key={item.id}
            item={item}
            disabled={deleteRuleMutation.isPending}
            isDragging={draggedItemId === item.id}
            onDragStart={() => setDraggedItemId(item.id)}
            onDragOver={() => undefined}
            onDrop={() => void handleDropOnItem(item.id)}
            onTitleChange={(value) => handleFieldChange(item.id, (current) => ({ ...current, title: value }))}
            onDescriptionChange={(value) => handleFieldChange(item.id, (current) => ({ ...current, description: value || null }))}
            onRequiredChange={(nextRequired) => handleFieldChange(item.id, (current) => ({ ...current, isRequired: nextRequired }))}
            onActiveChange={(nextActive) => void handleToggleActive(item, nextActive)}
            onDelete={() => void handleDelete(item)}
          />
        ))}
      </div>
    </div>
  );
}
