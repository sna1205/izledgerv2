import React, { useState } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { TradeFormDialog } from "./TradeFormDialog";
import type { Account, SetupDefinition, Trade } from "@/types";

const screenshotServiceMocks = vi.hoisted(() => ({
  uploadTradeScreenshot: vi.fn(),
}));

const economicCalendarMocks = vi.hoisted(() => ({
  getEconomicCalendarList: vi.fn(),
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

vi.mock("@/services/api/economic-calendar", () => ({
  getEconomicCalendarList: economicCalendarMocks.getEconomicCalendarList,
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
}: {
  saveImpl?: (payload: Parameters<NonNullable<React.ComponentProps<typeof TradeFormDialog>["onSave"]>>[0]) => Promise<void> | void;
  editTrade?: Trade | null;
  setupsOverride?: SetupDefinition[];
}) {
  const [open, setOpen] = useState(true);

  return (
    <TradeFormDialog
      open={open}
      onOpenChange={setOpen}
      onSave={saveImpl}
      editTrade={editTrade}
      accounts={accounts}
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
    economicCalendarMocks.getEconomicCalendarList.mockReset();
    checklistRuleMocks.listChecklistRules.mockReset();
    economicCalendarMocks.getEconomicCalendarList.mockResolvedValue({
      fetchedAtUtc: new Date().toISOString(),
      providerStatus: "live",
      cacheStatus: "miss",
      range: {
        startDate: "2026-03-25",
        endDate: "2026-03-25",
      },
      filters: {
        range: "today",
        currencies: [],
        impacts: [],
        instrument: null,
        relevantOnly: false,
      },
      items: [],
    });
    const economicCalendarState = {
      data: {
        fetchedAtUtc: new Date().toISOString(),
        providerStatus: "live",
        cacheStatus: "miss",
        range: {
          startDate: "2026-03-25",
          endDate: "2026-03-25",
        },
        filters: {
          range: "today",
          currencies: [],
          impacts: [],
          instrument: null,
          relevantOnly: false,
        },
        items: [],
      },
      isLoading: false,
      isError: false,
      error: null,
    };
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

      return economicCalendarState;
    });
  });

  it("shows a neutral pre-trade empty state before a setup is selected", () => {
    renderWithProviders(<Harness />);

    expect(screen.getByText("Pre-Trade")).toBeInTheDocument();
    expect(screen.getByText("No account checklist items yet.")).toBeInTheDocument();
    expect(screen.getByText("Global and account-specific checklist rules will appear here. Setup-specific items join once you pick a setup.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Manage in Setups" })).not.toBeInTheDocument();
  });

  it("shows a neutral pre-trade empty state when the selected setup has no checklist items", () => {
    renderWithProviders(<Harness />);

    fireEvent.change(screen.getByDisplayValue("No setup"), { target: { value: "setup-2" } });

    expect(screen.getByText("This account and setup do not have any active checklist items right now.")).toBeInTheDocument();
    expect(screen.getByText("No pre-trade items for Liquidity yet.")).toBeInTheDocument();
    expect(screen.getByText("Global, account, and setup-specific checklist rules will appear here when they are active.")).toBeInTheDocument();
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
    const economicCalendarState = {
      data: {
        fetchedAtUtc: new Date().toISOString(),
        providerStatus: "live",
        cacheStatus: "miss",
        range: {
          startDate: "2026-03-25",
          endDate: "2026-03-25",
        },
        filters: {
          range: "today",
          currencies: [],
          impacts: [],
          instrument: null,
          relevantOnly: false,
        },
        items: [],
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

      return economicCalendarState;
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
      expect(screen.getByText("Stop Loss must be above or below Entry to determine trade direction")).toBeInTheDocument();
    });
  });

  it("derives the result badge from profit and disables save until PnL is valid", async () => {
    renderWithProviders(<Harness />);

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

  it("shows a non-blocking warning when a relevant high-impact event is near", async () => {
    const eventTime = new Date(Date.now() + 10 * 60_000);

    reactQueryMocks.useQuery.mockReturnValue({
      data: {
        fetchedAtUtc: new Date().toISOString(),
        providerStatus: "live",
        cacheStatus: "miss",
        range: {
          startDate: "2026-03-25",
          endDate: "2026-03-25",
        },
        filters: {
          range: "today",
          currencies: ["USD"],
          impacts: ["high"],
          instrument: "XAUUSD",
          relevantOnly: true,
        },
        items: [
          {
            id: "event-1",
            providerEventId: "provider-1",
            title: "CPI y/y",
            country: "USD",
            currency: "USD",
            impactLevel: "high",
            eventTimeUtc: eventTime.toISOString(),
            previousValue: "3.0%",
            forecastValue: "3.1%",
            actualValue: null,
            revisedValue: null,
            status: "upcoming",
            category: "inflation",
            sourceProvider: "fair-economy",
            lastUpdatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            relevance: {
              relevant: true,
              reason: "Major US macro and Fed releases can move XAUUSD through USD and rate expectations.",
            },
          },
        ],
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    renderWithProviders(<Harness />);

    await waitFor(() => {
      expect(screen.getByText(/Relevant high-impact event/i)).toBeInTheDocument();
      expect(screen.getAllByText(/CPI y\/y/i).length).toBeGreaterThan(0);
    });

    fireEvent.change(getInputByLabel("Entry"), { target: { value: "3000" } });
    fireEvent.change(getInputByLabel("Stop Loss"), { target: { value: "2990" } });
    fireEvent.change(getInputByLabel("Take Profit"), { target: { value: "3020" } });
    fireEvent.change(getProfitInput(), { target: { value: "50" } });

    expect(screen.getByRole("button", { name: "Save Trade" })).not.toBeDisabled();
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

    expect(screen.getByText("Archived accounts stay available here only so historical trades can still be edited safely.")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Legacy Account (archived)" })).toBeInTheDocument();
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
