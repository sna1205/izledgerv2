import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toBlob } from "html-to-image";
import { CalendarClock, Copy, Download, Eye, Link2, Loader2, RefreshCw, ShieldOff } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { ShareTradeCard } from "@/features/trade-sharing/components/ShareTradeCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError } from "@/services/api/client";
import { createTradeShare, getTradeShares, revokeTradeShare } from "@/services/api/trade-shares";
import {
  DEFAULT_TRADE_SHARE_SETTINGS,
  TradeShareRecord,
  TradeShareSettings,
  buildSharedTradeView,
  buildTradeShareFileName,
  formatSharedTradeDateTime,
  getTradeShareStatusLabel,
} from "@/utils/trade-sharing";
import { Trade } from "@/types";
import { cn } from "@/utils/class-names";

const privacyOptions: Array<{
  key: keyof TradeShareSettings;
  label: string;
  description: string;
}> = [
  {
    key: "showPnl",
    label: "Show PnL",
    description: "Include the trade outcome amount on shared links and exports.",
  },
  {
    key: "showAccountName",
    label: "Show account name",
    description: "Include the account label without exposing the rest of the account dashboard.",
  },
  {
    key: "showNotes",
    label: "Show notes",
    description: "Include the journal write-up for mentors, review partners, or communities.",
  },
  {
    key: "showScreenshots",
    label: "Show screenshots",
    description: "Include trade chart images in the public page and export card.",
  },
  {
    key: "showExactPrices",
    label: "Show exact prices",
    description: "Expose entry, stop loss, and take profit values instead of hiding price levels.",
  },
];

function toDateTimeInputValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function toExpiresAtPayload(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export function ShareTradeModal({
  open,
  onOpenChange,
  trade,
  accountName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trade: Trade;
  accountName?: string;
}) {
  const [settings, setSettings] = useState<TradeShareSettings>(DEFAULT_TRADE_SHARE_SETTINGS);
  const [activeTab, setActiveTab] = useState("public-link");
  const [shareHistory, setShareHistory] = useState<TradeShareRecord[]>([]);
  const [isLoadingShare, setIsLoadingShare] = useState(false);
  const [isSavingShare, setIsSavingShare] = useState(false);
  const [isRevokingShare, setIsRevokingShare] = useState(false);
  const [imageAction, setImageAction] = useState<"download" | "copy" | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [expiresAtInput, setExpiresAtInput] = useState("");
  const exportCardRef = useRef<HTMLDivElement | null>(null);
  const canCopyImage =
    typeof window !== "undefined" &&
    "ClipboardItem" in window &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.clipboard?.write);

  const previewTrade = useMemo(
    () => buildSharedTradeView({ trade, settings, accountName }),
    [accountName, settings, trade],
  );
  const shareRecord = shareHistory[0] ?? null;

  const loadShareHistory = useCallback(async () => {
    setIsLoadingShare(true);
    setLinkError(null);

    try {
      const response = await getTradeShares(trade.id);

      setShareHistory(response.items);

      const existingShare = response.items[0] ?? null;

      if (existingShare) {
        setSettings(existingShare.settings);
        setExpiresAtInput(toDateTimeInputValue(existingShare.expiresAt));
      } else {
        setSettings(DEFAULT_TRADE_SHARE_SETTINGS);
        setExpiresAtInput("");
      }
    } catch (error) {
      const message =
        error instanceof ApiError
          ? "Public link status could not be loaded right now."
          : "Public link status could not be loaded in this session.";
      setLinkError(message);
      setShareHistory([]);
    } finally {
      setIsLoadingShare(false);
    }
  }, [trade.id]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setActiveTab("public-link");
    void loadShareHistory();
  }, [loadShareHistory, open]);

  async function handleGenerateLink() {
    setIsSavingShare(true);
    setLinkError(null);

    try {
      const response = await createTradeShare(trade.id, {
        settings,
        expiresAt: toExpiresAtPayload(expiresAtInput),
      });
      setShareHistory([response.share]);
      setSettings(response.share.settings);
      setExpiresAtInput(toDateTimeInputValue(response.share.expiresAt));
      await loadShareHistory();
      toast.success(response.share.publicUrl ? "Public trade link is ready." : "Share settings saved.");
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.code === "INVALID_SHARE_EXPIRATION"
            ? "Choose a future expiration time for this shared link."
            : "Could not create a public trade link right now."
          : "Could not create a public trade link right now.";
      setLinkError(message);
      toast.error(message);
    } finally {
      setIsSavingShare(false);
    }
  }

  async function handleCopyLink() {
    if (!shareRecord?.publicUrl) {
      toast.error("Generate a public link first.");
      return;
    }

    try {
      await navigator.clipboard.writeText(shareRecord.publicUrl);
      toast.success("Public link copied.");
    } catch {
      toast.error("Clipboard access is unavailable in this browser.");
    }
  }

  async function handleRevokeLink() {
    if (!shareRecord?.shareId) {
      return;
    }

    setIsRevokingShare(true);
    setLinkError(null);

    try {
      const response = await revokeTradeShare(shareRecord.shareId);
      setShareHistory([response.share]);
      await loadShareHistory();
      toast.success("Shared link revoked.");
    } catch (error) {
      const message =
        error instanceof ApiError
          ? "Could not revoke the share link right now."
          : "Could not revoke the share link right now.";
      setLinkError(message);
      toast.error(message);
    } finally {
      setIsRevokingShare(false);
    }
  }

  async function generateTradeShareBlob() {
    if (!exportCardRef.current) {
      throw new Error("Share card ref is missing.");
    }

    const blob = await toBlob(exportCardRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      canvasWidth: 1080,
    });

    if (!blob) {
      throw new Error("Image blob generation failed.");
    }

    return blob;
  }

  async function handleDownloadImage() {
    if (imageAction) {
      return;
    }

    setImageAction("download");

    try {
      const blob = await generateTradeShareBlob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = buildTradeShareFileName(previewTrade);
      link.click();
      URL.revokeObjectURL(objectUrl);
      toast.success("Image downloaded");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Image export failed. Please try Download Image again.";
      toast.error(message);
    } finally {
      setImageAction(null);
    }
  }

  async function handleCopyImage() {
    if (imageAction) {
      return;
    }

    if (!canCopyImage) {
      toast.error("Copy image is not supported in this browser. Please use Download Image instead.");
      return;
    }

    setImageAction("copy");

    try {
      const blob = await generateTradeShareBlob();
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob,
        }),
      ]);
      toast.success("Image copied to clipboard");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message.toLowerCase().includes("permission")
            ? "Clipboard permission denied. Please use Download Image instead."
            : error.message
          : "Copy image failed. Please use Download Image instead.";
      toast.error(message);
    } finally {
      setImageAction(null);
    }
  }

  function updateSetting(key: keyof TradeShareSettings, checked: boolean) {
    setSettings((current) => ({
      ...current,
      [key]: checked,
    }));
  }

  const shareStatusTone =
    shareRecord?.status === "active"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
      : "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200";
  const shareHistoryDescription = shareHistory.length
    ? "This trade keeps one reusable public link, so this timeline shows its latest lifecycle state."
    : "No public link has been created for this trade yet.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto rounded-[28px] border-border/70 p-0">
        <div className="grid gap-0 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="border-b border-border/70 bg-muted/35 p-6 lg:border-b-0 lg:border-r">
            <DialogHeader className="text-left">
              <DialogTitle>Share Trade</DialogTitle>
              <DialogDescription>
                Create a public snapshot or export card without exposing the rest of the journal.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-3">
              {privacyOptions.map((option) => (
                <label
                  key={option.key}
                  className="flex items-start justify-between gap-4 rounded-2xl border bg-background/85 p-4 shadow-sm"
                >
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-foreground">{option.label}</Label>
                    <p className="text-xs leading-5 text-muted-foreground">{option.description}</p>
                  </div>
                  <Switch
                    checked={settings[option.key]}
                    onCheckedChange={(checked) => updateSetting(option.key, checked)}
                    aria-label={option.label}
                  />
                </label>
              ))}

              <div className="rounded-2xl border bg-background/85 p-4 shadow-sm">
                <Label htmlFor="share-expiration" className="text-sm font-medium text-foreground">
                  Link expiration
                </Label>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Leave blank to keep the link active until you revoke it.
                </p>
                <input
                  id="share-expiration"
                  type="datetime-local"
                  value={expiresAtInput}
                  onChange={(event) => setExpiresAtInput(event.target.value)}
                  className="mt-3 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          </aside>

          <section className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-muted/60 p-1">
                <TabsTrigger value="public-link" className="rounded-xl">Public Link</TabsTrigger>
                <TabsTrigger value="image-export" className="rounded-xl">Image Export</TabsTrigger>
              </TabsList>

              <TabsContent value="public-link" className="space-y-4">
                <div className="rounded-[26px] border bg-card p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Public share status</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        The link shows the saved snapshot, not the live trade.
                      </p>
                    </div>
                    <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-medium", shareStatusTone)}>
                      {shareRecord ? getTradeShareStatusLabel(shareRecord.status) : "Not shared"}
                    </span>
                  </div>

                  <div className="mt-4 rounded-2xl border bg-background/70 p-4">
                    {isLoadingShare ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading current share state...
                      </div>
                    ) : shareRecord?.publicUrl ? (
                      <div className="space-y-3">
                        <div className="rounded-xl border bg-card/80 px-4 py-3">
                          <p className="truncate text-sm text-foreground">{shareRecord.publicUrl}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <span>{shareRecord.viewCount} public views</span>
                          <span>Updated {formatSharedTradeDateTime(shareRecord.updatedAt)}</span>
                          {shareRecord.expiresAt ? <span>Expires {formatSharedTradeDateTime(shareRecord.expiresAt)}</span> : <span>No expiration</span>}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3 text-sm text-muted-foreground">
                        <ShieldOff className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>No public link yet.</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 rounded-2xl border bg-background/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Owner share history</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {shareHistoryDescription}
                      </p>
                    </div>
                    <span className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
                      {shareHistory.length ? `${shareHistory.length} record` : "No records"}
                    </span>
                  </div>

                  {shareRecord ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border bg-card/80 p-4">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Status</p>
                        <p className="mt-2 text-sm font-semibold text-foreground">{getTradeShareStatusLabel(shareRecord.status)}</p>
                      </div>
                      <div className="rounded-xl border bg-card/80 p-4">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Created</p>
                        <p className="mt-2 text-sm font-semibold text-foreground">{formatSharedTradeDateTime(shareRecord.createdAt)}</p>
                      </div>
                      <div className="rounded-xl border bg-card/80 p-4">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Expires</p>
                        <p className="mt-2 text-sm font-semibold text-foreground">
                          {shareRecord.expiresAt ? formatSharedTradeDateTime(shareRecord.expiresAt) : "Never"}
                        </p>
                      </div>
                      <div className="rounded-xl border bg-card/80 p-4">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Public views</p>
                        <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          {shareRecord.viewCount}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 flex items-start gap-3 rounded-xl border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
                      <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>Generate a link to start tracking views and expiration.</p>
                    </div>
                  )}
                </div>

                  {linkError ? (
                    <p className="mt-3 text-sm text-destructive">{linkError}</p>
                  ) : null}

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button onClick={handleGenerateLink} disabled={isSavingShare}>
                      {isSavingShare ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
                      {shareRecord?.status === "active" ? "Update link" : "Generate link"}
                    </Button>
                    <Button variant="outline" onClick={handleCopyLink} disabled={!shareRecord?.publicUrl}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy link
                    </Button>
                    <Button
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={handleRevokeLink}
                      disabled={!shareRecord || shareRecord.status !== "active" || isRevokingShare}
                    >
                      {isRevokingShare ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                      Revoke link
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="image-export" className="space-y-4">
                <div className="rounded-[26px] border bg-card p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Export preview</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Download as PNG or copy to clipboard.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button onClick={handleDownloadImage} disabled={imageAction !== null}>
                        {imageAction === "download" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Download Image
                      </Button>
                      <Button variant="outline" onClick={handleCopyImage} disabled={!canCopyImage || imageAction !== null}>
                        {imageAction === "copy" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                        Copy Image
                      </Button>
                    </div>
                  </div>

                  {!canCopyImage ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Copy image is not supported in this browser. Use Download Image instead.
                    </p>
                  ) : null}

                  {imageAction ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      {imageAction === "download" ? "Generating image for download..." : "Generating image for clipboard copy..."}
                    </p>
                  ) : null}

                  <div className="mt-5 rounded-[28px] border bg-slate-950/[0.035] p-3 dark:bg-white/[0.035]">
                    <ShareTradeCard trade={previewTrade} />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="pointer-events-none absolute -left-[9999px] top-0 opacity-0" aria-hidden="true">
              <div ref={exportCardRef} className="w-[1080px]">
                <ShareTradeCard trade={previewTrade} />
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
