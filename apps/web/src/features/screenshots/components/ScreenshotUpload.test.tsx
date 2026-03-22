import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScreenshotUpload } from "@/features/screenshots/components/ScreenshotUpload";
import { MAX_TRADE_SCREENSHOT_FILE_SIZE_BYTES, ScreenshotUploadError } from "@/services/api/screenshots";

const screenshotMocks = vi.hoisted(() => ({
  uploadTradeScreenshot: vi.fn(),
  deleteTradeScreenshot: vi.fn(),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/services/api/screenshots", async () => {
  const actual = await vi.importActual<typeof import("@/services/api/screenshots")>("@/services/api/screenshots");

  return {
    ...actual,
    uploadTradeScreenshot: screenshotMocks.uploadTradeScreenshot,
    deleteTradeScreenshot: screenshotMocks.deleteTradeScreenshot,
  };
});

vi.mock("@/components/ui/sonner", () => ({
  toast: screenshotMocks.toast,
  Toaster: () => null,
}));

function createImageFile(name: string, type = "image/png", size = 1024) {
  const file = new File(["image"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("ScreenshotUpload", () => {
  beforeEach(() => {
    screenshotMocks.uploadTradeScreenshot.mockReset();
    screenshotMocks.deleteTradeScreenshot.mockReset();
    screenshotMocks.toast.success.mockReset();
    screenshotMocks.toast.error.mockReset();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:preview"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uploads a valid screenshot and updates the local screenshot list", async () => {
    const onChange = vi.fn();
    const screenshot = {
      id: "shot-1",
      url: "https://example.com/shot-1.png",
      storageKey: "screenshots/shot-1.png",
      sortOrder: 0,
      createdAt: "2026-03-17T10:00:00.000Z",
    };

    screenshotMocks.uploadTradeScreenshot.mockResolvedValue(screenshot);

    const { container } = render(
      <ScreenshotUpload tradeId="trade-1" screenshots={[]} onChange={onChange} />,
    );

    const input = container.querySelector('input[type="file"]');

    expect(input).not.toBeNull();

    fireEvent.change(input as HTMLInputElement, {
      target: {
        files: [createImageFile("chart.png")],
      },
    });

    await waitFor(() => {
      expect(screenshotMocks.uploadTradeScreenshot).toHaveBeenCalledWith({
        tradeId: "trade-1",
        file: expect.any(File),
        sortOrder: 0,
      });
    });

    expect(onChange).toHaveBeenCalledWith([screenshot]);
    expect(screenshotMocks.toast.success).toHaveBeenCalledWith("Screenshot uploaded.");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("rejects unsupported file types before requesting a presign", async () => {
    const { container } = render(
      <ScreenshotUpload tradeId="trade-1" screenshots={[]} onChange={vi.fn()} />,
    );

    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: {
        files: [createImageFile("chart.gif", "image/gif")],
      },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("Use a PNG, JPEG, or WebP image.");
    expect(screenshotMocks.uploadTradeScreenshot).not.toHaveBeenCalled();
    expect(screenshotMocks.toast.error).toHaveBeenCalledWith("Use a PNG, JPEG, or WebP image.");
  });

  it("rejects oversized files before requesting a presign", async () => {
    const { container } = render(
      <ScreenshotUpload tradeId="trade-1" screenshots={[]} onChange={vi.fn()} />,
    );

    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: {
        files: [createImageFile("chart.png", "image/png", MAX_TRADE_SCREENSHOT_FILE_SIZE_BYTES + 1)],
      },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("Screenshots must be 10 MB or smaller.");
    expect(screenshotMocks.uploadTradeScreenshot).not.toHaveBeenCalled();
    expect(screenshotMocks.toast.error).toHaveBeenCalledWith("Screenshots must be 10 MB or smaller.");
  });

  it("shows a safe presign failure message and keeps the uploader open", async () => {
    const { container } = render(
      <ScreenshotUpload tradeId="trade-1" screenshots={[]} onChange={vi.fn()} />,
    );

    screenshotMocks.uploadTradeScreenshot.mockRejectedValue(
      new ScreenshotUploadError("presign", "Could not start the screenshot upload. Please try again.", "INTERNAL_SERVER_ERROR"),
    );

    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: {
        files: [createImageFile("chart.png")],
      },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not start the screenshot upload. Please try again.");
    expect(screenshotMocks.toast.error).toHaveBeenCalledWith("Could not start the screenshot upload. Please try again.");
    expect(screen.getByText("Drop, paste, or click to upload")).toBeInTheDocument();
  });

  it("shows a safe upload failure message", async () => {
    const { container } = render(
      <ScreenshotUpload tradeId="trade-1" screenshots={[]} onChange={vi.fn()} />,
    );

    screenshotMocks.uploadTradeScreenshot.mockRejectedValue(
      new ScreenshotUploadError("upload", "The screenshot file could not be uploaded. Please try again.", "UPLOAD_FAILED"),
    );

    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: {
        files: [createImageFile("chart.png")],
      },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("The screenshot file could not be uploaded. Please try again.");
    expect(screenshotMocks.toast.error).toHaveBeenCalledWith("The screenshot file could not be uploaded. Please try again.");
  });

  it("shows a safe completion failure message", async () => {
    const { container } = render(
      <ScreenshotUpload tradeId="trade-1" screenshots={[]} onChange={vi.fn()} />,
    );

    screenshotMocks.uploadTradeScreenshot.mockRejectedValue(
      new ScreenshotUploadError("complete", "The screenshot uploaded, but we could not attach it to this trade. Please try again.", "INVALID_UPLOAD_TOKEN"),
    );

    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: {
        files: [createImageFile("chart.png")],
      },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("The screenshot uploaded, but we could not attach it to this trade. Please try again.");
    expect(screenshotMocks.toast.error).toHaveBeenCalledWith("The screenshot uploaded, but we could not attach it to this trade. Please try again.");
  });

  it("deletes a screenshot and updates the local list", async () => {
    const onChange = vi.fn();
    const screenshots = [
      {
        id: "shot-1",
        url: "https://example.com/shot-1.png",
        storageKey: "screenshots/shot-1.png",
        sortOrder: 0,
        createdAt: "2026-03-17T10:00:00.000Z",
      },
    ];

    screenshotMocks.deleteTradeScreenshot.mockResolvedValue(undefined);

    render(
      <ScreenshotUpload tradeId="trade-1" screenshots={screenshots} onChange={onChange} />,
    );

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screenshotMocks.deleteTradeScreenshot).toHaveBeenCalledWith("trade-1", "shot-1");
    });

    expect(onChange).toHaveBeenCalledWith([]);
    expect(screenshotMocks.toast.success).toHaveBeenCalledWith("Screenshot removed.");
  });

  it("queues draft screenshots when the trade has not been saved yet", async () => {
    function Harness() {
      const [draftFiles, setDraftFiles] = React.useState<File[]>([]);

      return (
        <ScreenshotUpload
          screenshots={[]}
          draftFiles={draftFiles}
          onDraftFilesChange={setDraftFiles}
          onChange={vi.fn()}
        />
      );
    }

    const { container } = render(<Harness />);

    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: {
        files: [createImageFile("chart.png")],
      },
    });

    expect(screenshotMocks.uploadTradeScreenshot).not.toHaveBeenCalled();
    expect(await screen.findByText("Queued until save")).toBeInTheDocument();
    expect(screenshotMocks.toast.success).toHaveBeenCalledWith("Screenshot queued for upload.");
  });
});
