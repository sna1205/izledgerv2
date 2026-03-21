import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InstrumentSelect } from "./InstrumentSelect";

const selectSpy = vi.fn();

function TestHarness() {
  const [value, setValue] = useState("EURUSD");

  return <InstrumentSelect value={value} onChange={setValue} ariaLabel="Instrument" />;
}

function StaticHarness({ value }: { value: string }) {
  return <InstrumentSelect value={value} onChange={() => {}} ariaLabel="Instrument" />;
}

describe("InstrumentSelect", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });

    Object.defineProperty(HTMLInputElement.prototype, "select", {
      configurable: true,
      value: selectSpy,
    });

    selectSpy.mockClear();
  });

  it("filters instruments by keyword and shows an empty state when nothing matches", async () => {
    render(<TestHarness />);

    fireEvent.click(screen.getByLabelText("Instrument"));

    const searchInput = await screen.findByLabelText("Search instruments");
    fireEvent.change(searchInput, { target: { value: "gold" } });

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /XAUUSD/i })).toBeInTheDocument();
      expect(screen.queryByRole("option", { name: /EURUSD/i })).not.toBeInTheDocument();
    });

    fireEvent.change(searchInput, { target: { value: "zzzz" } });

    await waitFor(() => {
      expect(screen.getByText("No matching instruments")).toBeInTheDocument();
    });
  });

  it("reopens a collapsed matching section during search", async () => {
    render(<TestHarness />);

    fireEvent.click(screen.getByLabelText("Instrument"));

    const metalsSection = await screen.findByRole("button", { name: /metals/i });
    expect(screen.getByRole("option", { name: /XAUUSD/i })).toBeInTheDocument();

    fireEvent.click(metalsSection);

    await waitFor(() => {
      expect(screen.queryByRole("option", { name: /XAUUSD/i })).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Search instruments"), { target: { value: "gold" } });

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /XAUUSD/i })).toBeInTheDocument();
    });
  });

  it("supports keyboard selection and closes after choosing an instrument", async () => {
    render(<TestHarness />);

    fireEvent.click(screen.getByLabelText("Instrument"));

    const searchInput = await screen.findByLabelText("Search instruments");
    fireEvent.change(searchInput, { target: { value: "btc" } });

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /BTCUSD/i })).toBeInTheDocument();
    });

    fireEvent.keyDown(searchInput, { key: "Enter" });

    await waitFor(() => {
      expect(screen.queryByLabelText("Search instruments")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Instrument")).toHaveTextContent("BTCUSD");
    });
  });

  it("shows only the pair symbol in the closed trigger", () => {
    render(<StaticHarness value="XAUUSD" />);

    expect(screen.getByLabelText("Instrument")).toHaveTextContent(/^XAUUSD$/);
    expect(screen.getByLabelText("Instrument")).not.toHaveTextContent(/Metals/i);
  });

  it("keeps the full typed query while filtering multi-character matches", async () => {
    render(<TestHarness />);

    fireEvent.click(screen.getByLabelText("Instrument"));

    const searchInput = await screen.findByLabelText("Search instruments");
    const initialSelectCalls = selectSpy.mock.calls.length;

    fireEvent.change(searchInput, { target: { value: "g" } });
    fireEvent.change(searchInput, { target: { value: "go" } });
    fireEvent.change(searchInput, { target: { value: "gol" } });
    fireEvent.change(searchInput, { target: { value: "gold" } });

    await waitFor(() => {
      expect(searchInput).toHaveValue("gold");
      expect(screen.getByRole("option", { name: /XAUUSD/i })).toBeInTheDocument();
      expect(screen.queryByRole("option", { name: /BTCUSD/i })).not.toBeInTheDocument();
    });

    expect(selectSpy.mock.calls.length).toBe(initialSelectCalls);
  });

  it("matches names, categories, case changes, and surrounding spaces", async () => {
    render(<TestHarness />);

    fireEvent.click(screen.getByLabelText("Instrument"));

    const searchInput = await screen.findByLabelText("Search instruments");

    fireEvent.change(searchInput, { target: { value: "  bitcoin  " } });

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /BTCUSD/i })).toBeInTheDocument();
    });

    fireEvent.change(searchInput, { target: { value: "CRYPTO" } });

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /BTCUSD/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /ETHUSD/i })).toBeInTheDocument();
      expect(screen.queryByRole("option", { name: /EURUSD/i })).not.toBeInTheDocument();
    });
  });

  it("finds all JPY instruments and restores grouped browsing when cleared", async () => {
    render(<TestHarness />);

    fireEvent.click(screen.getByLabelText("Instrument"));

    const searchInput = await screen.findByLabelText("Search instruments");
    fireEvent.change(searchInput, { target: { value: "jpy" } });

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /USDJPY/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /EURJPY/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /GBPJPY/i })).toBeInTheDocument();
      expect(screen.queryByRole("option", { name: /BTCUSD/i })).not.toBeInTheDocument();
    });

    fireEvent.change(searchInput, { target: { value: "" } });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /forex/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /crypto/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /BTCUSD/i })).toBeInTheDocument();
    });
  });
});
