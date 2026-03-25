import { getEconomicEventLiveMode } from "@izledger/shared";
import { endOfWeek, formatDistanceStrict, parseISO, startOfWeek } from "date-fns";
import type { EconomicCalendarEvent, EconomicEventCategory, EconomicEventImpact, EconomicEventStatus } from "@/types";
import { INSTRUMENTS_BY_VALUE } from "@/types";

export type EconomicCalendarRange = "today" | "week";
export type EconomicCalendarImpactFilter = "all" | EconomicEventImpact;

export type EconomicEventRelevance = {
  instrument: string;
  badge: string;
  reason: string;
};

export type TradeEventWarning = {
  event: EconomicCalendarEvent;
  thresholdMinutes: 15 | 30 | 60;
  minutesAway: number;
  direction: "upcoming" | "recent";
  relevance: EconomicEventRelevance;
};

const MAJOR_XAU_MACRO_PATTERN = /\b(fomc|fed|powell|cpi|ppi|nfp|nonfarm|gdp|unemployment|jobless|payroll)\b/i;
const ECONOMIC_CALENDAR_TIME_ZONE_STORAGE_KEY = "economic-calendar:timezone";
const DEFAULT_ECONOMIC_CALENDAR_TIME_ZONE = "Asia/Phnom_Penh";

const COMMON_ECONOMIC_CALENDAR_TIME_ZONES = [
  "Asia/Bangkok",
  "Asia/Phnom_Penh",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "UTC",
] as const;

const TIME_ZONE_LABELS: Record<string, string> = {
  "Asia/Bangkok": "Bangkok",
  "Asia/Phnom_Penh": "Phnom Penh",
  "Asia/Singapore": "Singapore",
  "Europe/London": "London",
  "America/New_York": "New York",
  UTC: "UTC",
};

export type EconomicCalendarTimeZoneOption = {
  value: string;
  label: string;
};

const ECONOMIC_CURRENCY_BADGE_CLASSNAMES: Record<string, string> = {
  USD: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  EUR: "border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  GBP: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  JPY: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  CHF: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  AUD: "border-teal-500/20 bg-teal-500/10 text-teal-700 dark:text-teal-300",
  CAD: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
  NZD: "border-lime-500/20 bg-lime-500/10 text-lime-700 dark:text-lime-300",
  CNY: "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300",
};

function createDateFormatter(
  options: Intl.DateTimeFormatOptions,
  timeZone?: string,
) {
  return new Intl.DateTimeFormat("en-US", {
    ...options,
    ...(timeZone ? { timeZone } : {}),
  });
}

function getLocalDateParts(date: Date, timeZone?: string) {
  const formatter = createDateFormatter({
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }, timeZone);

  const parts = formatter.formatToParts(date);
  const get = (type: "year" | "month" | "day") => parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
  };
}

export function getLocalTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function isValidEconomicCalendarTimeZone(timeZone: string) {
  try {
    createDateFormatter({ hour: "numeric" }, timeZone).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function getEconomicCalendarTimeZoneName(timeZone: string) {
  if (TIME_ZONE_LABELS[timeZone]) {
    return TIME_ZONE_LABELS[timeZone];
  }

  const segments = timeZone.split("/");
  const lastSegment = segments[segments.length - 1] ?? timeZone;
  return lastSegment.replace(/_/g, " ");
}

function normalizeEconomicCalendarOffsetLabel(label: string) {
  if (label === "GMT" || label === "UTC") {
    return "GMT+0";
  }

  return label.replace(/^UTC/, "GMT");
}

export function getEconomicCalendarTimeZoneOffsetLabel(timeZone: string, referenceDate = new Date()) {
  const parts = createDateFormatter({
    hour: "numeric",
    timeZoneName: "shortOffset",
  }, timeZone).formatToParts(referenceDate);
  const offsetLabel = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT+0";
  return normalizeEconomicCalendarOffsetLabel(offsetLabel);
}

export function formatEconomicCalendarTimeZoneLabel(timeZone?: string) {
  const resolvedTimeZone = timeZone || getLocalTimeZone();
  return `${getEconomicCalendarTimeZoneName(resolvedTimeZone)} (${getEconomicCalendarTimeZoneOffsetLabel(resolvedTimeZone)})`;
}

export function formatEconomicCalendarTimeZoneMeta(timeZone?: string) {
  const resolvedTimeZone = timeZone || getLocalTimeZone();
  return `Shown in ${getEconomicCalendarTimeZoneName(resolvedTimeZone)} time`;
}

export function getEconomicCalendarTimeZoneOptions(currentTimeZone?: string) {
  const preferredTimeZone = currentTimeZone || getLocalTimeZone();
  const uniqueTimeZones = Array.from(new Set([
    ...COMMON_ECONOMIC_CALENDAR_TIME_ZONES,
    preferredTimeZone,
  ].filter((value) => isValidEconomicCalendarTimeZone(value))));

  return uniqueTimeZones.map((timeZone) => ({
    value: timeZone,
    label: formatEconomicCalendarTimeZoneLabel(timeZone),
  }));
}

export function readEconomicCalendarTimeZonePreference() {
  if (typeof window === "undefined") {
    return DEFAULT_ECONOMIC_CALENDAR_TIME_ZONE;
  }

  const storedTimeZone = window.localStorage.getItem(ECONOMIC_CALENDAR_TIME_ZONE_STORAGE_KEY);

  if (storedTimeZone && isValidEconomicCalendarTimeZone(storedTimeZone)) {
    return storedTimeZone;
  }

  return DEFAULT_ECONOMIC_CALENDAR_TIME_ZONE;
}

export function writeEconomicCalendarTimeZonePreference(timeZone: string) {
  if (typeof window === "undefined" || !isValidEconomicCalendarTimeZone(timeZone)) {
    return;
  }

  window.localStorage.setItem(ECONOMIC_CALENDAR_TIME_ZONE_STORAGE_KEY, timeZone);
}

export function getLocalDateKey(dateInput: Date | string, timeZone?: string) {
  const date = typeof dateInput === "string" ? parseISO(dateInput) : dateInput;
  const parts = getLocalDateParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatEconomicEventTime(event: EconomicCalendarEvent, timeZone?: string) {
  return createDateFormatter({
    hour: "numeric",
    minute: "2-digit",
  }, timeZone).format(parseISO(event.eventTimeUtc));
}

export function formatEconomicEventUtcTime(event: EconomicCalendarEvent) {
  return createDateFormatter({
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }, "UTC").format(parseISO(event.eventTimeUtc));
}

export function formatEconomicEventDayLabel(dateKey: string, _timeZone?: string) {
  const date = parseISO(`${dateKey}T00:00:00.000Z`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function getEconomicImpactLabel(impact: EconomicEventImpact) {
  if (impact === "high") return "High";
  if (impact === "medium") return "Medium";
  if (impact === "holiday") return "Holiday";
  return "Low";
}

export function getEconomicStatusLabel(status: EconomicEventStatus) {
  if (status === "pending_release") return "Pending";
  if (status === "released") return "Released";
  if (status === "revised") return "Revised";
  if (status === "passed") return "Passed";
  if (status === "holiday") return "Holiday";
  return "Upcoming";
}

export function getEconomicImpactTone(impact: EconomicEventImpact) {
  if (impact === "high") return "danger" as const;
  if (impact === "medium") return "warning" as const;
  if (impact === "holiday") return "neutral" as const;
  return "primary" as const;
}

export function getEconomicCurrencyBadgeClassName(currency: string) {
  return ECONOMIC_CURRENCY_BADGE_CLASSNAMES[currency.trim().toUpperCase()]
    ?? "border-primary/18 bg-primary/[0.10] text-primary";
}

export function isEconomicEventForLocalDay(
  event: EconomicCalendarEvent,
  dateKey: string,
  timeZone?: string,
) {
  return getLocalDateKey(event.eventTimeUtc, timeZone) === dateKey;
}

export function filterEconomicCalendarEvents(
  events: EconomicCalendarEvent[],
  options: {
    range: EconomicCalendarRange;
    currency?: string;
    impact?: EconomicCalendarImpactFilter;
    now?: Date;
    timeZone?: string;
  },
) {
  const now = options.now ?? new Date();
  const timeZone = options.timeZone;
  const todayKey = getLocalDateKey(now, timeZone);
  const currentWeekAnchor = parseISO(`${todayKey}T00:00:00.000Z`);
  const weekStart = startOfWeek(currentWeekAnchor, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeekAnchor, { weekStartsOn: 1 });

  return events.filter((event) => {
    const currencyMatches = !options.currency || options.currency === "all" || event.currency === options.currency;
    const impactMatches = !options.impact || options.impact === "all" || event.impactLevel === options.impact;

    if (!currencyMatches || !impactMatches) {
      return false;
    }

    const eventDate = parseISO(`${getLocalDateKey(event.eventTimeUtc, timeZone)}T00:00:00.000Z`);

    if (options.range === "today") {
      return getLocalDateKey(event.eventTimeUtc, timeZone) === todayKey;
    }

    return eventDate >= weekStart && eventDate <= weekEnd;
  });
}

export function groupEconomicCalendarEventsByDay(events: EconomicCalendarEvent[], timeZone?: string) {
  const groups = new Map<string, EconomicCalendarEvent[]>();

  for (const event of events) {
    const key = getLocalDateKey(event.eventTimeUtc, timeZone);
    const nextGroup = groups.get(key) ?? [];
    nextGroup.push(event);
    groups.set(key, nextGroup);
  }

  return Array.from(groups.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([dateKey, groupedEvents]) => ({
      dateKey,
      label: formatEconomicEventDayLabel(dateKey, timeZone),
      events: [...groupedEvents].sort((left, right) => (
        parseISO(left.eventTimeUtc).getTime() - parseISO(right.eventTimeUtc).getTime()
      )),
    }));
}

export function groupEconomicCalendarEventsByDayAndTime(events: EconomicCalendarEvent[], timeZone?: string) {
  return groupEconomicCalendarEventsByDay(events, timeZone).map((group) => {
    const timeGroups = new Map<string, EconomicCalendarEvent[]>();

    for (const event of group.events) {
      const timeKey = formatEconomicEventTime(event, timeZone);
      const nextEvents = timeGroups.get(timeKey) ?? [];
      nextEvents.push(event);
      timeGroups.set(timeKey, nextEvents);
    }

    return {
      ...group,
      timeGroups: Array.from(timeGroups.entries()).map(([timeLabel, groupedEvents]) => ({
        timeLabel,
        events: groupedEvents,
      })),
    };
  });
}

export function getEconomicEventRelevance(
  event: EconomicCalendarEvent,
  instrument: string,
): EconomicEventRelevance | null {
  const normalizedInstrument = instrument.trim().toUpperCase();

  if (!normalizedInstrument) {
    return null;
  }

  if (normalizedInstrument === "XAUUSD") {
    if (event.currency !== "USD") {
      return null;
    }

    return {
      instrument: normalizedInstrument,
      badge: MAJOR_XAU_MACRO_PATTERN.test(event.title) || ["inflation", "labor", "growth", "central-bank"].includes(event.category) ? "Gold Macro" : "Gold / USD",
      reason: MAJOR_XAU_MACRO_PATTERN.test(event.title) || ["inflation", "labor", "growth", "central-bank"].includes(event.category)
        ? "Major US inflation, labor, GDP, and Fed releases often move gold."
        : "Gold is quoted against USD, so USD events can move XAUUSD.",
    };
  }

  const instrumentDefinition = INSTRUMENTS_BY_VALUE[normalizedInstrument];

  if (instrumentDefinition?.category === "Forex" && normalizedInstrument.length >= 6) {
    const baseCurrency = normalizedInstrument.slice(0, 3);
    const quoteCurrency = normalizedInstrument.slice(3, 6);

    if (event.currency === baseCurrency) {
      return {
        instrument: normalizedInstrument,
        badge: `${baseCurrency} Base`,
        reason: `${event.currency} data can move the base currency in ${normalizedInstrument}.`,
      };
    }

    if (event.currency === quoteCurrency) {
      return {
        instrument: normalizedInstrument,
        badge: `${quoteCurrency} Quote`,
        reason: `${event.currency} data can move the quote currency in ${normalizedInstrument}.`,
      };
    }
  }

  return null;
}

export function getEconomicEventRelevanceList(
  event: EconomicCalendarEvent,
  instruments: string[],
  limit = 2,
) {
  const seen = new Set<string>();
  const matches: EconomicEventRelevance[] = [];

  for (const instrument of instruments) {
    const relevance = getEconomicEventRelevance(event, instrument);

    if (!relevance || seen.has(relevance.instrument)) {
      continue;
    }

    seen.add(relevance.instrument);
    matches.push(relevance);

    if (matches.length >= limit) {
      break;
    }
  }

  return matches;
}

export function getNextImportantEconomicEvent(
  events: EconomicCalendarEvent[],
  now = new Date(),
) {
  const sortedUpcoming = [...events]
    .filter((event) => (
      (event.impactLevel === "high" || event.impactLevel === "medium")
      && event.status !== "passed"
      && event.status !== "holiday"
      && (!event.actualValue || event.status === "pending_release")
    ))
    .sort((left, right) => (
      (getEconomicEventLiveMode(left, now) === "normal" ? 1 : 0) - (getEconomicEventLiveMode(right, now) === "normal" ? 1 : 0)
      || Math.abs(parseISO(left.eventTimeUtc).getTime() - now.getTime()) - Math.abs(parseISO(right.eventTimeUtc).getTime() - now.getTime())
    ));

  return sortedUpcoming.find((event) => event.impactLevel === "high")
    ?? sortedUpcoming.find((event) => event.impactLevel === "medium")
    ?? null;
}

export function formatEconomicCountdown(event: EconomicCalendarEvent, now = new Date()) {
  return formatDistanceStrict(parseISO(event.eventTimeUtc), now, { addSuffix: true });
}

function formatCompactEconomicDuration(minutes: number) {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (remainingHours > 0) {
    return `${days}d ${remainingHours}h`;
  }

  return `${days}d`;
}

export function formatEconomicCompactCountdown(event: EconomicCalendarEvent, now = new Date()) {
  const eventTimeMs = parseISO(event.eventTimeUtc).getTime();

  if (!Number.isFinite(eventTimeMs)) {
    return "";
  }

  const diffMs = eventTimeMs - now.getTime();
  const diffMinutes = Math.abs(diffMs) < 60_000
    ? 0
    : diffMs > 0
      ? Math.ceil(diffMs / 60_000)
      : Math.floor(Math.abs(diffMs) / 60_000);

  if (diffMs >= 0) {
    return diffMinutes === 0 ? "now" : `in ${formatCompactEconomicDuration(diffMinutes)}`;
  }

  return diffMinutes === 0 ? "just now" : `${formatCompactEconomicDuration(diffMinutes)} ago`;
}

export function getEconomicCategoryLabel(category: EconomicEventCategory) {
  if (category === "central-bank") return "Central Bank";
  if (category === "labor") return "Labor";
  if (category === "growth") return "Growth";
  if (category === "activity") return "Activity";
  if (category === "housing") return "Housing";
  if (category === "energy") return "Energy";
  if (category === "sentiment") return "Sentiment";
  if (category === "holiday") return "Holiday";
  return category === "inflation" ? "Inflation" : "Macro";
}

export function getEconomicEventContextSummary(event: EconomicCalendarEvent) {
  const categoryLabel = getEconomicCategoryLabel(event.category);

  if (event.category === "inflation") {
    return `${event.title} tracks price pressure in ${event.country}. Inflation surprises can quickly shift rate expectations and FX volatility.`;
  }

  if (event.category === "labor") {
    return `${event.title} gives traders a read on labor conditions in ${event.country}. Employment strength or weakness often changes policy expectations.`;
  }

  if (event.category === "central-bank") {
    return `${event.title} is a central-bank event for ${event.country}. Rate guidance and policy tone can move yields, currencies, and gold.`;
  }

  if (event.category === "growth") {
    return `${event.title} is a growth-sensitive ${categoryLabel.toLowerCase()} release for ${event.country}. It helps traders gauge the pace of the economy.`;
  }

  return `${event.title} is a ${categoryLabel.toLowerCase()} release for ${event.country}. Traders watch it for surprise risk and cross-market volatility.`;
}

export function getEconomicEventAffectedInstruments(event: EconomicCalendarEvent) {
  if (event.currency === "USD") {
    if (event.category === "central-bank" || MAJOR_XAU_MACRO_PATTERN.test(event.title)) {
      return ["USD crosses", "XAUUSD", "US indices"];
    }

    return ["USD crosses", "XAUUSD"];
  }

  return [`${event.currency} crosses`, `${event.currency} majors`];
}

export function getTradeEventWarning(input: {
  events: EconomicCalendarEvent[];
  instrument: string;
  now?: Date;
  thresholds?: ReadonlyArray<15 | 30 | 60>;
}) {
  const now = input.now ?? new Date();
  const thresholds = input.thresholds ?? [15, 30, 60] as const;
  const candidate = [...input.events]
    .map((event) => {
      const relevance = getEconomicEventRelevance(event, input.instrument);

      if (!relevance || event.impactLevel !== "high") {
        return null;
      }

      const minutesAway = Math.round(Math.abs(parseISO(event.eventTimeUtc).getTime() - now.getTime()) / 60_000);
      const thresholdMinutes = thresholds.find((threshold) => minutesAway <= threshold);

      if (!thresholdMinutes) {
        return null;
      }

      return {
        event,
        thresholdMinutes,
        minutesAway,
        direction: parseISO(event.eventTimeUtc).getTime() >= now.getTime() ? "upcoming" : "recent",
        relevance,
      };
    })
    .filter((warning): warning is TradeEventWarning => Boolean(warning))
    .sort((left, right) => left.minutesAway - right.minutesAway)[0];

  return candidate ?? null;
}
