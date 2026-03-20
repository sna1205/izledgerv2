import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProfitDisplay } from "./ProfitDisplay";

describe("ProfitDisplay", () => {
  it("uses shared currency formatting for large positive values", () => {
    render(<ProfitDisplay value={123456789.5} />);

    expect(screen.getByText("+$123,456,789.50")).toBeInTheDocument();
  });

  it("uses shared currency formatting for large negative values", () => {
    render(<ProfitDisplay value={-200000000} />);

    expect(screen.getByText("-$200,000,000.00")).toBeInTheDocument();
  });
});
