import type { SetupChecklistDraftItem } from "@/features/setups/components/SetupPreTradeSection";
import type { StrategyFormState } from "@/features/setups/components/setup-form-state";

export type SetupTemplatePreset = {
  id: string;
  label: string;
  summary: string;
  form: StrategyFormState;
  checklistItems: SetupChecklistDraftItem[];
};

function buildTemplateChecklistItems(items: Array<{
  title: string;
  description?: string;
  isRequired?: boolean;
}>): SetupChecklistDraftItem[] {
  return items.map((item, index) => ({
    id: `template-${index}-${item.title.toLowerCase().replace(/\s+/g, "-")}`,
    title: item.title,
    description: item.description ?? null,
    isRequired: item.isRequired ?? true,
    isActive: true,
    sortOrder: index,
    isLocalOnly: true,
    setupId: null,
    accountId: null,
  }));
}

export const SETUP_TEMPLATE_PRESETS: SetupTemplatePreset[] = [
  {
    id: "ict",
    label: "ICT",
    summary: "Sweep to reclaim",
    form: {
      name: "ICT Displacement Reclaim",
      description: "Trade the reclaim after a liquidity sweep confirms displacement back into structure.",
      entryLogic: "Wait for a sweep of liquidity, then enter only after price reclaims the dealing range.",
      confirmationLogic: "Require displacement, structure shift, and reaction from the intended entry zone.",
      invalidationLogic: "Invalidate if price fails to hold the reclaimed zone or returns through the origin candle.",
      notes: "Pair with session bias, HTF narrative, and clean PD array alignment.",
      color: "#3B82F6",
      isArchived: false,
    },
    checklistItems: buildTemplateChecklistItems([
      { title: "Higher-timeframe bias is aligned" },
      { title: "Liquidity has been swept" },
      { title: "Displacement confirms intent" },
      { title: "Entry zone is clean and nearby" },
      { title: "Risk fits current session conditions", isRequired: false },
    ]),
  },
  {
    id: "msnr",
    label: "MSNR",
    summary: "Shift and retest",
    form: {
      name: "MSNR Retest",
      description: "Trade the retest after a market structure shift confirms the new short-term narrative.",
      entryLogic: "Enter on the retest of the shift origin after price breaks structure with intent.",
      confirmationLogic: "Look for rejection, held levels, and a clean retest inside the narrative zone.",
      invalidationLogic: "Cancel if price closes back through the retest zone or fails to respect the shift.",
      notes: "Best used when the structure shift lines up with session range or external liquidity.",
      color: "#10B981",
      isArchived: false,
    },
    checklistItems: buildTemplateChecklistItems([
      { title: "Structure shift is obvious" },
      { title: "Retest level is mapped" },
      { title: "Entry has nearby invalidation" },
      { title: "Narrative still supports continuation" },
    ]),
  },
  {
    id: "scalping",
    label: "Scalping",
    summary: "Session pullback",
    form: {
      name: "Session Scalping Pullback",
      description: "Capture short-duration pullbacks only when momentum and session conditions stay clean.",
      entryLogic: "Enter the first clean pullback after momentum establishes direction inside active session hours.",
      confirmationLogic: "Require momentum continuation, tight spread, and immediate response from the pullback zone.",
      invalidationLogic: "Invalidate if momentum stalls, spread widens, or the pullback loses the trigger level.",
      notes: "Keep targets modest and skip when execution quality degrades.",
      color: "#F59E0B",
      isArchived: false,
    },
    checklistItems: buildTemplateChecklistItems([
      { title: "Active session is open" },
      { title: "Spread and execution are clean" },
      { title: "Momentum is obvious" },
      { title: "Stop placement is tight and logical" },
      { title: "No nearby high-impact event", isRequired: false },
    ]),
  },
];
