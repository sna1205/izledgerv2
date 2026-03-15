import { useMemo, useState } from "react";
import { endOfWeek, format, parseISO, startOfWeek } from "date-fns";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/sonner";
import { addReview, deleteReview, getReviews, updateReview } from "@/lib/reviews";
import {
  REVIEW_EMOTIONS,
  REVIEW_RISK_STATUSES,
  REVIEW_RULE_STATUSES,
  Review,
  ReviewEmotion,
  ReviewRiskStatus,
  ReviewRuleStatus,
  ReviewType,
} from "@/lib/types";

const emptyDailyForm = {
  reviewDate: new Date().toISOString().split("T")[0],
  wentWell: "",
  mistakes: "",
  followedRules: "Yes" as ReviewRuleStatus,
  emotion: "Calm" as ReviewEmotion,
  lessonLearned: "",
  improvementPlan: "",
  disciplineScore: "3",
};

const emptyWeeklyForm = {
  weekStart: format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"),
  weekEnd: format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"),
  weeklySummary: "",
  biggestWin: "",
  biggestMistake: "",
  riskManagement: "Yes" as ReviewRiskStatus,
  nextGoal: "",
  weeklyRating: "7",
};

function formatDailyLabel(date: string) {
  return format(parseISO(date), "MMM d, yyyy");
}

function formatWeeklyLabel(startDate: string, endDate: string) {
  return `${format(parseISO(startDate), "MMM d")} - ${format(parseISO(endDate), "MMM d, yyyy")}`;
}

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>(() => getReviews());
  const [activeTab, setActiveTab] = useState<ReviewType>("daily");
  const [open, setOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [viewingReview, setViewingReview] = useState<Review | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [reviewType, setReviewType] = useState<ReviewType>("daily");
  const [dailyForm, setDailyForm] = useState(emptyDailyForm);
  const [weeklyForm, setWeeklyForm] = useState(emptyWeeklyForm);

  const dailyReviews = useMemo(
    () =>
      reviews
        .filter((review) => review.type === "daily")
        .sort((a, b) => (b.reviewDate || "").localeCompare(a.reviewDate || "")),
    [reviews],
  );

  const weeklyReviews = useMemo(
    () =>
      reviews
        .filter((review) => review.type === "weekly")
        .sort((a, b) => (b.weekEnd || "").localeCompare(a.weekEnd || "")),
    [reviews],
  );

  const openCreateModal = (type: ReviewType) => {
    setReviewType(type);
    setEditingReview(null);
    setDailyForm(emptyDailyForm);
    setWeeklyForm(emptyWeeklyForm);
    setOpen(true);
  };

  const openEditModal = (review: Review) => {
    setEditingReview(review);
    setReviewType(review.type);

    if (review.type === "daily") {
      setDailyForm({
        reviewDate: review.reviewDate || emptyDailyForm.reviewDate,
        wentWell: review.wentWell || "",
        mistakes: review.mistakes || "",
        followedRules: review.followedRules || "Yes",
        emotion: review.emotion || "Calm",
        lessonLearned: review.lessonLearned || "",
        improvementPlan: review.improvementPlan || "",
        disciplineScore: String(review.disciplineScore || 3),
      });
    } else {
      setWeeklyForm({
        weekStart: review.weekStart || emptyWeeklyForm.weekStart,
        weekEnd: review.weekEnd || emptyWeeklyForm.weekEnd,
        weeklySummary: review.weeklySummary || "",
        biggestWin: review.biggestWin || "",
        biggestMistake: review.biggestMistake || "",
        riskManagement: review.riskManagement || "Yes",
        nextGoal: review.nextGoal || "",
        weeklyRating: String(review.weeklyRating || 7),
      });
    }

    setOpen(true);
  };

  const resetForms = () => {
    setEditingReview(null);
    setDailyForm(emptyDailyForm);
    setWeeklyForm(emptyWeeklyForm);
  };

  const handleSave = () => {
    if (reviewType === "daily") {
      if (!dailyForm.reviewDate) {
        toast.error("Date is required.");
        return;
      }

      const payload = {
        type: "daily" as const,
        reviewDate: dailyForm.reviewDate,
        weekStart: undefined,
        weekEnd: undefined,
        wentWell: dailyForm.wentWell.trim(),
        mistakes: dailyForm.mistakes.trim(),
        followedRules: dailyForm.followedRules,
        emotion: dailyForm.emotion,
        lessonLearned: dailyForm.lessonLearned.trim(),
        improvementPlan: dailyForm.improvementPlan.trim(),
        weeklySummary: undefined,
        biggestWin: undefined,
        biggestMistake: undefined,
        riskManagement: undefined,
        nextGoal: undefined,
        disciplineScore: Number(dailyForm.disciplineScore),
        weeklyRating: undefined,
      };

      if (editingReview) {
        const updated: Review = {
          ...editingReview,
          ...payload,
        };
        updateReview(updated);
        setReviews((current) => current.map((review) => (review.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : review)));
        toast.success("Daily review updated.");
      } else {
        const next = addReview(payload);
        setReviews((current) => [next, ...current]);
        toast.success("Daily review created.");
      }
    } else {
      if (!weeklyForm.weekStart || !weeklyForm.weekEnd) {
        toast.error("Week range is required.");
        return;
      }

      const payload = {
        type: "weekly" as const,
        reviewDate: undefined,
        weekStart: weeklyForm.weekStart,
        weekEnd: weeklyForm.weekEnd,
        wentWell: undefined,
        mistakes: undefined,
        followedRules: undefined,
        emotion: undefined,
        lessonLearned: undefined,
        improvementPlan: undefined,
        weeklySummary: weeklyForm.weeklySummary.trim(),
        biggestWin: weeklyForm.biggestWin.trim(),
        biggestMistake: weeklyForm.biggestMistake.trim(),
        riskManagement: weeklyForm.riskManagement,
        nextGoal: weeklyForm.nextGoal.trim(),
        disciplineScore: undefined,
        weeklyRating: Number(weeklyForm.weeklyRating),
      };

      if (editingReview) {
        const updated: Review = {
          ...editingReview,
          ...payload,
        };
        updateReview(updated);
        setReviews((current) => current.map((review) => (review.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : review)));
        toast.success("Weekly review updated.");
      } else {
        const next = addReview(payload);
        setReviews((current) => [next, ...current]);
        toast.success("Weekly review created.");
      }
    }

    setOpen(false);
    resetForms();
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteReview(deleteId);
    setReviews((current) => current.filter((review) => review.id !== deleteId));
    setDeleteId(null);
    toast.success("Review deleted.");
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Reviews</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reflect on your trading performance and improve your decision making.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" onClick={() => openCreateModal("daily")}>
            <Plus className="mr-1 h-4 w-4" />
            Daily Review
          </Button>
          <Button onClick={() => openCreateModal("weekly")}>
            <Plus className="mr-1 h-4 w-4" />
            Weekly Review
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ReviewType)} className="w-full">
        <div className="mb-6">
          <TabsList className="grid w-full grid-cols-2 sm:w-[320px]">
            <TabsTrigger value="daily">Daily Reviews</TabsTrigger>
            <TabsTrigger value="weekly">Weekly Reviews</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="daily" className="mt-0">
          {dailyReviews.length === 0 ? (
            <div className="rounded-xl border bg-card p-10 text-center shadow-sm">
              <p className="text-base font-medium text-foreground">No reviews yet.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Start reflecting on your trades to improve your performance.
              </p>
              <Button className="mt-4" onClick={() => openCreateModal("daily")}>
                Create your first review
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {dailyReviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-xl border bg-card p-6 shadow-sm transition-colors hover:bg-muted/20"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-base font-semibold text-foreground">
                          Daily Review - {review.reviewDate ? formatDailyLabel(review.reviewDate) : "Untitled"}
                        </h2>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm">
                        <span className="rounded-full border bg-background px-3 py-1 text-muted-foreground">
                          Discipline Score: {review.disciplineScore || 0}/5
                        </span>
                        <span className="rounded-full border bg-background px-3 py-1 text-muted-foreground">
                          Emotion: {review.emotion || "-"}
                        </span>
                        <span className="rounded-full border bg-background px-3 py-1 text-muted-foreground">
                          Rules Followed: {review.followedRules || "-"}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Lesson</p>
                        <p className="text-sm leading-relaxed text-foreground">
                          {review.lessonLearned || "No lesson recorded yet."}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => setViewingReview(review)}>
                        <Eye className="mr-1 h-4 w-4" />
                        View
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEditModal(review)}>
                        <Pencil className="mr-1 h-4 w-4" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteId(review.id)}>
                        <Trash2 className="mr-1 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="weekly" className="mt-0">
          {weeklyReviews.length === 0 ? (
            <div className="rounded-xl border bg-card p-10 text-center shadow-sm">
              <p className="text-base font-medium text-foreground">No reviews yet.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Start reflecting on your trades to improve your performance.
              </p>
              <Button className="mt-4" onClick={() => openCreateModal("weekly")}>
                Create your first review
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {weeklyReviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-xl border bg-card p-6 shadow-sm transition-colors hover:bg-muted/20"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-base font-semibold text-foreground">
                          Weekly Review - {review.weekStart && review.weekEnd ? formatWeeklyLabel(review.weekStart, review.weekEnd) : "Untitled"}
                        </h2>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm">
                        <span className="rounded-full border bg-background px-3 py-1 text-muted-foreground">
                          Rating: {review.weeklyRating || 0}/10
                        </span>
                        <span className="rounded-full border bg-background px-3 py-1 text-muted-foreground">
                          Risk Management: {review.riskManagement || "-"}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Biggest Mistake</p>
                        <p className="text-sm leading-relaxed text-foreground">
                          {review.biggestMistake || "No mistake recorded yet."}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Goal For Next Week</p>
                        <p className="text-sm leading-relaxed text-foreground">
                          {review.nextGoal || "No goal recorded yet."}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => setViewingReview(review)}>
                        <Eye className="mr-1 h-4 w-4" />
                        View
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEditModal(review)}>
                        <Pencil className="mr-1 h-4 w-4" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteId(review.id)}>
                        <Trash2 className="mr-1 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            resetForms();
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingReview ? "Edit Review" : reviewType === "daily" ? "Create Daily Review" : "Create Weekly Review"}
            </DialogTitle>
          </DialogHeader>

          {reviewType === "daily" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Date</Label>
                <Input
                  type="date"
                  value={dailyForm.reviewDate}
                  onChange={(event) => setDailyForm((current) => ({ ...current, reviewDate: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">What went well</Label>
                <Textarea
                  rows={4}
                  value={dailyForm.wentWell}
                  onChange={(event) => setDailyForm((current) => ({ ...current, wentWell: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Mistakes made</Label>
                <Textarea
                  rows={4}
                  value={dailyForm.mistakes}
                  onChange={(event) => setDailyForm((current) => ({ ...current, mistakes: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Did I follow my trading rules?</Label>
                <Select
                  value={dailyForm.followedRules}
                  onValueChange={(value) => setDailyForm((current) => ({ ...current, followedRules: value as ReviewRuleStatus }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REVIEW_RULE_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Main emotion during trading</Label>
                <Select
                  value={dailyForm.emotion}
                  onValueChange={(value) => setDailyForm((current) => ({ ...current, emotion: value as ReviewEmotion }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REVIEW_EMOTIONS.map((emotion) => (
                      <SelectItem key={emotion} value={emotion}>{emotion}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Lesson learned</Label>
                <Textarea
                  rows={4}
                  value={dailyForm.lessonLearned}
                  onChange={(event) => setDailyForm((current) => ({ ...current, lessonLearned: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">What will I improve tomorrow?</Label>
                <Textarea
                  rows={4}
                  value={dailyForm.improvementPlan}
                  onChange={(event) => setDailyForm((current) => ({ ...current, improvementPlan: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Discipline score</Label>
                <Select
                  value={dailyForm.disciplineScore}
                  onValueChange={(value) => setDailyForm((current) => ({ ...current, disciplineScore: value }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["1", "2", "3", "4", "5"].map((score) => (
                      <SelectItem key={score} value={score}>{score}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Week start</Label>
                  <Input
                    type="date"
                    value={weeklyForm.weekStart}
                    onChange={(event) => setWeeklyForm((current) => ({ ...current, weekStart: event.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Week end</Label>
                  <Input
                    type="date"
                    value={weeklyForm.weekEnd}
                    onChange={(event) => setWeeklyForm((current) => ({ ...current, weekEnd: event.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Weekly summary</Label>
                <Textarea
                  rows={4}
                  value={weeklyForm.weeklySummary}
                  onChange={(event) => setWeeklyForm((current) => ({ ...current, weeklySummary: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Biggest win this week</Label>
                <Textarea
                  rows={3}
                  value={weeklyForm.biggestWin}
                  onChange={(event) => setWeeklyForm((current) => ({ ...current, biggestWin: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Biggest mistake this week</Label>
                <Textarea
                  rows={3}
                  value={weeklyForm.biggestMistake}
                  onChange={(event) => setWeeklyForm((current) => ({ ...current, biggestMistake: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Did I respect risk management?</Label>
                <Select
                  value={weeklyForm.riskManagement}
                  onValueChange={(value) => setWeeklyForm((current) => ({ ...current, riskManagement: value as ReviewRiskStatus }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REVIEW_RISK_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Goal for next week</Label>
                <Textarea
                  rows={3}
                  value={weeklyForm.nextGoal}
                  onChange={(event) => setWeeklyForm((current) => ({ ...current, nextGoal: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Weekly self rating</Label>
                <Select
                  value={weeklyForm.weeklyRating}
                  onValueChange={(value) => setWeeklyForm((current) => ({ ...current, weeklyRating: value }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map((score) => (
                      <SelectItem key={score} value={score}>{score}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Review</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingReview} onOpenChange={(nextOpen) => !nextOpen && setViewingReview(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewingReview?.type === "daily"
                ? `Daily Review - ${viewingReview.reviewDate ? formatDailyLabel(viewingReview.reviewDate) : ""}`
                : `Weekly Review - ${viewingReview?.weekStart && viewingReview?.weekEnd ? formatWeeklyLabel(viewingReview.weekStart, viewingReview.weekEnd) : ""}`}
            </DialogTitle>
          </DialogHeader>

          {viewingReview && (
            <div className="space-y-4">
              {viewingReview.type === "daily" ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Rules</p>
                      <p className="mt-2 text-sm font-medium text-foreground">{viewingReview.followedRules || "-"}</p>
                    </div>
                    <div className="rounded-xl border p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Emotion</p>
                      <p className="mt-2 text-sm font-medium text-foreground">{viewingReview.emotion || "-"}</p>
                    </div>
                    <div className="rounded-xl border p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Discipline</p>
                      <p className="mt-2 text-sm font-medium text-foreground">{viewingReview.disciplineScore || 0}/5</p>
                    </div>
                  </div>

                  {[
                    ["What went well", viewingReview.wentWell],
                    ["Mistakes made", viewingReview.mistakes],
                    ["Lesson learned", viewingReview.lessonLearned],
                    ["What will I improve tomorrow?", viewingReview.improvementPlan],
                  ].map(([label, value]) => (
                    <div key={label} className="space-y-2 rounded-xl border p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
                      <p className="text-sm leading-relaxed text-foreground">{value || "No notes recorded."}</p>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Risk Management</p>
                      <p className="mt-2 text-sm font-medium text-foreground">{viewingReview.riskManagement || "-"}</p>
                    </div>
                    <div className="rounded-xl border p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Rating</p>
                      <p className="mt-2 text-sm font-medium text-foreground">{viewingReview.weeklyRating || 0}/10</p>
                    </div>
                  </div>

                  {[
                    ["Weekly summary", viewingReview.weeklySummary],
                    ["Biggest win this week", viewingReview.biggestWin],
                    ["Biggest mistake this week", viewingReview.biggestMistake],
                    ["Goal for next week", viewingReview.nextGoal],
                  ].map(([label, value]) => (
                    <div key={label} className="space-y-2 rounded-xl border p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
                      <p className="text-sm leading-relaxed text-foreground">{value || "No notes recorded."}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
