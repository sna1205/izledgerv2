import type { SetupChecklistDraftItem } from "@/features/setups/components/SetupPreTradeSection";

export function buildDuplicateSetupName(name: string, existingNames: string[]) {
  const trimmedName = name.trim() || "Untitled Setup";
  const lowerNames = new Set(existingNames.map((item) => item.trim().toLowerCase()));
  const baseName = `${trimmedName} Copy`;

  if (!lowerNames.has(baseName.toLowerCase())) {
    return baseName;
  }

  let copyIndex = 2;

  while (lowerNames.has(`${baseName} ${copyIndex}`.toLowerCase())) {
    copyIndex += 1;
  }

  return `${baseName} ${copyIndex}`;
}

export function sanitizeChecklistItemsForDuplication(items: SetupChecklistDraftItem[]) {
  return items
    .filter((item) => item.title.trim())
    .map((item, index) => ({
      title: item.title.trim(),
      description: item.description?.trim() ? item.description.trim() : null,
      isRequired: item.isRequired,
      isActive: item.isActive,
      sortOrder: index,
    }));
}
