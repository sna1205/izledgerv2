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

});
