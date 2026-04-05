import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toBlob } from "html-to-image";
import { ShareTradeModal } from "@/features/trade-sharing/components/ShareTradeModal";

const shareMocks = vi.hoisted(() => ({
  getTradeShares: vi.fn(),
  createTradeShare: vi.fn(),
  revokeTradeShare: vi.fn(),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/services/api/trade-shares", () => ({
  getTradeShares: shareMocks.getTradeShares,
  createTradeShare: shareMocks.createTradeShare,
  revokeTradeShare: shareMocks.revokeTradeShare,
}));

vi.mock("@/components/ui/sonner", () => ({
  toast: shareMocks.toast,
  Toaster: () => null,
}));

vi.mock("html-to-image", () => ({
  toBlob: vi.fn(),
}));

vi.mock("@/features/trade-sharing/components/ShareTradeCard", () => ({
  ShareTradeCard: ({ trade }: { trade: { pair: string } }) => <div>Share preview for {trade.pair}</div>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/tabs", async () => {
  const ReactModule = await import("react");

  const TabsContext = ReactModule.createContext<{
    value: string;
    onValueChange?: (value: string) => void;
  }>({ value: "" });

  return {
    Tabs: ({ value, onValueChange, children }: { value: string; onValueChange?: (value: string) => void; children: React.ReactNode }) => (
      <TabsContext.Provider value={{ value, onValueChange }}>{children}</TabsContext.Provider>
    ),
    TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TabsTrigger: ({ value, children }: { value: string; children: React.ReactNode }) => {
      const context = ReactModule.useContext(TabsContext);
      return <button type="button" onClick={() => context.onValueChange?.(value)}>{children}</button>;
    },
    TabsContent: ({ value, children }: { value: string; children: React.ReactNode }) => {
      const context = ReactModule.useContext(TabsContext);
      return context.value === value ? <div>{children}</div> : null;
    },
  };
});

vi.mock("@/components/ui/switch", () => ({
  Switch: ({ checked, onCheckedChange, "aria-label": ariaLabel }: { checked: boolean; onCheckedChange?: (checked: boolean) => void; "aria-label"?: string }) => (
    <input
      type="checkbox"
      aria-label={ariaLabel}
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

const trade = {
  id: "trade-1",
  date: "2026-03-17",
  pair: "EURUSD",
  accountId: "account-1",
  direction: "Buy" as const,
  entry: 1.1,
  stopLoss: 1.09,
  takeProfit: 1.12,
  profit: 150,
  result: "Win" as const,
  setupId: "setup-1",
  setup: "Breakout",
  session: null,
  emotion: null,
  notes: "Waited for confirmation.",
  screenshots: ["https://example.com/chart.png"],
  screenshotAssets: [],
  createdAt: "2026-03-17T09:00:00.000Z",
  updatedAt: "2026-03-17T10:00:00.000Z",
};

const activeShare = {
  id: "share-record-1",
  shareId: "share-public-1",
  status: "active" as const,
  isActive: true,
  viewCount: 12,
  expiresAt: "2026-03-20T12:00:00.000Z",
  publicUrl: "https://izledger.app/shared/trade/share-public-1",
  settings: {
    showPnl: true,
    showAccountName: false,
    showNotes: true,
    showScreenshots: true,
    showExactPrices: true,
  },
  createdAt: "2026-03-17T10:00:00.000Z",
  updatedAt: "2026-03-17T10:15:00.000Z",
};

const revokedShare = {
  ...activeShare,
  status: "revoked" as const,
  isActive: false,
  publicUrl: null,
  updatedAt: "2026-03-17T11:00:00.000Z",
};

describe("ShareTradeModal", () => {
  beforeEach(() => {
    shareMocks.getTradeShares.mockReset();
    shareMocks.createTradeShare.mockReset();
    shareMocks.revokeTradeShare.mockReset();
    shareMocks.toast.success.mockReset();
    shareMocks.toast.error.mockReset();
    vi.mocked(toBlob).mockReset();
    Object.assign(URL, {
      createObjectURL: vi.fn(() => "blob:trade-share"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a share, refreshes the owner share list, and renders expiration details", async () => {
    shareMocks.getTradeShares
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({ items: [activeShare] });
    shareMocks.createTradeShare.mockResolvedValue({ share: activeShare });

    render(
      <ShareTradeModal open onOpenChange={vi.fn()} trade={trade} accountName="Primary" />,
    );

    await screen.findByText("No public link yet.");

    fireEvent.change(screen.getByLabelText("Link expiration"), {
      target: {
        value: "2026-03-20T19:00",
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Generate link" }));

    await waitFor(() => {
      expect(shareMocks.createTradeShare).toHaveBeenCalledWith("trade-1", expect.objectContaining({
        settings: activeShare.settings,
        expiresAt: "2026-03-20T12:00:00.000Z",
      }));
    });

    await screen.findByText(activeShare.publicUrl);

    expect(shareMocks.getTradeShares).toHaveBeenCalledTimes(2);
    expect(screen.getAllByText("Mar 20, 2026 7:00 PM").length).toBeGreaterThan(0);
    expect(shareMocks.toast.success).toHaveBeenCalledWith("Public trade link is ready.");
  });

  it("loads the current share state, revokes it, and refreshes again when reopened", async () => {
    shareMocks.getTradeShares
      .mockResolvedValueOnce({ items: [activeShare] })
      .mockResolvedValueOnce({ items: [revokedShare] })
      .mockResolvedValueOnce({ items: [revokedShare] });
    shareMocks.revokeTradeShare.mockResolvedValue({ share: revokedShare });

    const { rerender } = render(
      <ShareTradeModal open onOpenChange={vi.fn()} trade={trade} accountName="Primary" />,
    );

    await screen.findByText(activeShare.publicUrl);
    expect(screen.getByText("Owner share history")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Revoke link" }));

    await waitFor(() => {
      expect(shareMocks.revokeTradeShare).toHaveBeenCalledWith("share-public-1");
    });

    await waitFor(() => {
      expect(screen.getAllByText("Revoked").length).toBeGreaterThan(0);
    });
    expect(shareMocks.getTradeShares).toHaveBeenCalledTimes(2);

    rerender(<ShareTradeModal open={false} onOpenChange={vi.fn()} trade={trade} accountName="Primary" />);
    rerender(<ShareTradeModal open onOpenChange={vi.fn()} trade={trade} accountName="Primary" />);

    await waitFor(() => {
      expect(shareMocks.getTradeShares).toHaveBeenCalledTimes(3);
    });

    expect(screen.getAllByText("Revoked").length).toBeGreaterThan(0);
    expect(shareMocks.toast.success).toHaveBeenCalledWith("Shared link revoked.");
  });

  it("downloads a png image without revoking the object url immediately", async () => {
    shareMocks.getTradeShares.mockResolvedValue({ items: [] });
    vi.mocked(toBlob).mockResolvedValue(new Blob(["png-data"], { type: "image/png" }));

    const createObjectURLSpy = vi.mocked(URL.createObjectURL);
    const revokeObjectURLSpy = vi.mocked(URL.revokeObjectURL);
    const setTimeoutSpy = vi.spyOn(window, "setTimeout");
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    render(
      <ShareTradeModal open onOpenChange={vi.fn()} trade={trade} accountName="Primary" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Image Export" }));
    fireEvent.click(await screen.findByRole("button", { name: "Download Image" }));

    await waitFor(() => {
      expect(toBlob).toHaveBeenCalled();
      expect(anchorClickSpy).toHaveBeenCalled();
      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(shareMocks.toast.success).toHaveBeenCalledWith("Image downloaded");
    });

    expect(revokeObjectURLSpy).not.toHaveBeenCalled();
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
  });

  it("copies a generated png image to the clipboard", async () => {
    shareMocks.getTradeShares.mockResolvedValue({ items: [] });
    vi.mocked(toBlob).mockResolvedValue(new Blob(["png-data"]));

    const clipboardWrite = vi.fn().mockResolvedValue(undefined);
    const clipboardItem = vi.fn((items: Record<string, Blob>) => items);

    Object.assign(navigator, {
      clipboard: {
        write: clipboardWrite,
        writeText: vi.fn(),
      },
    });
    Object.assign(globalThis, {
      ClipboardItem: clipboardItem,
    });

    render(
      <ShareTradeModal open onOpenChange={vi.fn()} trade={trade} accountName="Primary" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Image Export" }));
    fireEvent.click(await screen.findByRole("button", { name: "Copy Image" }));

    await waitFor(() => {
      expect(clipboardItem).toHaveBeenCalledWith({
        "image/png": expect.any(Blob),
      });
      expect(clipboardWrite).toHaveBeenCalledWith([
        {
          "image/png": expect.any(Blob),
        },
      ]);
      expect(shareMocks.toast.success).toHaveBeenCalledWith("Image copied to clipboard");
    });

    const copiedBlob = clipboardItem.mock.calls[0]?.[0]?.["image/png"];
    expect(copiedBlob).toBeInstanceOf(Blob);
    expect(copiedBlob.type).toBe("image/png");
  });

  it("retries export without screenshots when the first render fails", async () => {
    shareMocks.getTradeShares.mockResolvedValue({ items: [] });
    vi.mocked(toBlob)
      .mockRejectedValueOnce(new Error("foreignObject render failed"))
      .mockResolvedValueOnce(new Blob(["png-data"], { type: "image/png" }));

    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    render(
      <ShareTradeModal open onOpenChange={vi.fn()} trade={trade} accountName="Primary" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Image Export" }));
    fireEvent.click(await screen.findByRole("button", { name: "Download Image" }));

    await waitFor(() => {
      expect(toBlob).toHaveBeenCalledTimes(2);
      expect(anchorClickSpy).toHaveBeenCalled();
      expect(shareMocks.toast.success).toHaveBeenCalledWith("Image downloaded");
    });
  });
});
