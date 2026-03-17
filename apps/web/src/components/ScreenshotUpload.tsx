import { useCallback, useRef, useState } from "react";
import { CameraOff, Loader2, Upload, X } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  deleteTradeScreenshot,
  MAX_TRADE_SCREENSHOT_FILE_SIZE_BYTES,
  TRADE_SCREENSHOT_ACCEPT,
  uploadTradeScreenshot,
  validateTradeScreenshotFile,
} from "@/lib/api/screenshots";
import type { TradeScreenshotAsset } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ScreenshotUploadProps {
  tradeId?: string;
  screenshots: TradeScreenshotAsset[];
  onChange: (screenshots: TradeScreenshotAsset[]) => void;
  maxFiles?: number;
}

export function ScreenshotUpload({ tradeId, screenshots, onChange, maxFiles = 3 }: ScreenshotUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadsDisabled = !tradeId || isUploading;

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || !tradeId) {
      return;
    }

    const remaining = Math.max(maxFiles - screenshots.length, 0);
    const toProcess = Array.from(files).slice(0, remaining);

    if (toProcess.length === 0) {
      setFeedback("Screenshot limit reached.");
      toast.error("Screenshot limit reached.");
      return;
    }

    const validFiles: File[] = [];
    let validationMessage: string | null = null;

    for (const file of toProcess) {
      try {
        validateTradeScreenshotFile(file);
        validFiles.push(file);
      } catch (error) {
        const message = error instanceof Error ? error.message : "This screenshot file is not supported.";

        if (!validationMessage) {
          validationMessage = message;
        }
      }
    }

    if (validationMessage) {
      setFeedback(validationMessage);
      toast.error(validationMessage);
    } else {
      setFeedback(null);
    }

    if (validFiles.length === 0) {
      return;
    }

    setIsUploading(true);

    try {
      let nextScreenshots = [...screenshots];

      for (const file of validFiles) {
        const screenshot = await uploadTradeScreenshot({
          tradeId,
          file,
          sortOrder: nextScreenshots.length,
        });

        nextScreenshots = [...nextScreenshots, screenshot];
        onChange(nextScreenshots);
      }

      setFeedback(validationMessage);
      toast.success(validFiles.length === 1 ? "Screenshot uploaded." : "Screenshots uploaded.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Screenshot upload failed.";
      setFeedback(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  }, [maxFiles, onChange, screenshots, tradeId]);

  const handlePaste = useCallback(async (event: React.ClipboardEvent) => {
    if (!tradeId) {
      return;
    }

    const files = Array.from(event.clipboardData.items)
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));

    if (files.length === 0) {
      return;
    }

    const transfer = new DataTransfer();
    files.forEach((file) => transfer.items.add(file));
    await handleFiles(transfer.files);
  }, [handleFiles, tradeId]);

  const removeScreenshot = useCallback(async (screenshot: TradeScreenshotAsset) => {
    if (!tradeId) {
      return;
    }

    setDeletingId(screenshot.id);
    setFeedback(null);

    try {
      await deleteTradeScreenshot(tradeId, screenshot.id);
      onChange(screenshots.filter((item) => item.id !== screenshot.id));
      toast.success("Screenshot removed.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not remove the screenshot.";
      setFeedback(message);
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }, [onChange, screenshots, tradeId]);

  return (
    <div className="space-y-3" onPaste={(event) => void handlePaste(event)}>
      {!tradeId ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Save the trade first, then reopen it to upload screenshots securely.
        </div>
      ) : null}

      {screenshots.length < maxFiles ? (
        <div
          className={cn(
            "rounded-lg border-2 border-dashed p-8 text-center transition-colors",
            uploadsDisabled ? "cursor-not-allowed opacity-70" : "cursor-pointer",
            dragOver ? "border-foreground bg-accent" : "border-border hover:border-muted-foreground",
          )}
          onDragOver={(event) => {
            event.preventDefault();
            if (!uploadsDisabled) {
              setDragOver(true);
            }
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            if (!uploadsDisabled) {
              void handleFiles(event.dataTransfer.files);
            }
          }}
          onClick={() => {
            if (!uploadsDisabled) {
              inputRef.current?.click();
            }
          }}
        >
          {isUploading ? <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-muted-foreground" /> : <Upload className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />}
          <p className="text-sm text-muted-foreground">
            {isUploading ? "Uploading screenshot..." : "Drop, paste, or click to upload"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {screenshots.length}/{maxFiles} screenshots
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            PNG, JPEG, or WebP up to {Math.round(MAX_TRADE_SCREENSHOT_FILE_SIZE_BYTES / (1024 * 1024))} MB
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={TRADE_SCREENSHOT_ACCEPT}
            multiple
            className="hidden"
            onChange={(event) => {
              void handleFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>
      ) : null}

      {feedback ? (
        <p role="alert" className="text-sm text-destructive">
          {feedback}
        </p>
      ) : null}

      {screenshots.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {screenshots.map((screenshot, index) => (
            <div key={screenshot.id} className="group relative overflow-hidden rounded-lg border">
              <img src={screenshot.url} alt={`Screenshot ${index + 1}`} className="h-32 w-full object-cover" />
              <button
                type="button"
                onClick={() => void removeScreenshot(screenshot)}
                disabled={deletingId === screenshot.id}
                className="absolute right-1 top-1 rounded bg-foreground/80 p-1 text-background opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-100"
              >
                {deletingId === screenshot.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CameraOff className="h-3 w-3" />
          <span>No screenshots uploaded</span>
        </div>
      )}
    </div>
  );
}
