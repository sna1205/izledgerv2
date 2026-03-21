import { describe, expect, it } from "vitest";
import {
  getEmotionBadgeStyle,
  getSessionBadgeStyle,
  getSetupBadgeStyle,
  normalizeHexColor,
} from "@/lib/badgeColors";

describe("badge color utilities", () => {
  it("normalizes valid hex colors and rejects invalid values", () => {
    expect(normalizeHexColor(" #3b82f6 ")).toBe("#3B82F6");
    expect(normalizeHexColor("blue")).toBeNull();
  });

  it("builds setup badge styles from saved setup colors", () => {
    const style = getSetupBadgeStyle("#10b981", "light");

    expect(style.backgroundColor).toContain("rgba(");
    expect(style.borderColor).toContain("rgba(");
    expect(style.color).toMatch(/^#/);
    expect(style.color).not.toBe("#10B981");
  });

  it("keeps session and emotion badge palettes distinct", () => {
    const london = getSessionBadgeStyle("London", "light");
    const focused = getEmotionBadgeStyle("Focused", "light");

    expect(london.backgroundColor).not.toBe(focused.backgroundColor);
    expect(london.color).not.toBe(focused.color);
  });

  it("falls back safely when setup color is missing", () => {
    const style = getSetupBadgeStyle(null, "dark");

    expect(style.backgroundColor).toContain("rgba(");
    expect(style.borderColor).toContain("rgba(");
    expect(style.color).toMatch(/^#/);
  });
});
