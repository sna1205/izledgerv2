import { env } from "./env";

export type FeatureState = "hidden" | "development" | "live";

export const FEATURES = {
  economicCalendar: env.featureEconomicCalendar,
} as const;
