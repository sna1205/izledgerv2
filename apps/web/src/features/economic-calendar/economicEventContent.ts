import {
  ECONOMIC_EVENT_CONTENT,
  GENERIC_ECONOMIC_EVENT_CONTENT,
  type EconomicEventContentTemplate,
} from "@/features/economic-calendar/economicEventContent.config";

export type EconomicEventContent = EconomicEventContentTemplate & {
  matchedKeyword: string | null;
  isFallback: boolean;
};

function normalizeEventTitle(eventTitle: string) {
  return eventTitle.trim().toLowerCase();
}

export function getEventContent(eventTitle: string): EconomicEventContent {
  const normalizedTitle = normalizeEventTitle(eventTitle);

  for (const template of Object.values(ECONOMIC_EVENT_CONTENT)) {
    const matchedKeyword = template.keywords.find((keyword) => normalizedTitle.includes(keyword.toLowerCase()));

    if (!matchedKeyword) {
      continue;
    }

    return {
      ...template,
      matchedKeyword,
      isFallback: false,
    };
  }

  return {
    ...GENERIC_ECONOMIC_EVENT_CONTENT,
    matchedKeyword: null,
    isFallback: true,
  };
}
