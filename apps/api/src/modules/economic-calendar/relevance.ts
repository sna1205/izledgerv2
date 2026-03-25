import type { EconomicCalendarEvent } from "@izledger/shared";
import { INSTRUMENTS_BY_VALUE } from "@izledger/shared";

export type EconomicEventRelevanceResult = {
  relevant: boolean;
  reason: string | null;
};

const XAU_MAJOR_MACRO_PATTERN = /\b(fomc|fed|powell|cpi|ppi|nfp|nonfarm|gdp|unemployment|jobless|payroll)\b/i;

export function getEconomicEventRelevance(
  event: Pick<EconomicCalendarEvent, "currency" | "title" | "category">,
  instrument: string | null | undefined,
): EconomicEventRelevanceResult {
  const normalizedInstrument = instrument?.trim().toUpperCase() ?? "";

  if (!normalizedInstrument) {
    return {
      relevant: false,
      reason: null,
    };
  }

  if (normalizedInstrument === "XAUUSD") {
    if (event.currency !== "USD") {
      return {
        relevant: false,
        reason: null,
      };
    }

    return {
      relevant: true,
      reason: XAU_MAJOR_MACRO_PATTERN.test(event.title) || ["inflation", "labor", "growth", "central-bank"].includes(event.category)
        ? "Major US macro and Fed releases can move XAUUSD through USD and rate expectations."
        : "USD releases can affect XAUUSD because gold is quoted against USD.",
    };
  }

  const instrumentDefinition = INSTRUMENTS_BY_VALUE[normalizedInstrument];

  if (instrumentDefinition?.category === "Forex" && normalizedInstrument.length >= 6) {
    const baseCurrency = normalizedInstrument.slice(0, 3);
    const quoteCurrency = normalizedInstrument.slice(3, 6);

    if (event.currency === baseCurrency) {
      return {
        relevant: true,
        reason: `${event.currency} is the base currency in ${normalizedInstrument}.`,
      };
    }

    if (event.currency === quoteCurrency) {
      return {
        relevant: true,
        reason: `${event.currency} is the quote currency in ${normalizedInstrument}.`,
      };
    }
  }

  return {
    relevant: false,
    reason: null,
  };
}

export function attachEconomicEventRelevance(
  event: EconomicCalendarEvent,
  instrument: string | null | undefined,
) {
  return {
    ...event,
    relevance: getEconomicEventRelevance(event, instrument),
  };
}
