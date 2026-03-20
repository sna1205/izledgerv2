import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import LotCalculator from "./LotCalculator";

describe("LotCalculator", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("keeps percent mode as the default and updates lot size from synced risk amount", async () => {
    render(<LotCalculator />);

    const riskPercentInput = screen.getByLabelText("Risk Percent");
    const riskAmountInput = screen.getByLabelText("Risk Amount");

    expect(riskPercentInput).toBeEnabled();
    expect(riskAmountInput).toBeDisabled();
    expect(riskAmountInput).toHaveValue(100);

    fireEvent.change(screen.getByLabelText("Entry Price"), { target: { value: "3000" } });
    fireEvent.change(screen.getByLabelText("Stop Loss Price"), { target: { value: "2990" } });

    await waitFor(() => {
      expect(screen.getByText("0.10")).toBeInTheDocument();
    });
  });

  it("switches to amount mode, syncs the percent input, and recalculates instantly", async () => {
    render(<LotCalculator />);

    fireEvent.change(screen.getByLabelText("Entry Price"), { target: { value: "3000" } });
    fireEvent.change(screen.getByLabelText("Stop Loss Price"), { target: { value: "2990" } });
    fireEvent.click(screen.getByRole("button", { name: "Risk $" }));

    const riskPercentInput = screen.getByLabelText("Risk Percent");
    const riskAmountInput = screen.getByLabelText("Risk Amount");

    expect(riskPercentInput).toBeDisabled();
    expect(riskAmountInput).toBeEnabled();

    fireEvent.change(riskAmountInput, { target: { value: "250" } });

    await waitFor(() => {
      expect(riskPercentInput).toHaveValue(2.5);
      expect(screen.getByText("0.25")).toBeInTheDocument();
    });
  });

  it("handles equal entry and stop loss safely without crashing", async () => {
    render(<LotCalculator />);

    fireEvent.change(screen.getByLabelText("Entry Price"), { target: { value: "3000" } });
    fireEvent.change(screen.getByLabelText("Stop Loss Price"), { target: { value: "3000" } });

    await waitFor(() => {
      expect(screen.getByText("Entry and stop loss must be different.")).toBeInTheDocument();
      expect(screen.getByText("0.00")).toBeInTheDocument();
    });
  });
});
