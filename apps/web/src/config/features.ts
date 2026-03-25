export type FeatureState = "hidden" | "development" | "live";

function parseFeatureState(value: string | undefined): FeatureState {
  switch (value) {
    case "hidden":
    case "development":
    case "live":
      return value;
    default:
      return "hidden";
  }
}

export const FEATURES = {
  economicCalendar: parseFeatureState(import.meta.env.VITE_FEATURE_ECONOMIC_CALENDAR),
} as const;
