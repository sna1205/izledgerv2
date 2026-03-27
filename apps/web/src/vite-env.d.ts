/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_APP_ENV: "development" | "local" | "test" | "production";
  readonly VITE_FEATURE_ECONOMIC_CALENDAR: "hidden" | "development" | "live";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
