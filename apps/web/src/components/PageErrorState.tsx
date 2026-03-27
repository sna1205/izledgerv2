import { Loader2, RefreshCw } from "lucide-react";
import { PageShell } from "@/layouts/PageShell";
import { Button } from "@/components/ui/button";

type PageErrorAction = {
  label: string;
  onClick: () => void;
};

export function PageErrorState({
  title,
  description,
  onRetry,
  isRetrying = false,
  secondaryAction,
  layout = "inline",
  size = "default",
}: {
  title: string;
  description: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  secondaryAction?: PageErrorAction;
  layout?: "inline" | "page";
  size?: "default" | "wide";
}) {
  const content = (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-3xl rounded-2xl border bg-card p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>

        {onRetry || secondaryAction ? (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {onRetry ? (
              <Button onClick={onRetry} disabled={isRetrying}>
                {isRetrying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Try again
              </Button>
            ) : null}
            {secondaryAction ? (
              <Button variant="outline" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );

  if (layout === "page") {
    return (
      <PageShell size={size}>
        <div className="min-h-[calc(100vh-11rem)]">{content}</div>
      </PageShell>
    );
  }

  return content;
}
