import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

async function renderEconomicCalendarForFeature(featureState: "hidden" | "development" | "live") {
  cleanup();
  vi.resetModules();

  vi.doMock("@/config/features", () => ({
    FEATURES: {
      economicCalendar: featureState,
    },
  }));

  const { default: EconomicCalendar } = await import("@/pages/EconomicCalendar");

  return render(
    <MemoryRouter initialEntries={["/economic-calendar"]}>
      <Routes>
        <Route path="/dashboard" element={<div>Dashboard</div>} />
        <Route path="/economic-calendar" element={<EconomicCalendar />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("EconomicCalendar feature flag", () => {
  afterEach(() => {
    cleanup();
    vi.resetModules();
    vi.clearAllMocks();
    vi.doUnmock("@/config/features");
  });

  it("shows the premium placeholder page in development mode", async () => {
    await renderEconomicCalendarForFeature("development");

    expect(screen.getByText("In Development")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Economic Calendar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Go to Analytics" })).toHaveAttribute("href", "/analytics");
    expect(screen.queryByText("Economic calendar unavailable")).not.toBeInTheDocument();
  }, 10000);

  it("redirects hidden mode to the dashboard", async () => {
    await renderEconomicCalendarForFeature("hidden");

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Economic Calendar" })).not.toBeInTheDocument();
  });
});
