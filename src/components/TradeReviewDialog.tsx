import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TradeReviewSummary } from "@/components/TradeReviewSummary";
import { Review, Trade } from "@/lib/types";

interface TradeReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trade: Trade;
  review?: Review | null;
  onSave: (review: Review) => void;
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
}: TradeReviewDialogProps) {
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (!open) return;

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
  }, [open, review]);

  const handleSave = () => {
    const payload: Review = {
      id: review?.id || crypto.randomUUID(),
      type: "trade",
      reviewScope: "trade",
      tradeId: trade.id,
      reviewDate: trade.date,
      executionRating: Number(form.executionRating),
      disciplineScore: Number(form.disciplineRating),
      emotionRating: Number(form.emotionRating),
      whatWentWell: form.whatWentWell.trim(),
      whatWentWrong: form.whatWentWrong.trim(),
      mistakesMade: form.mistakesMade.trim(),
      lessonLearned: form.lessonLearned.trim(),
      improvementForNextTrade: form.improvementForNextTrade.trim(),
      wouldTakeAgain: form.wouldTakeAgain === "yes",
      createdAt: review?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] w-[calc(100vw-1rem)] max-w-3xl overflow-y-auto rounded-2xl p-4 sm:w-[calc(100vw-2rem)] sm:p-6">
        <DialogHeader>
          <DialogTitle>{review ? "Edit Trade Review" : "Review Trade"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <TradeReviewSummary trade={trade} />

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Execution Rating</Label>
              <Select value={form.executionRating} onValueChange={(value) => setForm((current) => ({ ...current, executionRating: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["1", "2", "3", "4", "5"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Discipline Rating</Label>
              <Select value={form.disciplineRating} onValueChange={(value) => setForm((current) => ({ ...current, disciplineRating: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["1", "2", "3", "4", "5"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Emotion Control</Label>
              <Select value={form.emotionRating} onValueChange={(value) => setForm((current) => ({ ...current, emotionRating: value }))}>
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
                onChange={(event) =>
                  setForm((current) => ({ ...current, [key]: event.target.value }))
                }
              />
            </div>
          ))}

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Would I Take This Again?</Label>
            <Select value={form.wouldTakeAgain} onValueChange={(value) => setForm((current) => ({ ...current, wouldTakeAgain: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
          <Button className="w-full sm:w-auto" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="w-full sm:w-auto" onClick={handleSave}>{review ? "Save Review" : "Create Review"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
