import type { EconomicCalendarEvent } from "@/types";

const SESSION_STORAGE_KEY = "izledger:high-impact-news-alert:session";
const LOCAL_STORAGE_KEY = "izledger:high-impact-news-alert:cooldowns";
export const HIGH_IMPACT_NEWS_ALERT_COOLDOWN_HOURS = 8;

type SessionAlertState = {
  shownEventIds: string[];
  dismissedEventIds: string[];
};

type LocalAlertEntry = {
  until: string;
  eventTimeUtc: string;
  reason: "shown" | "dismissed";
};

type LocalAlertState = Record<string, LocalAlertEntry>;

function getDefaultSessionState(): SessionAlertState {
  return {
    shownEventIds: [],
    dismissedEventIds: [],
  };
}

function readJsonStorage<T>(storage: Storage, key: string, fallback: T) {
  try {
    const rawValue = storage.getItem(key);

    if (!rawValue) {
      return fallback;
    }

    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}

function writeJsonStorage(storage: Storage, key: string, value: unknown) {
  storage.setItem(key, JSON.stringify(value));
}

function toTimeMs(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function getStorages() {
  if (typeof window === "undefined") {
    return null;
  }

  return {
    local: window.localStorage,
    session: window.sessionStorage,
  };
}

function pruneLocalState(localState: LocalAlertState, nowMs: number) {
  const nextEntries = Object.entries(localState).filter(([, value]) => {
    const untilMs = toTimeMs(value.until);
    const eventTimeMs = toTimeMs(value.eventTimeUtc);

    if (untilMs === null || eventTimeMs === null) {
      return false;
    }

    return untilMs > nowMs && eventTimeMs > nowMs;
  });

  return Object.fromEntries(nextEntries);
}

function readSessionState() {
  const storages = getStorages();

  if (!storages) {
    return getDefaultSessionState();
  }

  const state = readJsonStorage<SessionAlertState>(storages.session, SESSION_STORAGE_KEY, getDefaultSessionState());

  return {
    shownEventIds: Array.isArray(state.shownEventIds) ? state.shownEventIds : [],
    dismissedEventIds: Array.isArray(state.dismissedEventIds) ? state.dismissedEventIds : [],
  };
}

function writeSessionState(state: SessionAlertState) {
  const storages = getStorages();

  if (!storages) {
    return;
  }

  writeJsonStorage(storages.session, SESSION_STORAGE_KEY, state);
}

function readLocalState(now = new Date()) {
  const storages = getStorages();

  if (!storages) {
    return {};
  }

  const state = readJsonStorage<LocalAlertState>(storages.local, LOCAL_STORAGE_KEY, {});
  const pruned = pruneLocalState(state, now.getTime());
  writeJsonStorage(storages.local, LOCAL_STORAGE_KEY, pruned);
  return pruned;
}

function writeLocalState(state: LocalAlertState) {
  const storages = getStorages();

  if (!storages) {
    return;
  }

  writeJsonStorage(storages.local, LOCAL_STORAGE_KEY, state);
}

export function shouldSuppressHighImpactNewsAlert(event: EconomicCalendarEvent, now = new Date()) {
  readLocalState(now);
  const eventTimeMs = toTimeMs(event.eventTimeUtc);

  if (eventTimeMs === null || eventTimeMs <= now.getTime()) {
    return true;
  }

  const sessionState = readSessionState();

  if (sessionState.shownEventIds.includes(event.id) || sessionState.dismissedEventIds.includes(event.id)) {
    return true;
  }

  const localState = readLocalState(now);
  const localEntry = localState[event.id];

  if (!localEntry) {
    return false;
  }

  const untilMs = toTimeMs(localEntry.until);
  return untilMs !== null && untilMs > now.getTime();
}

export function markHighImpactNewsAlertShown(event: EconomicCalendarEvent, now = new Date()) {
  const eventTimeMs = toTimeMs(event.eventTimeUtc);

  if (eventTimeMs === null) {
    return;
  }

  const sessionState = readSessionState();
  const localState = readLocalState(now);
  const nextCooldownMs = Math.min(
    eventTimeMs,
    now.getTime() + HIGH_IMPACT_NEWS_ALERT_COOLDOWN_HOURS * 60 * 60 * 1000,
  );

  writeSessionState({
    ...sessionState,
    shownEventIds: Array.from(new Set([...sessionState.shownEventIds, event.id])),
  });

  writeLocalState({
    ...localState,
    [event.id]: {
      until: new Date(nextCooldownMs).toISOString(),
      eventTimeUtc: event.eventTimeUtc,
      reason: "shown",
    },
  });
}

export function dismissHighImpactNewsAlert(event: EconomicCalendarEvent, now = new Date()) {
  const eventTimeMs = toTimeMs(event.eventTimeUtc);

  if (eventTimeMs === null) {
    return;
  }

  const sessionState = readSessionState();
  const localState = readLocalState(now);

  writeSessionState({
    shownEventIds: Array.from(new Set([...sessionState.shownEventIds, event.id])),
    dismissedEventIds: Array.from(new Set([...sessionState.dismissedEventIds, event.id])),
  });

  writeLocalState({
    ...localState,
    [event.id]: {
      until: new Date(eventTimeMs).toISOString(),
      eventTimeUtc: event.eventTimeUtc,
      reason: "dismissed",
    },
  });
}
