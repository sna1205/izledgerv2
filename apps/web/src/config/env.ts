import { z } from "zod";

function isLoopbackHost(hostname: string) {
  return hostname === "localhost" || /^127(?:\.\d{1,3}){3}$/.test(hostname);
}

const frontendEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().trim().url(),
  VITE_APP_ENV: z.enum(["development", "local", "test", "production"]).default(
    import.meta.env.PROD ? "production" : "development",
  ),
}).superRefine((data, ctx) => {
  const apiUrl = new URL(data.VITE_API_BASE_URL);
  const isLocalHost = isLoopbackHost(apiUrl.hostname);

  if (data.VITE_APP_ENV === "production" && apiUrl.protocol !== "https:") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["VITE_API_BASE_URL"],
      message: "VITE_API_BASE_URL must use https in production",
    });
  }

  if (data.VITE_APP_ENV === "production" && isLocalHost) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["VITE_API_BASE_URL"],
      message: "VITE_API_BASE_URL cannot use localhost in production",
    });
  }

  if (import.meta.env.PROD && data.VITE_APP_ENV !== "production") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["VITE_APP_ENV"],
      message: "VITE_APP_ENV must be production for production builds",
    });
  }
});

const parsed = frontendEnvSchema.safeParse(import.meta.env);

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
  isProduction: parsed.data.VITE_APP_ENV === "production",
} as const;
