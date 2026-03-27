import { z } from "zod";

function isLoopbackHost(hostname: string) {
  return hostname === "localhost"
    || hostname === "0.0.0.0"
    || hostname === "::1"
    || /^127(?:\.\d{1,3}){3}$/.test(hostname);
}

const appEnvSchema = z.enum(["development", "local", "test", "production"]);
const featureStateSchema = z.enum(["hidden", "development", "live"]);

const frontendEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().trim().url(),
  VITE_APP_ENV: appEnvSchema,
  VITE_FEATURE_ECONOMIC_CALENDAR: featureStateSchema.default("hidden"),
});

type FrontendEnvInput = Record<string, string | boolean | undefined>;

export function validateFrontendEnv(
  rawEnv: FrontendEnvInput,
  options: {
    mode: string;
    isBuild: boolean;
  },
) {
  const parsed = frontendEnvSchema.safeParse(rawEnv);

  if (!parsed.success) {
    return parsed;
  }

  const issues: z.ZodIssue[] = [];
  const apiUrl = new URL(parsed.data.VITE_API_BASE_URL);
  const isProductionConfig = parsed.data.VITE_APP_ENV === "production";

  if (isProductionConfig && apiUrl.protocol !== "https:") {
    issues.push({
      code: z.ZodIssueCode.custom,
      path: ["VITE_API_BASE_URL"],
      message: "VITE_API_BASE_URL must use https in production",
    });
  }

  if (isProductionConfig && isLoopbackHost(apiUrl.hostname)) {
    issues.push({
      code: z.ZodIssueCode.custom,
      path: ["VITE_API_BASE_URL"],
      message: "VITE_API_BASE_URL cannot use localhost or loopback hosts in production",
    });
  }

  if (options.isBuild && options.mode === "production" && parsed.data.VITE_APP_ENV !== "production") {
    issues.push({
      code: z.ZodIssueCode.custom,
      path: ["VITE_APP_ENV"],
      message: "VITE_APP_ENV must be production for production builds",
    });
  }

  if (options.isBuild && options.mode === "production" && parsed.data.VITE_FEATURE_ECONOMIC_CALENDAR === "development") {
    issues.push({
      code: z.ZodIssueCode.custom,
      path: ["VITE_FEATURE_ECONOMIC_CALENDAR"],
      message: "VITE_FEATURE_ECONOMIC_CALENDAR cannot be development in production builds",
    });
  }

  if (issues.length > 0) {
    return {
      success: false as const,
      error: new z.ZodError(issues),
    };
  }

  return parsed;
}
