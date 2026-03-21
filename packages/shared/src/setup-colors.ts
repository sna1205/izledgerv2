const HEX_COLOR_PATTERN = /^#([A-F0-9]{6})$/i;
const DEFAULT_SETUP_COLOR = "#3B82F6";
const RANDOM_COLOR_ATTEMPTS = 24;
const DETERMINISTIC_COLOR_ATTEMPTS = 24;

export const SETUP_COLOR_PALETTE = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
  "#F97316",
  "#22C55E",
  "#EC4899",
  "#6366F1",
  "#14B8A6",
  "#EAB308",
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function hslToHex(hue: number, saturation: number, lightness: number) {
  const normalizedHue = ((hue % 360) + 360) % 360;
  const s = clamp(saturation, 0, 100) / 100;
  const l = clamp(lightness, 0, 100) / 100;

  const chroma = (1 - Math.abs((2 * l) - 1)) * s;
  const hueSegment = normalizedHue / 60;
  const secondary = chroma * (1 - Math.abs((hueSegment % 2) - 1));
  const match = l - (chroma / 2);

  let red = 0;
  let green = 0;
  let blue = 0;

  if (hueSegment >= 0 && hueSegment < 1) {
    red = chroma;
    green = secondary;
  } else if (hueSegment < 2) {
    red = secondary;
    green = chroma;
  } else if (hueSegment < 3) {
    green = chroma;
    blue = secondary;
  } else if (hueSegment < 4) {
    green = secondary;
    blue = chroma;
  } else if (hueSegment < 5) {
    red = secondary;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondary;
  }

  const toHex = (channel: number) => Math.round((channel + match) * 255).toString(16).padStart(2, "0").toUpperCase();

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function buildControlledRandomColor(random: () => number) {
  const hue = Math.floor(random() * 360);
  const saturation = 62 + Math.floor(random() * 15);
  const lightness = 46 + Math.floor(random() * 12);

  return hslToHex(hue, saturation, lightness);
}

function buildDeterministicColor(seed: string, attempt = 0) {
  const hashedSeed = hashString(`${seed}:${attempt}`);
  const hue = hashedSeed % 360;
  const saturation = 64 + (hashedSeed % 10);
  const lightness = 47 + (Math.floor(hashedSeed / 10) % 10);

  return hslToHex(hue, saturation, lightness);
}

export function normalizeSetupColor(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return HEX_COLOR_PATTERN.test(normalized) ? normalized : null;
}

export function generateUniqueSetupColor(
  existingColors: string[],
  options: {
    random?: () => number;
    fallbackSeed?: string | number;
  } = {},
) {
  const random = options.random ?? Math.random;
  const usedColors = new Set(
    existingColors
      .map((color) => normalizeSetupColor(color))
      .filter((color): color is string => Boolean(color)),
  );

  const unusedPalette = SETUP_COLOR_PALETTE.filter((color) => !usedColors.has(color));

  if (unusedPalette.length > 0) {
    return unusedPalette[Math.floor(random() * unusedPalette.length)];
  }

  for (let attempt = 0; attempt < RANDOM_COLOR_ATTEMPTS; attempt += 1) {
    const candidate = buildControlledRandomColor(random);

    if (!usedColors.has(candidate)) {
      return candidate;
    }
  }

  const fallbackSeed = String(options.fallbackSeed ?? Array.from(usedColors).sort().join("|") ?? "setup-color");

  for (let attempt = 0; attempt < DETERMINISTIC_COLOR_ATTEMPTS; attempt += 1) {
    const candidate = buildDeterministicColor(fallbackSeed, attempt);

    if (!usedColors.has(candidate)) {
      return candidate;
    }
  }

  return DEFAULT_SETUP_COLOR;
}
