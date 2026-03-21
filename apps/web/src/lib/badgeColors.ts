import { SETUP_COLOR_PALETTE, normalizeSetupColor } from "@/lib/types";

const FALLBACK_NEUTRAL = "#64748B";
const LIGHT_TEXT_BASE = "#0F172A";
const DARK_TEXT_BASE = "#F8FAFC";

type ThemeMode = "light" | "dark";
type BadgeKind = "setup" | "session" | "emotion";

export type BadgeStyle = {
  backgroundColor: string;
  borderColor: string;
  color: string;
};

const SESSION_BADGE_COLORS: Record<string, string> = {
  asia: "#14B8A6",
  london: "#3B82F6",
  "new york": "#F97316",
  overlap: "#8B5CF6",
};

const EMOTION_BADGE_COLORS: Record<string, string> = {
  calm: "#10B981",
  focused: "#4F46E5",
  confident: "#8B5CF6",
  anxious: "#D97706",
  frustrated: "#E11D48",
  hesitant: "#CA8A04",
  fomo: "#F97316",
  revenge: "#DC2626",
  neutral: "#64748B",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeCategoryKey(value: string | null | undefined) {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/\s+/g, " ") : "";
}

function rgba({ red, green, blue }: { red: number; green: number; blue: number }, alpha: number) {
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function blendChannel(channel: number, target: number, amount: number) {
  return Math.round(channel + ((target - channel) * amount));
}

function blendHexColors(color: string, target: string, amount: number) {
  const base = hexToRgb(color);
  const destination = hexToRgb(target);

  if (!base || !destination) {
    return target;
  }

  const normalizedAmount = clamp(amount, 0, 1);

  return rgbToHex({
    red: blendChannel(base.red, destination.red, normalizedAmount),
    green: blendChannel(base.green, destination.green, normalizedAmount),
    blue: blendChannel(base.blue, destination.blue, normalizedAmount),
  });
}

function rgbToHex({ red, green, blue }: { red: number; green: number; blue: number }) {
  const toHex = (channel: number) => clamp(channel, 0, 255).toString(16).padStart(2, "0").toUpperCase();

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

export function normalizeHexColor(color: string | null | undefined) {
  return normalizeSetupColor(color);
}

export function hexToRgb(color: string | null | undefined) {
  const normalized = normalizeHexColor(color);

  if (!normalized) {
    return null;
  }

  return {
    red: Number.parseInt(normalized.slice(1, 3), 16),
    green: Number.parseInt(normalized.slice(3, 5), 16),
    blue: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

export function makeTintedBadgeStyles(
  color: string | null | undefined,
  theme: ThemeMode,
  kind: BadgeKind,
): BadgeStyle {
  const normalizedColor = normalizeHexColor(color) ?? FALLBACK_NEUTRAL;
  const rgb = hexToRgb(normalizedColor);

  if (!rgb) {
    return {
      backgroundColor: theme === "dark" ? "rgba(100, 116, 139, 0.16)" : "rgba(100, 116, 139, 0.08)",
      borderColor: theme === "dark" ? "rgba(100, 116, 139, 0.32)" : "rgba(100, 116, 139, 0.18)",
      color: theme === "dark" ? "#CBD5E1" : "#475569",
    };
  }

  const isDark = theme === "dark";
  const backgroundAlpha = kind === "setup"
    ? (isDark ? 0.19 : 0.11)
    : kind === "session"
      ? (isDark ? 0.16 : 0.09)
      : (isDark ? 0.18 : 0.1);
  const borderAlpha = kind === "setup"
    ? (isDark ? 0.38 : 0.22)
    : kind === "session"
      ? (isDark ? 0.3 : 0.18)
      : (isDark ? 0.34 : 0.2);
  const textBlendTarget = isDark ? DARK_TEXT_BASE : LIGHT_TEXT_BASE;
  const textBlendAmount = kind === "setup"
    ? (isDark ? 0.18 : 0.34)
    : kind === "session"
      ? (isDark ? 0.2 : 0.32)
      : (isDark ? 0.22 : 0.36);

  return {
    backgroundColor: rgba(rgb, backgroundAlpha),
    borderColor: rgba(rgb, borderAlpha),
    color: blendHexColors(normalizedColor, textBlendTarget, textBlendAmount),
  };
}

export function getSetupBadgeStyle(colorToken: string | null | undefined, theme: ThemeMode) {
  const setupColor = normalizeHexColor(colorToken) ?? SETUP_COLOR_PALETTE[0];
  return makeTintedBadgeStyles(setupColor, theme, "setup");
}

export function getSessionBadgeStyle(session: string | null | undefined, theme: ThemeMode) {
  const color = SESSION_BADGE_COLORS[normalizeCategoryKey(session)] ?? "#0F766E";
  return makeTintedBadgeStyles(color, theme, "session");
}

export function getEmotionBadgeStyle(emotion: string | null | undefined, theme: ThemeMode) {
  const color = EMOTION_BADGE_COLORS[normalizeCategoryKey(emotion)] ?? "#7C3AED";
  return makeTintedBadgeStyles(color, theme, "emotion");
}
