import { describe, expect, it } from "vitest";
import {
  SETUP_COLOR_PALETTE,
  generateUniqueSetupColor,
  normalizeSetupColor,
} from "@/types";

describe("setup color utilities", () => {
  it("normalizes valid colors to uppercase hex", () => {
    expect(normalizeSetupColor(" #10b981 ")).toBe("#10B981");
    expect(normalizeSetupColor("invalid")).toBeNull();
  });

  it("picks an unused curated palette color before generating random ones", () => {
    const color = generateUniqueSetupColor(
      [SETUP_COLOR_PALETTE[0], SETUP_COLOR_PALETTE[1]],
      { random: () => 0 },
    );

    expect(color).toBe(SETUP_COLOR_PALETTE[2]);
  });
});
