import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CameraOff, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import {
  deleteTradeScreenshot,
  MAX_TRADE_SCREENSHOT_FILE_SIZE_BYTES,
  readTradeScreenshotClipboardFiles,
  TRADE_SCREENSHOT_ACCEPT,
  uploadTradeScreenshot,
  validateTradeScreenshotFile,
} from "@/services/api/screenshots";
import type { TradeScreenshotAsset } from "@/types";
import { cn } from "@/utils/class-names";

interface ScreenshotUploadProps {
  tradeId?: string;
  screenshots: TradeScreenshotAsset[];
  onChange: (screenshots: TradeScreenshotAsset[]) => void;
  draftFiles?: File[];
  onDraftFilesChange?: (files: File[]) => void;
  maxFiles?: number;
}

export function ScreenshotUpload({
  tradeId,
  screenshots,
  onChange,
  draftFiles = [],
  onDraftFilesChange,
  maxFiles = 3,
}: ScreenshotUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isReadingClipboard, setIsReadingClipboard] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadsEnabled = Boolean(tradeId || onDraftFilesChange);
  const uploadsDisabled = !uploadsEnabled || isUploading || isReadingClipboard;
  const totalCount = screenshots.length + draftFiles.length;
  const draftPreviews = useMemo(
    () => draftFiles.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
    [draftFiles],
  );

  useEffect(() => () => {
    draftPreviews.forEach((draft) => URL.revokeObjectURL(draft.previewUrl));
  }, [draftPreviews]);

  const handleFiles = useCallback(async (files: FileList | File[] | null) => {
    if (!files || !uploadsEnabled) {
      return;
    }

    const incomingFiles = Array.from(files);
    const remaining = Math.max(maxFiles - totalCount, 0);
    const toProcess = incomingFiles.slice(0, remaining);

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

    if (!tradeId) {
      onDraftFilesChange?.([...draftFiles, ...validFiles]);
      setFeedback(validationMessage);
      toast.success(validFiles.length === 1 ? "Screenshot queued for upload." : "Screenshots queued for upload.");
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
  }, [draftFiles, maxFiles, onChange, onDraftFilesChange, screenshots, totalCount, tradeId, uploadsEnabled]);

  useEffect(() => {
    if (!uploadsEnabled) {
      return;
    }

    const handleWindowPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.items ?? [])
        .filter((item) => item.type.startsWith("image/"))
        .map((item) => item.getAsFile())
        .filter((file): file is File => Boolean(file));

      if (files.length === 0) {
        return;
      }

      event.preventDefault();
      void handleFiles(files);
    };

    window.addEventListener("paste", handleWindowPaste);

    return () => {
      window.removeEventListener("paste", handleWindowPaste);
    };
  }, [handleFiles, uploadsEnabled]);

  const handlePasteButtonClick = useCallback(async () => {
    if (!uploadsEnabled || isUploading || isReadingClipboard) {
      return;
    }

    setIsReadingClipboard(true);

    try {
      const files = await readTradeScreenshotClipboardFiles();
      await handleFiles(files);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not read an image from your clipboard.";
      setFeedback(message);
      toast.error(message);
    } finally {
      setIsReadingClipboard(false);
    }
  }, [handleFiles, isReadingClipboard, isUploading, uploadsEnabled]);

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

  const removeDraftScreenshot = useCallback((index: number) => {
    if (!onDraftFilesChange) {
      return;
    }

    onDraftFilesChange(draftFiles.filter((_file, draftIndex) => draftIndex !== index));
    setFeedback(null);
  }, [draftFiles, onDraftFilesChange]);

  return (
    <div className="space-y-3" aria-busy={isUploading || isReadingClipboard}>
      {!tradeId ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Screenshots added here will upload right after the trade is saved.
        </div>
      ) : draftFiles.length > 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Queued screenshots are waiting to retry. Update the trade again after fixing the upload issue.
        </div>
      ) : null}

      {totalCount < maxFiles ? (
        <div className="space-y-3">
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
            {isUploading || isReadingClipboard ? (
              <div className="mx-auto mb-3 flex flex-col items-center gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-3 w-28 rounded-full" />
              </div>
            ) : (
              <Upload className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
            )}
            <p className="text-sm text-muted-foreground">
              {isUploading ? "Uploading screenshot..." : isReadingClipboard ? "Reading screenshot from clipboard..." : tradeId ? "Drop, paste, or click to upload" : "Drop, paste, or click to queue"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {totalCount}/{maxFiles} screenshots
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

          <div className="flex justify-center">
            <Button type="button" variant="outline" size="sm" onClick={() => void handlePasteButtonClick()} disabled={uploadsDisabled}>
              {isReadingClipboard ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Paste Screenshot
            </Button>
          </div>
        </div>
      ) : null}

      {feedback ? (
        <p role="alert" className="text-sm text-destructive">
          {feedback}
        </p>
      ) : null}

      {totalCount > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {screenshots.map((screenshot, index) => (
            <div key={screenshot.id} className="group relative overflow-hidden rounded-lg border">
              <img src={screenshot.url} alt={`Screenshot ${index + 1}`} className="h-32 w-full object-cover" />
              <button
                type="button"
                onClick={() => void removeScreenshot(screenshot)}
                disabled={deletingId === screenshot.id}
                aria-label={`Remove screenshot ${index + 1}`}
                className="absolute right-1 top-1 rounded bg-foreground/80 p-1 text-background opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-100"
              >
                {deletingId === screenshot.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
              </button>
            </div>
          ))}
          {draftPreviews.map((draft, index) => (
            <div key={`${draft.file.name}-${draft.file.lastModified}-${index}`} className="group relative overflow-hidden rounded-lg border border-dashed">
              <img src={draft.previewUrl} alt={`Queued screenshot ${screenshots.length + index + 1}`} className="h-32 w-full object-cover opacity-90" />
              <div className="absolute inset-x-0 bottom-0 bg-background/85 px-2 py-1 text-[11px] text-muted-foreground">
                {tradeId ? "Retry on update" : "Queued until save"}
              </div>
              <button
                type="button"
                onClick={() => removeDraftScreenshot(index)}
                aria-label={`Remove queued screenshot ${screenshots.length + index + 1}`}
                className="absolute right-1 top-1 rounded bg-foreground/80 p-1 text-background opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
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
