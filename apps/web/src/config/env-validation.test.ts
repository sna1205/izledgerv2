import { describe, expect, it } from "vitest";
import { validateFrontendEnv } from "./env-validation";

describe("validateFrontendEnv", () => {
  it("defaults VITE_APP_ENV to production for production builds", () => {
    const parsed = validateFrontendEnv(
      {
        VITE_API_BASE_URL: "https://api.example.com",
      },
      {
        mode: "production",
        isBuild: true,
      },
    );

    expect(parsed.success).toBe(true);

    if (!parsed.success) {
      throw parsed.error;
    }

    expect(parsed.data.VITE_APP_ENV).toBe("production");
  });

  it("defaults the economic calendar feature flag to hidden when omitted", () => {
    const parsed = validateFrontendEnv(
      {
        VITE_APP_ENV: "production",
        VITE_API_BASE_URL: "https://api.example.com",
      },
      {
        mode: "production",
        isBuild: true,
      },
    );

    expect(parsed.success).toBe(true);

    if (!parsed.success) {
      throw parsed.error;
    }

    expect(parsed.data.VITE_FEATURE_ECONOMIC_CALENDAR).toBe("hidden");
  });

  it("rejects development-only feature flags in production builds", () => {
    const parsed = validateFrontendEnv(
      {
        VITE_APP_ENV: "production",
        VITE_API_BASE_URL: "https://api.example.com",
        VITE_FEATURE_ECONOMIC_CALENDAR: "development",
      },
      {
        mode: "production",
        isBuild: true,
      },
    );

    expect(parsed.success).toBe(false);

    if (parsed.success) {
      throw new Error("Expected production build validation to fail");
    }

    expect(parsed.error.flatten().fieldErrors.VITE_FEATURE_ECONOMIC_CALENDAR).toContain(
      "VITE_FEATURE_ECONOMIC_CALENDAR cannot be development in production builds",
    );
  });
});
