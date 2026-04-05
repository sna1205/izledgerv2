import { Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/utils/class-names";

export type SetupWizardStepId = "basic" | "rules" | "checklist" | "review";

export type SetupWizardStep = {
  id: SetupWizardStepId;
  label: string;
};

export function SetupWizardStepper({
  steps,
  activeStep,
  onStepChange,
}: {
  steps: SetupWizardStep[];
  activeStep: SetupWizardStepId;
  onStepChange: (step: SetupWizardStepId) => void;
}) {
  const activeIndex = steps.findIndex((step) => step.id === activeStep);
  const progressValue = ((activeIndex + 1) / steps.length) * 100;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Step {activeIndex + 1} of {steps.length}
        </p>
      </div>

      <Progress value={progressValue} className="h-1 rounded-full bg-muted/60" />

      <div className="grid gap-1 md:grid-cols-4">
        {steps.map((step, index) => {
          const isActive = step.id === activeStep;
          const isComplete = index < activeIndex;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onStepChange(step.id)}
              className={cn(
                "rounded-xl px-3 py-2 text-left transition-all",
                isActive
                  ? "bg-accent/60"
                  : "hover:bg-foreground/[0.03]",
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                    isComplete
                      ? "bg-foreground text-background"
                      : isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <p className="min-w-0 text-sm font-medium text-foreground">{step.label}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
