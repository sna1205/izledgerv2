import { Loader2, RefreshCw } from "lucide-react";
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
}: {
  title: string;
  description: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  secondaryAction?: PageErrorAction;
}) {
  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-3xl rounded-2xl border bg-card p-8 text-center">
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
}
