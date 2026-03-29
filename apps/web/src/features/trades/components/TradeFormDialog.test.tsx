import React, { useState } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { TradeFormDialog } from "./TradeFormDialog";
import type { Account, SetupDefinition, Trade } from "@/types";

const screenshotServiceMocks = vi.hoisted(() => ({
  uploadTradeScreenshot: vi.fn(),
}));

const checklistRuleMocks = vi.hoisted(() => ({
  listChecklistRules: vi.fn(),
}));

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");

  return {
    ...actual,
    useQuery: reactQueryMocks.useQuery,
  };
});

vi.mock("@/features/auth/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      username: "trader",
      checklistEnforcementMode: "soft",
    },
  }),
}));

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

vi.mock("@/features/screenshots/components/ScreenshotUpload", () => ({
  ScreenshotUpload: ({
    tradeId,
    draftFiles,
    onDraftFilesChange,
  }: {
    tradeId?: string;
    draftFiles?: File[];
    onDraftFilesChange?: (files: File[]) => void;
  }) => (
    <div>
      <span>{tradeId ? "saved-screenshots" : "draft-screenshots"}</span>
      <span>{`draft-count:${draftFiles?.length ?? 0}`}</span>
      {onDraftFilesChange ? (
        <button
          type="button"
          onClick={() => onDraftFilesChange([new File(["image"], "chart.png", { type: "image/png" })])}
        >
          Queue Screenshot
        </button>
      ) : null}
    </div>
  ),
}));

vi.mock("@/services/api/screenshots", () => ({
  uploadTradeScreenshot: screenshotServiceMocks.uploadTradeScreenshot,
}));

vi.mock("@/services/api/checklist-rules", () => ({
  listChecklistRules: checklistRuleMocks.listChecklistRules,
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
    isArchived: false,
  },
];

const setups: SetupDefinition[] = [
  {
    id: "setup-1",
    name: "Breakout",
    description: "",
    color: "#000000",
    preTradeChecklist: [
      {
        id: "rule-1",
        title: "Wait for confirmation candle",
        description: "Do not enter before the candle close confirms the move.",
        isRequired: true,
        isActive: true,
        sortOrder: 0,
        scopeType: "setup",
        setupId: "setup-1",
        accountId: null,
        createdAt: "2026-03-21T10:00:00.000Z",
        updatedAt: "2026-03-21T10:00:00.000Z",
      },
    ],
    createdAt: "2026-03-21T10:00:00.000Z",
    updatedAt: "2026-03-21T10:00:00.000Z",
    isArchived: false,
  },
  {
    id: "setup-2",
    name: "Liquidity",
    description: "",
    color: "#2563EB",
    preTradeChecklist: [],
    createdAt: "2026-03-21T10:00:00.000Z",
    updatedAt: "2026-03-21T10:00:00.000Z",
    isArchived: false,
  },
];

function Harness({
  saveImpl = vi.fn(),
  editTrade,
  setupsOverride = setups,
  accountsOverride = accounts,
}: {
  saveImpl?: (payload: Parameters<NonNullable<React.ComponentProps<typeof TradeFormDialog>["onSave"]>>[0]) => Promise<void> | void;
  editTrade?: Trade | null;
  setupsOverride?: SetupDefinition[];
  accountsOverride?: Account[];
}) {
  const [open, setOpen] = useState(true);

  return (
    <TradeFormDialog
      open={open}
      onOpenChange={setOpen}
      onSave={saveImpl}
      editTrade={editTrade}
      accounts={accountsOverride}
      setups={setupsOverride}
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

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      {ui}
    </MemoryRouter>,
  );
}

describe("TradeFormDialog", () => {
  beforeEach(() => {
    screenshotServiceMocks.uploadTradeScreenshot.mockReset();
    checklistRuleMocks.listChecklistRules.mockReset();
    const setupChecklistState = {
      data: {
        items: [
          {
            id: "rule-1",
            title: "Wait for confirmation candle",
            description: "Do not enter before the candle close confirms the move.",
            isRequired: true,
            isActive: true,
            sortOrder: 0,
            scopeType: "setup",
            setupId: "setup-1",
            accountId: null,
            createdAt: "2026-03-21T10:00:00.000Z",
            updatedAt: "2026-03-21T10:00:00.000Z",
          },
        ],
      },
      isLoading: false,
      isError: false,
      error: null,
    };
    const emptyChecklistState = {
      data: {
        items: [],
      },
      isLoading: false,
      isError: false,
      error: null,
    };

    reactQueryMocks.useQuery.mockImplementation((options: { queryKey?: unknown[] }) => {
      const key = JSON.stringify(options.queryKey ?? []);

      if (key.includes("checklist-rules")) {
        if (key.includes("setup-1")) {
          return setupChecklistState;
        }

        return emptyChecklistState;
      }

      return {
        data: undefined,
        isLoading: false,
        isError: false,
        error: null,
      };
    });
  });

  it("shows a neutral pre-trade empty state before a setup is selected", () => {
    renderWithProviders(<Harness />);

    expect(screen.getByText("Pre-Trade")).toBeInTheDocument();
    expect(screen.getByText("No active items for this account.")).toBeInTheDocument();
    expect(screen.getByText("No account items")).toBeInTheDocument();
    expect(screen.getByText("Active global and account rules appear here. Setup rules appear after you choose a setup.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Manage in Setups" })).not.toBeInTheDocument();
  });

  it("shows a neutral pre-trade empty state when the selected setup has no checklist items", () => {
    renderWithProviders(<Harness />);

    fireEvent.change(screen.getByDisplayValue("No setup"), { target: { value: "setup-2" } });

    expect(screen.getByText("No active items for this account and setup.")).toBeInTheDocument();
    expect(screen.getByText("No items for Liquidity")).toBeInTheDocument();
    expect(screen.getByText("Active global, account, and setup rules appear here.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Manage in Setups" })).not.toBeInTheDocument();
  });

  it("renders pre-trade items from the selected setup", async () => {
    renderWithProviders(<Harness />);

    fireEvent.change(screen.getByDisplayValue("No setup"), { target: { value: "setup-1" } });

    await waitFor(() => {
      expect(screen.getByText("Wait for confirmation candle")).toBeInTheDocument();
      expect(screen.getByText("Do not enter before the candle close confirms the move.")).toBeInTheDocument();
      expect(screen.getByText("Required")).toBeInTheDocument();
    });
  });

  it("falls back to the checklist query when the selected setup payload is stale", async () => {
    const staleSetups: SetupDefinition[] = setups.map((setup) => (
      setup.id === "setup-1"
        ? { ...setup, preTradeChecklist: undefined }
        : setup
    ));
    const fallbackChecklistState = {
      data: {
        items: [
          {
            id: "rule-fallback-1",
            title: "Sweep and reclaim",
            description: "Confirm the liquidity sweep is reclaimed before entry.",
            isRequired: true,
            isActive: true,
            sortOrder: 0,
            scopeType: "setup",
            setupId: "setup-1",
            accountId: null,
            createdAt: "2026-03-21T10:00:00.000Z",
            updatedAt: "2026-03-21T10:00:00.000Z",
          },
        ],
      },
      isLoading: false,
      isError: false,
      error: null,
    };
    reactQueryMocks.useQuery.mockImplementation((options: { queryKey?: unknown[] }) => {
      const key = JSON.stringify(options.queryKey ?? []);

      if (key.includes("checklist-rules")) {
        return fallbackChecklistState;
      }

      return {
        data: undefined,
        isLoading: false,
        isError: false,
        error: null,
      };
    });

    renderWithProviders(<Harness setupsOverride={staleSetups} />);

    fireEvent.change(screen.getByDisplayValue("No setup"), { target: { value: "setup-1" } });

    await waitFor(() => {
      expect(screen.getByText("Sweep and reclaim")).toBeInTheDocument();
      expect(screen.getByText("Confirm the liquidity sweep is reclaimed before entry.")).toBeInTheDocument();
    });
  });

  it("requests applicable checklist rules using both the account and setup scope", async () => {
    checklistRuleMocks.listChecklistRules.mockResolvedValue({ items: [] });

    renderWithProviders(<Harness />);

    fireEvent.change(screen.getByDisplayValue("No setup"), { target: { value: "setup-1" } });

    let checklistQueryOptions:
      | { queryKey?: unknown[]; queryFn?: () => Promise<unknown> }
      | undefined;

    await waitFor(() => {
      checklistQueryOptions = [...reactQueryMocks.useQuery.mock.calls]
        .map(([options]) => options as { queryKey?: unknown[]; queryFn?: () => Promise<unknown> })
        .reverse()
        .find((options) => JSON.stringify(options.queryKey ?? []).includes("\"checklist-rules\""));

      expect(JSON.stringify(checklistQueryOptions?.queryKey ?? [])).toContain("\"account-1\"");
      expect(JSON.stringify(checklistQueryOptions?.queryKey ?? [])).toContain("\"setup-1\"");
    });

    await checklistQueryOptions?.queryFn?.();

    expect(checklistRuleMocks.listChecklistRules).toHaveBeenCalledWith({
      activeOnly: true,
      accountId: "account-1",
      setupId: "setup-1",
      scopeMode: "applicable",
    });
  });

  it("derives direction from entry and stop loss and blocks equal prices", async () => {
    renderWithProviders(<Harness />);

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
      expect(screen.getAllByText("Stop Loss must be above or below Entry to determine trade direction")).not.toHaveLength(0);
    });
  });

  it("derives the result badge from profit and disables save until PnL is valid", async () => {
    renderWithProviders(<Harness />);

    expect(within(getReadonlyField("Result")).getByText("Auto")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Trade" })).toBeDisabled();
    expect(screen.getByText("Enter entry and stop loss to calculate the trade direction.")).toBeInTheDocument();

    fireEvent.change(getInputByLabel("Entry"), { target: { value: "100" } });
    fireEvent.change(getInputByLabel("Stop Loss"), { target: { value: "99" } });
    fireEvent.change(getInputByLabel("Take Profit"), { target: { value: "105" } });

    await waitFor(() => {
      expect(screen.getByText("Enter PnL to calculate the trade result.")).toBeInTheDocument();
    });

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

  it("explains the account prerequisite when no accounts are available", () => {
    renderWithProviders(<Harness accountsOverride={[]} />);

    expect(screen.getByRole("button", { name: "Save Trade" })).toBeDisabled();
    expect(screen.getByText("Add an account before saving this trade.")).toBeInTheDocument();
  });

  it("submits the recomputed result from profit", async () => {
    const saveImpl = vi.fn();
    renderWithProviders(<Harness saveImpl={saveImpl} />);

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

  it("submits optional trade fact fields without breaking the legacy profit flow", async () => {
    const saveImpl = vi.fn();
    renderWithProviders(<Harness saveImpl={saveImpl} />);

    fireEvent.change(getInputByLabel("Entry"), { target: { value: "3000" } });
    fireEvent.change(getInputByLabel("Stop Loss"), { target: { value: "3010" } });
    fireEvent.change(getInputByLabel("Take Profit"), { target: { value: "2980" } });
    fireEvent.change(getInputByLabel("Exit Price"), { target: { value: "2988" } });
    fireEvent.change(getInputByLabel("Fees"), { target: { value: "5.25" } });
    fireEvent.change(getInputByLabel("Quantity"), { target: { value: "2.5" } });
    fireEvent.change(getInputByLabel("Lot Size"), { target: { value: "0.25" } });
    fireEvent.change(getInputByLabel("Risk Amount"), { target: { value: "50" } });
    fireEvent.change(getInputByLabel("Risk %"), { target: { value: "1" } });
    fireEvent.change(getProfitInput(), { target: { value: "120" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Trade" }));

    await waitFor(() => {
      expect(saveImpl).toHaveBeenCalledWith(expect.objectContaining({
        direction: "Sell",
        profit: 120,
        netPnl: 120,
        grossPnl: 125.25,
        fees: 5.25,
        quantity: 2.5,
        lotSize: 0.25,
        exitPrice: 2988,
        riskAmount: 50,
        riskPercent: 1,
        result: "Win",
      }));
    });
  });

  it("keeps an archived account available when editing a historical trade", async () => {
    const archivedTrade: Trade = {
      id: "trade-archived-account",
      date: "2026-03-21",
      pair: "XAUUSD",
      accountId: "account-archived",
      direction: "Buy",
      entry: 3000,
      stopLoss: 2990,
      takeProfit: 3020,
      profit: 100,
      result: "Win",
      setupId: null,
      setup: "",
      session: "London",
      emotion: "Calm",
      notes: "",
      screenshots: [],
      createdAt: "2026-03-21T10:00:00.000Z",
      updatedAt: "2026-03-21T10:00:00.000Z",
      account: {
        id: "account-archived",
        name: "Legacy Account",
        broker: "Manual",
        type: "Personal",
        currency: "USD",
        isDefault: false,
        isArchived: true,
      },
    };

    renderWithProviders(<Harness editTrade={archivedTrade} />);

    expect(screen.getByText("Archived account kept for historical edits.")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Legacy Account (archived)" })).toBeInTheDocument();
  });

  it("shows and submits pre-trade selections when editing a trade", async () => {
    const saveImpl = vi.fn();
    const tradeWithChecklist: Trade = {
      id: "trade-edit-checklist",
      date: "2026-03-21",
      pair: "XAUUSD",
      accountId: "account-1",
      direction: "Buy",
      entry: 3000,
      stopLoss: 2990,
      takeProfit: 3020,
      profit: 100,
      result: "Win",
      setupId: "setup-1",
      setup: "Breakout",
      session: "London",
      emotion: "Calm",
      notes: "",
      screenshots: [],
      createdAt: "2026-03-21T10:00:00.000Z",
      updatedAt: "2026-03-21T10:00:00.000Z",
      checklistResponses: [
        {
          id: "trade-check-1",
          tradeId: "trade-edit-checklist",
          checklistRuleId: "rule-1",
          ruleTitleSnapshot: "Wait for confirmation candle",
          ruleDescriptionSnapshot: "Do not enter before the candle close confirms the move.",
          isRequiredSnapshot: true,
          checked: true,
          note: null,
          sortOrderSnapshot: 0,
          createdAt: "2026-03-21T10:00:00.000Z",
          updatedAt: "2026-03-21T10:00:00.000Z",
        },
      ],
    };

    renderWithProviders(<Harness editTrade={tradeWithChecklist} saveImpl={saveImpl} />);

    expect(await screen.findByText("Pre-Trade")).toBeInTheDocument();
    expect(screen.getByText("Wait for confirmation candle")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Update Trade" }));

    await waitFor(() => {
      expect(saveImpl).toHaveBeenCalledWith(expect.objectContaining({
        checklistResponses: [
          {
            checklistRuleId: "rule-1",
            checked: true,
          },
        ],
        checklistScopeMode: "applicable",
      }));
    });
  });

  it("uploads queued screenshots after saving a new trade", async () => {
    const createdTrade: Trade = {
      id: "trade-1",
      date: "2026-03-21",
      pair: "XAUUSD",
      accountId: "account-1",
      direction: "Buy",
      entry: 100,
      stopLoss: 99,
      takeProfit: 105,
      profit: 25,
      result: "Win",
      setupId: null,
      setup: "",
      session: "London",
      emotion: "Calm",
      notes: "",
      screenshots: [],
      screenshotAssets: [],
      createdAt: "2026-03-21T10:00:00.000Z",
      updatedAt: "2026-03-21T10:00:00.000Z",
    };

    const saveImpl = vi.fn().mockResolvedValue(createdTrade);
    screenshotServiceMocks.uploadTradeScreenshot.mockResolvedValue({
      id: "shot-1",
      url: "https://example.com/shot-1.png",
      storageKey: "users/user-1/trades/trade-1/shot-1.png",
      sortOrder: 0,
      createdAt: "2026-03-21T10:00:00.000Z",
    });

    renderWithProviders(<Harness saveImpl={saveImpl} />);

    fireEvent.change(getInputByLabel("Entry"), { target: { value: "100" } });
    fireEvent.change(getInputByLabel("Stop Loss"), { target: { value: "99" } });
    fireEvent.change(getInputByLabel("Take Profit"), { target: { value: "105" } });
    fireEvent.change(getProfitInput(), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: "Queue Screenshot" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Trade" }));

    await waitFor(() => {
      expect(saveImpl).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screenshotServiceMocks.uploadTradeScreenshot).toHaveBeenCalledWith({
        tradeId: "trade-1",
        file: expect.any(File),
        sortOrder: 0,
      });
    });
  });

  it("keeps queued screenshots visible when upload fails after saving", async () => {
    const createdTrade: Trade = {
      id: "trade-1",
      date: "2026-03-21",
      pair: "XAUUSD",
      accountId: "account-1",
      direction: "Buy",
      entry: 100,
      stopLoss: 99,
      takeProfit: 105,
      profit: 25,
      result: "Win",
      setupId: null,
      setup: "",
      session: "London",
      emotion: "Calm",
      notes: "",
      screenshots: [],
      screenshotAssets: [],
      createdAt: "2026-03-21T10:00:00.000Z",
      updatedAt: "2026-03-21T10:00:00.000Z",
    };

    const saveImpl = vi.fn().mockResolvedValue(createdTrade);
    screenshotServiceMocks.uploadTradeScreenshot.mockRejectedValue(new Error("The screenshot file could not be uploaded. Please try again."));

    renderWithProviders(<Harness saveImpl={saveImpl} />);

    fireEvent.change(getInputByLabel("Entry"), { target: { value: "100" } });
    fireEvent.change(getInputByLabel("Stop Loss"), { target: { value: "99" } });
    fireEvent.change(getInputByLabel("Take Profit"), { target: { value: "105" } });
    fireEvent.change(getProfitInput(), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: "Queue Screenshot" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Trade" }));

    await waitFor(() => {
      expect(screenshotServiceMocks.uploadTradeScreenshot).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText("saved-screenshots")).toBeInTheDocument();
      expect(screen.getByText("draft-count:1")).toBeInTheDocument();
    });
  });
});
