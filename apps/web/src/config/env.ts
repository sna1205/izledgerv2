import { z } from "zod";

const frontendEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().trim().url(),
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
} as const;
