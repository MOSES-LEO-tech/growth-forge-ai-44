import { useCallback, useEffect, useState } from "react";
import { Award, Check, Loader2, Trophy, X } from "lucide-react";
import { getPendingAchievements, rejectAchievement, verifyAchievement } from "@/lib/supabase/achievements";
import type { Achievement } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface AchievementControlWidgetProps {
  className?: string;
  defaultExpanded?: boolean;
  schoolId?: string | null;
}

type ReviewAction = "approve" | "reject";

type ReviewTarget = {
  id: string;
  title: string;
  action: ReviewAction;
} | null;

type PendingAchievement = Achievement & {
  student_name: string | null;
  student_email: string | null;
};

const getErrorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

export function AchievementControlWidget({ className = "", defaultExpanded = false, schoolId }: AchievementControlWidgetProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [achievements, setAchievements] = useState<PendingAchievement[]>([]);
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchAchievements = useCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const pending = await getPendingAchievements(schoolId);
      setAchievements(pending);
    } catch (error) {
      toast({
        title: "Achievement queue failed",
        description: getErrorMessage(error, "Unable to load pending achievements."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [schoolId, toast]);

  useEffect(() => {
    void fetchAchievements();
  }, [fetchAchievements]);

  const openReview = (target: NonNullable<ReviewTarget>) => {
    setReviewTarget(target);
    setReason("");
  };

  const closeReview = () => {
    if (submitting) return;
    setReviewTarget(null);
    setReason("");
  };

  const handleReview = async () => {
    if (!reviewTarget) return;

    setSubmitting(true);
    try {
      if (reviewTarget.action === "approve") {
        await verifyAchievement(reviewTarget.id);
      } else {
        await rejectAchievement(reviewTarget.id, reason);
      }

      toast({
        title: reviewTarget.action === "approve" ? "Achievement approved" : "Achievement rejected",
        description: `${reviewTarget.title} has been updated.`,
      });
      closeReview();
      await fetchAchievements();
    } catch (error) {
      toast({
        title: "Review failed",
        description: getErrorMessage(error, "Unable to update this achievement."),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!schoolId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Achievement Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No school assigned to your account.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <CardTitle className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Achievement Approvals
          </span>
          <Badge variant={achievements.length ? "destructive" : "secondary"}>{achievements.length} pending</Badge>
        </CardTitle>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">School admins approve student achievement claims after teacher portfolio reviews are handled.</p>
            <Button type="button" size="sm" variant="outline" onClick={fetchAchievements} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, index) => <Skeleton key={index} className="h-24" />)}
            </div>
          ) : achievements.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No achievement claims need school admin approval.
            </div>
          ) : (
            <div className="space-y-3">
              {achievements.map((achievement) => (
                <div key={achievement.id} className="flex flex-col justify-between gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 md:flex-row md:items-center">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-yellow-100 p-2 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200">
                      <Award className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <p className="font-medium">{achievement.title}</p>
                        <Badge variant="outline">{achievement.student_name || achievement.student_email || "Unknown student"}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{achievement.description || "No description provided."}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {achievement.category ? <span>{achievement.category}</span> : null}
                        {achievement.date_earned ? <span>Earned {new Date(achievement.date_earned).toLocaleDateString()}</span> : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => openReview({ id: achievement.id, title: achievement.title, action: "approve" })}>
                      <Check className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => openReview({ id: achievement.id, title: achievement.title, action: "reject" })}>
                      <X className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Dialog open={!!reviewTarget} onOpenChange={(open) => !open && closeReview()}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{reviewTarget?.action === "approve" ? "Approve achievement" : "Reject achievement"}</DialogTitle>
                <DialogDescription>
                  {reviewTarget?.action === "approve"
                    ? `Approve ${reviewTarget.title} and mark it verified.`
                    : `Reject ${reviewTarget?.title} and optionally leave a note for the student.`}
                </DialogDescription>
              </DialogHeader>
              {reviewTarget?.action === "reject" && (
                <Textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Reason for rejection"
                  className="min-h-[96px]"
                />
              )}
              <DialogFooter>
                <Button variant="outline" onClick={closeReview} disabled={submitting}>Cancel</Button>
                <Button onClick={handleReview} disabled={submitting}>
                  {submitting ? "Saving..." : reviewTarget?.action === "approve" ? "Approve" : "Reject"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      )}
    </Card>
  );
}
