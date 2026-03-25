import React, { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/services/api/client";
import { TradeReviewDialog } from "@/features/reviews/components/TradeReviewDialog";
import type { Review, Trade } from "@/types";

vi.mock("@/features/reviews/components/TradeReviewSummary", () => ({
  TradeReviewSummary: ({ trade }: { trade: Trade }) => <div>{trade.pair}</div>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
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

const trade: Trade = {
  id: "trade-1",
  date: "2026-03-16",
  pair: "EURUSD",
  accountId: "account-1",
  direction: "Buy",
  entry: 1.1,
  stopLoss: 1.09,
  takeProfit: 1.12,
  profit: 150,
  result: "Win",
  setupId: "setup-1",
  setup: "Breakout",
  session: null,
  emotion: null,
  notes: "",
  screenshots: [],
  screenshotAssets: [],
  createdAt: "2026-03-16T10:00:00.000Z",
  updatedAt: "2026-03-16T11:00:00.000Z",
};

function createDeferred() {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

function Harness({
  saveImpl,
  review,
}: {
  saveImpl: (review: Review) => Promise<void>;
  review?: Review | null;
}) {
  const [open, setOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  return open ? (
    <TradeReviewDialog
      open={open}
      onOpenChange={setOpen}
      trade={trade}
      review={review}
      isSaving={isSaving}
      onSave={async (nextReview) => {
        setIsSaving(true);

        try {
          await saveImpl(nextReview);
        } finally {
          setIsSaving(false);
        }
      }}
    />
  ) : (
    <div>Dialog Closed</div>
  );
}

describe("TradeReviewDialog", () => {
  it("closes only after a successful save", async () => {
    const deferred = createDeferred();
    const saveImpl = vi.fn().mockReturnValue(deferred.promise);

    render(<Harness saveImpl={saveImpl} />);

    fireEvent.click(screen.getByRole("button", { name: "Create Review" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
    });
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.queryByText("Dialog Closed")).not.toBeInTheDocument();

    deferred.resolve();

    await screen.findByText("Dialog Closed");
    expect(saveImpl).toHaveBeenCalledTimes(1);
  });

  it("keeps the dialog open and shows inline validation feedback on server failure", async () => {
    const saveImpl = vi.fn().mockRejectedValue(new ApiError("Execution rating must be between 1 and 5.", 422, "VALIDATION_ERROR"));

    render(<Harness saveImpl={saveImpl} />);

    fireEvent.click(screen.getByRole("button", { name: "Create Review" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Execution rating must be between 1 and 5.");
    expect(screen.queryByText("Dialog Closed")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Review" })).toBeEnabled();
  });

  it("keeps the dialog open and shows inline network feedback on network failure", async () => {
    const saveImpl = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    render(<Harness saveImpl={saveImpl} />);

    fireEvent.click(screen.getByRole("button", { name: "Create Review" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not reach the server. Please try again.");
    expect(screen.queryByText("Dialog Closed")).not.toBeInTheDocument();
  });

  it("allows retrying after a failed save and closes after recovery", async () => {
    const saveImpl = vi.fn()
      .mockRejectedValueOnce(new ApiError("Validation failed.", 422, "VALIDATION_ERROR"))
      .mockResolvedValueOnce(undefined);

    render(<Harness saveImpl={saveImpl} />);

    fireEvent.click(screen.getByRole("button", { name: "Create Review" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Validation failed.");

    fireEvent.click(screen.getByRole("button", { name: "Create Review" }));

    await screen.findByText("Dialog Closed");
    expect(saveImpl).toHaveBeenCalledTimes(2);
  });
});
