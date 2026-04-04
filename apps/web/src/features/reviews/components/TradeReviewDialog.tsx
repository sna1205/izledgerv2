import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FloatingActionPanel } from "@/components/ui/floating-action-panel";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TradeReviewSummary } from "@/features/reviews/components/TradeReviewSummary";
import { ApiError } from "@/services/api/client";
import { Review, Trade } from "@/types";

interface TradeReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trade: Trade;
  review?: Review | null;
  onSave: (review: Review) => Promise<void>;
  isSaving?: boolean;
}

const defaultForm = {
  executionRating: "3",
  disciplineRating: "3",
  emotionRating: "3",
  whatWentWell: "",
  whatWentWrong: "",
  mistakesMade: "",
  lessonLearned: "",
  improvementForNextTrade: "",
  wouldTakeAgain: "yes",
};

export function TradeReviewDialog({
  open,
  onOpenChange,
  trade,
  review,
  onSave,
  isSaving = false,
}: TradeReviewDialogProps) {
  const [form, setForm] = useState(defaultForm);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateForm = <K extends keyof typeof defaultForm>(key: K, value: (typeof defaultForm)[K]) => {
    setSubmitError(null);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const getSaveErrorMessage = (error: unknown) => {
    if (error instanceof TypeError) {
      return "Could not reach the server. Please try again.";
    }

    if (error instanceof ApiError) {
      return error.message;
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return "Could not save the trade review right now.";
  };

  useEffect(() => {
    if (!open) return;

    setSubmitError(null);

    if (review) {
      setForm({
        executionRating: String(review.executionRating || 3),
        disciplineRating: String(review.disciplineScore || 3),
        emotionRating: String(review.emotionRating || 3),
        whatWentWell: review.whatWentWell || "",
        whatWentWrong: review.whatWentWrong || "",
        mistakesMade: review.mistakesMade || "",
        lessonLearned: review.lessonLearned || "",
        improvementForNextTrade: review.improvementForNextTrade || "",
        wouldTakeAgain: review.wouldTakeAgain === false ? "no" : "yes",
      });
    } else {
      setForm(defaultForm);
    }
  }, [open, review, trade.id]);

  const handleSave = async () => {
    setSubmitError(null);

    const payload: Review = {
      id: review?.id || crypto.randomUUID(),
      type: "trade",
      reviewScope: "trade",
      tradeId: trade.id,
      tradeSnapshot: review?.tradeSnapshot ?? null,
      reviewDate: trade.date,
      weekStart: null,
      weekEnd: null,
      wentWell: null,
      mistakes: null,
      followedRules: null,
      emotion: null,
      executionRating: Number(form.executionRating),
      disciplineScore: Number(form.disciplineRating),
      emotionRating: Number(form.emotionRating),
      whatWentWell: form.whatWentWell.trim(),
      whatWentWrong: form.whatWentWrong.trim(),
      mistakesMade: form.mistakesMade.trim(),
      lessonLearned: form.lessonLearned.trim(),
      improvementPlan: null,
      weeklySummary: null,
      biggestWin: null,
      biggestMistake: null,
      riskManagement: null,
      nextGoal: null,
      weeklyRating: null,
      improvementForNextTrade: form.improvementForNextTrade.trim(),
      wouldTakeAgain: form.wouldTakeAgain === "yes",
      createdAt: review?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await onSave(payload);
      onOpenChange(false);
    } catch (error) {
      setSubmitError(getSaveErrorMessage(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (isSaving) {
        return;
      }

      onOpenChange(nextOpen);
    }}>
      <DialogContent className="max-h-[90svh] w-[calc(100vw-1rem)] max-w-3xl overflow-y-auto rounded-2xl p-4 sm:w-[calc(100vw-2rem)] sm:p-6">
        <DialogHeader>
          <DialogTitle>{review ? "Edit Trade Review" : "Review Trade"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {submitError ? (
            <Alert variant="destructive">
              <AlertTitle>Could not save review</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}

          <TradeReviewSummary trade={trade} />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Execution Rating</Label>
              <Select value={form.executionRating} onValueChange={(value) => updateForm("executionRating", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["1", "2", "3", "4", "5"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Discipline Rating</Label>
              <Select value={form.disciplineRating} onValueChange={(value) => updateForm("disciplineRating", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["1", "2", "3", "4", "5"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Emotion Control</Label>
              <Select value={form.emotionRating} onValueChange={(value) => updateForm("emotionRating", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["1", "2", "3", "4", "5"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {[
            ["What Went Well", "whatWentWell"],
            ["What Went Wrong", "whatWentWrong"],
            ["Mistakes Made", "mistakesMade"],
            ["Lesson Learned", "lessonLearned"],
            ["What To Improve Next Time", "improvementForNextTrade"],
          ].map(([label, key]) => (
            <div key={key} className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
              <Textarea
                rows={4}
                value={form[key as keyof typeof form] as string}
                onChange={(event) => updateForm(key as keyof typeof defaultForm, event.target.value)}
              />
            </div>
          ))}

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Would I Take This Again?</Label>
            <Select value={form.wouldTakeAgain} onValueChange={(value) => updateForm("wouldTakeAgain", value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 flex justify-end pb-1 pt-4">
          <FloatingActionPanel className="w-full sm:w-auto sm:min-w-[300px]">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button className="w-full sm:w-auto" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button className="w-full sm:w-auto" onClick={() => void handleSave()} disabled={isSaving}>
                {isSaving ? "Saving..." : review ? "Save Review" : "Create Review"}
              </Button>
            </div>
          </FloatingActionPanel>
        </div>
      </DialogContent>
    </Dialog>
  );
}
