import { CheckCircle2, CircleOff, ClipboardCheck } from "lucide-react";
import { DataBadge } from "@/components/DataBadge";
import type { TradeChecklistResponse } from "@/types";

export function TradeChecklistResults({
  responses,
}: {
  responses: TradeChecklistResponse[];
}) {
  const completedCount = responses.filter((response) => response.checked).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-background/80 text-muted-foreground">
            <ClipboardCheck className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-medium text-foreground">Pre-Trade Checklist</h3>
            <p className="mt-1 text-xs text-muted-foreground">Snapshot captured when this trade was logged.</p>
          </div>
        </div>

        <DataBadge tone={completedCount === responses.length ? "success" : "neutral"}>
          {completedCount}
          {" "}
          of
          {" "}
          {responses.length}
          {" "}
          completed
        </DataBadge>
      </div>

      {responses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-6 text-center">
          <p className="text-sm font-medium text-foreground">No checklist snapshot was saved for this trade.</p>
          <p className="mt-1 text-xs text-muted-foreground">Older trades can exist without pre-trade checklist evidence.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {responses.map((response) => (
            <div
              key={response.id}
              className={`rounded-2xl border px-4 py-4 ${
                response.checked
                  ? "border-success/20 bg-success/5"
                  : "border-border/70 bg-background/70"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl ${
                  response.checked
                    ? "bg-success/10 text-success"
                    : "bg-muted text-muted-foreground"
                }`}
                >
                  {response.checked ? <CheckCircle2 className="h-4 w-4" /> : <CircleOff className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{response.ruleTitleSnapshot}</span>
                    {response.isRequiredSnapshot ? <DataBadge tone="warning">Required</DataBadge> : <DataBadge tone="neutral">Optional</DataBadge>}
                    <DataBadge tone={response.checked ? "success" : "neutral"}>
                      {response.checked ? "Completed" : "Skipped"}
                    </DataBadge>
                  </div>
                  {response.ruleDescriptionSnapshot ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{response.ruleDescriptionSnapshot}</p> : null}
                  {response.note ? <p className="mt-3 text-xs leading-5 text-foreground/80">{response.note}</p> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
