import { ClipboardList, FileText, Target } from "lucide-react";
import { cn } from "@/utils/class-names";

export type SetupBuilderStepId = "strategy" | "pre-trade" | "review";

const STEP_CONFIG: Array<{
  id: SetupBuilderStepId;
  label: string;
  icon: typeof Target;
}> = [
  {
    id: "strategy",
    label: "Strategy",
    icon: Target,
  },
  {
    id: "pre-trade",
    label: "Pre-trade Checklist",
    icon: ClipboardList,
  },
  {
    id: "review",
    label: "Review",
    icon: FileText,
  },
];

export function SetupBuilderSidebar({
  activeStep,
  onStepChange,
  saveStateLabel,
}: {
  activeStep: SetupBuilderStepId;
  onStepChange: (step: SetupBuilderStepId) => void;
  saveStateLabel: string;
}) {
  return (
    <aside className="space-y-3 lg:sticky lg:top-6">
      <div className="rounded-[28px] border border-border bg-card/90 p-3 shadow-sm sm:p-4">
        <div className="mt-4 space-y-2">
          {STEP_CONFIG.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.id === activeStep;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onStepChange(step.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[22px] border px-3 py-3 text-left transition-colors",
                  isActive
                    ? "border-primary/30 bg-primary/8"
                    : "border-border/60 bg-background/60 hover:border-border hover:bg-background",
                )}
              >
                <div className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-2xl border",
                  isActive ? "border-primary/30 bg-primary/10 text-primary" : "border-border/70 bg-background/80 text-muted-foreground",
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{step.label}</p>
                </div>
                <span className="text-xs text-muted-foreground">{index + 1}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[28px] border border-border bg-card/90 px-4 py-3 shadow-sm">
        <p className="text-sm font-medium text-foreground">{saveStateLabel}</p>
      </div>
    </aside>
  );
}
