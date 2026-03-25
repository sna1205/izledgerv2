import { describe, expect, it } from "vitest";
import { getEventContent } from "@/features/economic-calendar/economicEventContent";

describe("getEventContent", () => {
  it("matches more specific templates before broader keywords", () => {
    const content = getEventContent("US Core CPI y/y");

    expect(content.title).toBe("CORE CPI");
    expect(content.description).toBe("Inflation excluding food and energy prices.");
    expect(content.isFallback).toBe(false);
  });

  it("matches configured keywords case-insensitively", () => {
    const content = getEventContent("consumer price index m/m");

    expect(content.title).toBe("CPI");
    expect(content.matchedKeyword).toBe("Consumer Price Index");
    expect(content.impact.bullish).toBe("Higher than expected → currency strengthens");
  });

  it("returns generic fallback content when no template matches", () => {
    const content = getEventContent("Auction Results");

    expect(content.title).toBe("Economic Event");
    expect(content.isFallback).toBe(true);
    expect(content.instruments).toEqual(["Related currency pairs", "Gold", "Indices"]);
  });
});
