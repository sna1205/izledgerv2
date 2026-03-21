import React, { useState } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TradeFormDialog } from "./TradeFormDialog";
import type { Account, SetupDefinition, Trade } from "@/lib/types";

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("./InstrumentSelect", () => ({
  InstrumentSelect: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <input aria-label="Instrument" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));

vi.mock("./ScreenshotUpload", () => ({
  ScreenshotUpload: () => null,
}));

vi.mock("@/components/ui/select", async () => {
  const ReactModule = await import("react");

  type Option = {
    value: string;
    label: React.ReactNode;
  };

  const SelectItem = ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  );

  function collectOptions(children: React.ReactNode): Option[] {
    const options: Option[] = [];

    ReactModule.Children.forEach(children, (child) => {
      if (!ReactModule.isValidElement(child)) {
        return;
      }

      if (child.type === SelectItem) {
        options.push({
          value: child.props.value,
          label: child.props.children,
        });
        return;
      }

      options.push(...collectOptions(child.props.children));
    });

    return options;
  }

  return {
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value: string;
      onValueChange?: (value: string) => void;
      children: React.ReactNode;
    }) => {
      const options = collectOptions(children);

      return (
        <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    },
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectValue: () => null,
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectItem,
  };
});

const accounts: Account[] = [
  {
    id: "account-1",
    name: "Primary",
    broker: "Manual",
    type: "Personal",
    balance: 1000,
    currency: "USD",
    createdAt: "2026-03-21T10:00:00.000Z",
    updatedAt: "2026-03-21T10:00:00.000Z",
    isDefault: true,
  },
];

const setups: SetupDefinition[] = [
  {
    id: "setup-1",
    name: "Breakout",
    description: "",
    color: "#000000",
    createdAt: "2026-03-21T10:00:00.000Z",
    updatedAt: "2026-03-21T10:00:00.000Z",
    isArchived: false,
  },
];

function Harness({
  saveImpl = vi.fn(),
  editTrade,
}: {
  saveImpl?: (payload: Parameters<NonNullable<React.ComponentProps<typeof TradeFormDialog>["onSave"]>>[0]) => Promise<void> | void;
  editTrade?: Trade | null;
}) {
  const [open, setOpen] = useState(true);

  return (
    <TradeFormDialog
      open={open}
      onOpenChange={setOpen}
      onSave={saveImpl}
      editTrade={editTrade}
      accounts={accounts}
      setups={setups}
    />
  );
}

function getProfitInput() {
  const section = screen.getByText("PnL").closest("div");
  expect(section).not.toBeNull();
  return within(section as HTMLElement).getByRole("spinbutton");
}

function getInputByLabel(label: string) {
  const section = screen.getByText(label).closest("div");
  expect(section).not.toBeNull();
  return within(section as HTMLElement).getByRole("spinbutton");
}

function getReadonlyField(label: string) {
  const section = screen.getByText(label).closest("div");
  expect(section).not.toBeNull();
  return section as HTMLElement;
}

describe("TradeFormDialog", () => {
  it("derives direction from entry and stop loss and blocks equal prices", async () => {
    render(<Harness />);

    expect(within(getReadonlyField("Direction")).getByText("Auto")).toBeInTheDocument();

    fireEvent.change(getInputByLabel("Entry"), { target: { value: "100" } });
    fireEvent.change(getInputByLabel("Stop Loss"), { target: { value: "99" } });

    await waitFor(() => {
      expect(screen.getByText("Buy")).toBeInTheDocument();
    });

    fireEvent.change(getInputByLabel("Stop Loss"), { target: { value: "101" } });

    await waitFor(() => {
      expect(screen.getByText("Sell")).toBeInTheDocument();
    });

    fireEvent.change(getInputByLabel("Stop Loss"), { target: { value: "100" } });

    await waitFor(() => {
      expect(within(getReadonlyField("Direction")).getByText("Auto")).toBeInTheDocument();
      expect(screen.getByText("Stop Loss must be above or below Entry to determine trade direction")).toBeInTheDocument();
    });
  });

  it("derives the result badge from profit and disables save until PnL is valid", async () => {
    render(<Harness />);

    expect(within(getReadonlyField("Result")).getByText("Auto")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Trade" })).toBeDisabled();

    fireEvent.change(getInputByLabel("Entry"), { target: { value: "100" } });
    fireEvent.change(getInputByLabel("Stop Loss"), { target: { value: "99" } });
    fireEvent.change(getInputByLabel("Take Profit"), { target: { value: "105" } });

    fireEvent.change(getProfitInput(), { target: { value: "42.5" } });

    await waitFor(() => {
      expect(screen.getByText("Win")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save Trade" })).not.toBeDisabled();
    });

    fireEvent.change(getProfitInput(), { target: { value: "-10" } });

    await waitFor(() => {
      expect(screen.getByText("Loss")).toBeInTheDocument();
    });

    fireEvent.change(getProfitInput(), { target: { value: "0" } });

    await waitFor(() => {
      expect(screen.getByText("Breakeven")).toBeInTheDocument();
    });

    fireEvent.change(getProfitInput(), { target: { value: "" } });

    await waitFor(() => {
      expect(within(getReadonlyField("Result")).getByText("Auto")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save Trade" })).toBeDisabled();
    });
  });

  it("submits the recomputed result from profit", async () => {
    const saveImpl = vi.fn();
    render(<Harness saveImpl={saveImpl} />);

    fireEvent.change(getInputByLabel("Entry"), { target: { value: "3000" } });
    fireEvent.change(getInputByLabel("Stop Loss"), { target: { value: "3010" } });
    fireEvent.change(getInputByLabel("Take Profit"), { target: { value: "2950" } });
    fireEvent.change(getProfitInput(), { target: { value: "-125.75" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Trade" }));

    await waitFor(() => {
      expect(saveImpl).toHaveBeenCalledWith(expect.objectContaining({
        direction: "Sell",
        profit: -125.75,
        result: "Loss",
      }));
    });
  });
});
