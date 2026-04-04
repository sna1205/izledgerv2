import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Setups from "@/pages/Setups";
import NewSetup from "@/pages/NewSetup";

vi.mock("@/features/auth/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      username: "trader",
    },
  }),
}));

const apiMocks = vi.hoisted(() => ({
  listSetups: vi.fn(),
  createSetup: vi.fn(),
  updateSetup: vi.fn(),
  deleteSetup: vi.fn(),
  createChecklistRule: vi.fn(),
  updateChecklistRule: vi.fn(),
  deleteChecklistRule: vi.fn(),
  toggleChecklistRuleActive: vi.fn(),
  reorderChecklistRules: vi.fn(),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/services/api/setups", () => ({
  listSetups: apiMocks.listSetups,
  createSetup: apiMocks.createSetup,
  updateSetup: apiMocks.updateSetup,
  deleteSetup: apiMocks.deleteSetup,
}));

vi.mock("@/services/api/checklist-rules", () => ({
  createChecklistRule: apiMocks.createChecklistRule,
  updateChecklistRule: apiMocks.updateChecklistRule,
  deleteChecklistRule: apiMocks.deleteChecklistRule,
  toggleChecklistRuleActive: apiMocks.toggleChecklistRuleActive,
  reorderChecklistRules: apiMocks.reorderChecklistRules,
}));

vi.mock("@/components/ui/sonner", () => ({
  toast: apiMocks.toast,
  Toaster: () => null,
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
    Select: ({ value, onValueChange, children }: { value: string; onValueChange?: (value: string) => void; children: React.ReactNode }) => {
      const options = collectOptions(children);

      return (
        <select data-testid="mock-select" value={value} onChange={(event) => onValueChange?.(event.target.value)}>
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

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/setups"]}>
        <Routes>
          <Route path="/setups" element={<Setups />} />
          <Route path="/setups/new" element={<NewSetup />} />
          <Route path="/setups/:id" element={<NewSetup />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  apiMocks.listSetups.mockReset();
  apiMocks.createSetup.mockReset();
  apiMocks.updateSetup.mockReset();
  apiMocks.deleteSetup.mockReset();
  apiMocks.createChecklistRule.mockReset();
  apiMocks.updateChecklistRule.mockReset();
  apiMocks.deleteChecklistRule.mockReset();
  apiMocks.toggleChecklistRuleActive.mockReset();
  apiMocks.reorderChecklistRules.mockReset();
  apiMocks.toast.success.mockReset();
  apiMocks.toast.error.mockReset();

  apiMocks.createChecklistRule.mockResolvedValue({
    rule: {
      id: "rule-created",
      title: "Wait for confirmation candle",
      description: null,
      isRequired: false,
      isActive: true,
      sortOrder: 0,
      scopeType: "setup",
      setupId: "setup-3",
      accountId: null,
      createdAt: "2026-03-03T10:05:00.000Z",
      updatedAt: "2026-03-03T10:05:00.000Z",
    },
  });
  apiMocks.updateChecklistRule.mockResolvedValue({ rule: null });
  apiMocks.deleteChecklistRule.mockResolvedValue(undefined);
  apiMocks.toggleChecklistRuleActive.mockResolvedValue({ rule: null });
  apiMocks.reorderChecklistRules.mockResolvedValue({ items: [] });

  apiMocks.listSetups.mockResolvedValue({
    items: [
      {
        id: "setup-1",
        name: "Breakout",
        description: "Retest entry",
        entryLogic: "Wait for breakout and reclaim.",
        confirmationLogic: "Accept only with displacement.",
        invalidationLogic: "Cancel if price loses the reclaimed level.",
        preTradeChecklist: [
          {
            id: "rule-1",
            title: "Bias aligned",
            description: null,
            isRequired: true,
            isActive: true,
            sortOrder: 0,
            scopeType: "setup",
            setupId: "setup-1",
            accountId: null,
            createdAt: "2026-03-01T10:00:00.000Z",
            updatedAt: "2026-03-01T10:00:00.000Z",
          },
        ],
        color: "#3B82F6",
        isArchived: false,
        tradeCount: 12,
        createdAt: "2026-03-01T10:00:00.000Z",
        updatedAt: "2026-03-01T10:00:00.000Z",
      },
      {
        id: "setup-2",
        name: "Reversal",
        description: "Fade into liquidity",
        entryLogic: "Look for exhaustion at external liquidity.",
        confirmationLogic: "",
        invalidationLogic: "",
        preTradeChecklist: [],
        color: "#10B981",
        isArchived: false,
        tradeCount: 8,
        createdAt: "2026-03-02T10:00:00.000Z",
        updatedAt: "2026-03-02T10:00:00.000Z",
      },
    ],
    pagination: {
      page: 1,
      pageSize: 12,
      total: 2,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  });
});

describe("setups color flow", () => {
  it("auto-generates a unique color when creating a setup", async () => {
    apiMocks.createSetup.mockResolvedValue({
      setup: {
        id: "setup-3",
        name: "Momentum",
        description: "",
        color: "#F59E0B",
        isArchived: false,
        createdAt: "2026-03-03T10:00:00.000Z",
        updatedAt: "2026-03-03T10:00:00.000Z",
      },
    });

    renderPage();

    await screen.findByText("Breakout");
    fireEvent.click(screen.getByRole("link", { name: "New Setup" }));

    await screen.findByLabelText("Setup Name");
    fireEvent.change(screen.getByLabelText("Setup Name"), { target: { value: "Momentum" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Create Setup" })[0]);

    await waitFor(() => {
      expect(apiMocks.createSetup).toHaveBeenCalledTimes(1);
    });

    const payload = apiMocks.createSetup.mock.calls[0][0];
    expect(payload.name).toBe("Momentum");
    expect(payload.color).toMatch(/^#[A-F0-9]{6}$/);
    expect(["#3B82F6", "#10B981"]).not.toContain(payload.color);
  });

  it("preserves the existing color when editing without regenerating", async () => {
    apiMocks.updateSetup.mockResolvedValue({
      setup: {
        id: "setup-1",
        name: "Breakout",
        description: "Retest entry",
        color: "#3B82F6",
        isArchived: false,
        createdAt: "2026-03-01T10:00:00.000Z",
        updatedAt: "2026-03-04T10:00:00.000Z",
      },
    });

    renderPage();

    await screen.findByText("Breakout");
    fireEvent.click(screen.getByRole("button", { name: "Edit Breakout" }));

    await screen.findByDisplayValue("Breakout");
    fireEvent.click(screen.getAllByRole("button", { name: "Save Setup" })[0]);

    await waitFor(() => {
      expect(apiMocks.updateSetup).toHaveBeenCalledWith("setup-1", expect.objectContaining({
        color: "#3B82F6",
      }));
    });
  });

  it("shows fast-scanning card content and archives from quick actions", async () => {
    apiMocks.updateSetup.mockResolvedValue({
      setup: {
        id: "setup-1",
        name: "Breakout",
        description: "Retest entry",
        color: "#3B82F6",
        isArchived: true,
        createdAt: "2026-03-01T10:00:00.000Z",
        updatedAt: "2026-03-04T10:00:00.000Z",
      },
    });

    renderPage();

    await screen.findByText("Breakout");
    expect(screen.getByText("1 rule")).toBeInTheDocument();
    expect(screen.getByText((_content, element) => element?.textContent === "Used in 12 trades")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Archive Breakout" }));

    await waitFor(() => {
      expect(apiMocks.updateSetup).toHaveBeenCalledWith("setup-1", { isArchived: true });
    });
  });

  it("keeps checklist items local until the first setup save, then persists them in sequence", async () => {
    apiMocks.createSetup.mockResolvedValue({
      setup: {
        id: "setup-3",
        name: "Momentum",
        description: "",
        entryLogic: "",
        confirmationLogic: "",
        invalidationLogic: "",
        notes: "",
        color: "#F59E0B",
        isArchived: false,
        preTradeChecklist: [],
        tradeCount: 0,
        createdAt: "2026-03-03T10:00:00.000Z",
        updatedAt: "2026-03-03T10:00:00.000Z",
      },
    });

    renderPage();

    await screen.findByText("Breakout");
    fireEvent.click(screen.getByRole("link", { name: "New Setup" }));

    await screen.findByLabelText("Setup Name");
    fireEvent.change(screen.getByLabelText("Setup Name"), { target: { value: "Momentum" } });
    fireEvent.click(screen.getByRole("button", { name: /Pre-trade Checklist/i }));

    await screen.findByLabelText("Add a pre-trade rule");
    fireEvent.change(screen.getByLabelText("Add a pre-trade rule"), { target: { value: "Wait for confirmation candle" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(apiMocks.createChecklistRule).not.toHaveBeenCalled();
    expect(apiMocks.reorderChecklistRules).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole("button", { name: "Create Setup" })[0]);

    await waitFor(() => {
      expect(apiMocks.createSetup).toHaveBeenCalledTimes(1);
      expect(apiMocks.createChecklistRule).toHaveBeenCalledTimes(1);
      expect(apiMocks.reorderChecklistRules).toHaveBeenCalledWith(["rule-created"]);
    });

    expect(apiMocks.createChecklistRule).toHaveBeenCalledWith(expect.objectContaining({
      title: "Wait for confirmation candle",
      setupId: "setup-3",
    }));
    expect(apiMocks.createSetup.mock.invocationCallOrder[0]).toBeLessThan(apiMocks.createChecklistRule.mock.invocationCallOrder[0]);
  });

  it("duplicates a setup from the list and recreates its checklist", async () => {
    apiMocks.createSetup.mockResolvedValue({
      setup: {
        id: "setup-3",
        name: "Breakout Copy",
        description: "Retest entry",
        entryLogic: "Wait for breakout and reclaim.",
        confirmationLogic: "Accept only with displacement.",
        invalidationLogic: "Cancel if price loses the reclaimed level.",
        notes: "",
        color: "#3B82F6",
        isArchived: false,
        preTradeChecklist: [],
        tradeCount: 0,
        createdAt: "2026-03-05T10:00:00.000Z",
        updatedAt: "2026-03-05T10:00:00.000Z",
      },
    });

    renderPage();

    await screen.findByText("Breakout");
    fireEvent.click(screen.getByRole("button", { name: "Duplicate Breakout" }));

    await waitFor(() => {
      expect(apiMocks.createSetup).toHaveBeenCalledWith(expect.objectContaining({
        name: "Breakout Copy",
        description: "Retest entry",
      }));
      expect(apiMocks.createChecklistRule).toHaveBeenCalledWith(expect.objectContaining({
        title: "Bias aligned",
        setupId: "setup-3",
      }));
      expect(apiMocks.reorderChecklistRules).toHaveBeenCalledWith(["rule-created"]);
    });
  });
});
