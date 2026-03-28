import { validateFrontendEnv } from "./env-validation";

const parsed = validateFrontendEnv(import.meta.env, {
  mode: import.meta.env.MODE,
  isBuild: import.meta.env.PROD,
});

if (!parsed.success) {
  console.error("Invalid frontend environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid frontend environment variables");
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export const env = {
  apiBaseUrl: trimTrailingSlash(parsed.data.VITE_API_BASE_URL),
  appEnv: parsed.data.VITE_APP_ENV,
  featureEconomicCalendar: parsed.data.VITE_FEATURE_ECONOMIC_CALENDAR,
  isProduction: parsed.data.VITE_APP_ENV === "production",
} as const;
