import { useCallback, useEffect, useState } from "react";
import { getPendingMediaEvents, approveMediaEvent, rejectMediaEvent } from "@/lib/supabase/gallery";
import { getPendingProjects, rejectProject, verifyProject } from "@/lib/supabase/projects";
import type { Project } from "@/integrations/supabase/types";
import { ExpandableWidget } from "@/components/ExpandableWidget";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Check, CheckCircle, ExternalLink, Image, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface PendingApprovalsWidgetProps {
  className?: string;
  defaultExpanded?: boolean;
}

type ReviewType = "project" | "media";
type ReviewAction = "approve" | "reject";

type ReviewTarget = {
  id: string;
  type: ReviewType;
  action: ReviewAction;
  title: string;
} | null;

type PendingProject = Project & {
  student_name: string | null;
  student_email: string | null;
};

type PendingMediaEvent = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url?: string;
  media_count?: number;
  student_name: string | null;
  student_email: string | null;
};

const getErrorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

export function PendingApprovalsWidget({ className, defaultExpanded }: PendingApprovalsWidgetProps) {
  const { toast } = useToast();
  const [pendingProjects, setPendingProjects] = useState<PendingProject[]>([]);
  const [pendingMedia, setPendingMedia] = useState<PendingMediaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchPendingData = useCallback(async () => {
    setLoading(true);
    try {
      const [projects, media] = await Promise.all([
        getPendingProjects(),
        getPendingMediaEvents(),
      ]);
      setPendingProjects(projects);
      setPendingMedia(media);
    } catch (error) {
      toast({
        title: "Approval queue failed",
        description: getErrorMessage(error, "Unable to load pending student submissions."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchPendingData();
  }, [fetchPendingData]);

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
      if (reviewTarget.type === "project") {
        if (reviewTarget.action === "approve") {
          await verifyProject(reviewTarget.id);
        } else {
          await rejectProject(reviewTarget.id, reason);
        }
      } else if (reviewTarget.action === "approve") {
        await approveMediaEvent(reviewTarget.id);
      } else {
        await rejectMediaEvent(reviewTarget.id, reason);
      }

      toast({
        title: reviewTarget.action === "approve" ? "Submission approved" : "Submission rejected",
        description: `${reviewTarget.title} has been updated.`,
      });
      closeReview();
      await fetchPendingData();
    } catch (error) {
      toast({
        title: "Review failed",
        description: getErrorMessage(error, "Unable to update this submission."),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const totalPending = pendingProjects.length + pendingMedia.length;

  const CollapsedContent = () => (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="relative">
        <CheckCircle className={`h-12 w-12 ${totalPending > 0 ? "text-amber-500" : "text-green-500"} opacity-80`} />
        {totalPending > 0 && (
          <Badge variant="destructive" className="absolute -right-2 -top-2 min-w-[20px] justify-center rounded-full px-2 py-0.5">
            {totalPending}
          </Badge>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold">{totalPending}</p>
        <p className="text-sm text-muted-foreground">Teacher Reviews</p>
      </div>
      {totalPending > 0 && (
        <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700">
          Projects and media waiting
        </p>
      )}
    </div>
  );

  const renderProjectList = () => {
    if (loading) return <div className="py-8 text-center">Loading...</div>;
    if (pendingProjects.length === 0) {
      return (
        <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 opacity-20" />
          <p>No student projects need teacher review.</p>
        </div>
      );
    }

    return pendingProjects.map((item) => (
      <div key={item.id} className="flex flex-col justify-between gap-4 rounded-lg border bg-card p-4 transition-shadow hover:shadow-sm sm:flex-row sm:items-center">
        <div className="flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h4 className="font-bold">{item.title}</h4>
            <Badge variant="outline" className="bg-primary/5">{item.student_name || item.student_email || "Unknown student"}</Badge>
          </div>
          <p className="mb-2 line-clamp-2 text-sm text-muted-foreground">{item.description || "No description provided."}</p>
          <p className="text-xs text-muted-foreground">Submitted {new Date(item.created_at).toLocaleDateString()}</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Button size="sm" variant="outline" className="flex-1 sm:flex-initial" onClick={() => window.open(`/dashboard?widget=projects&id=${item.id}`, "_blank")}>
            <ExternalLink className="mr-2 h-4 w-4" />
            View
          </Button>
          <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 sm:flex-initial" onClick={() => openReview({ id: item.id, type: "project", action: "approve", title: item.title })}>
            <Check className="mr-2 h-4 w-4" />
            Approve
          </Button>
          <Button size="sm" variant="outline" className="flex-1 border-red-200 text-red-700 hover:bg-red-50 sm:flex-initial" onClick={() => openReview({ id: item.id, type: "project", action: "reject", title: item.title })}>
            <X className="mr-2 h-4 w-4" />
            Reject
          </Button>
        </div>
      </div>
    ));
  };

  const renderMediaList = () => {
    if (loading) return <div className="py-8 text-center">Loading...</div>;
    if (pendingMedia.length === 0) {
      return (
        <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 opacity-20" />
          <p>No student media needs teacher review.</p>
        </div>
      );
    }

    return pendingMedia.map((item) => (
      <div key={item.id} className="flex flex-col justify-between gap-4 rounded-lg border bg-card p-4 transition-shadow hover:shadow-sm sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
            {item.thumbnail_url ? (
              <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <Image className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h4 className="font-bold">{item.title}</h4>
              <Badge variant="outline" className="bg-primary/5">{item.student_name || item.student_email || "Unknown student"}</Badge>
            </div>
            <p className="line-clamp-2 text-sm text-muted-foreground">{item.description || "No description provided."}</p>
            <p className="mt-2 text-xs text-muted-foreground">{item.media_count || 0} file(s) submitted</p>
          </div>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 sm:flex-initial" onClick={() => openReview({ id: item.id, type: "media", action: "approve", title: item.title })}>
            <Check className="mr-2 h-4 w-4" />
            Approve
          </Button>
          <Button size="sm" variant="outline" className="flex-1 border-red-200 text-red-700 hover:bg-red-50 sm:flex-initial" onClick={() => openReview({ id: item.id, type: "media", action: "reject", title: item.title })}>
            <X className="mr-2 h-4 w-4" />
            Reject
          </Button>
        </div>
      </div>
    ));
  };

  const ExpandedContent = () => (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Teacher Approval Queue</h3>
          <p className="text-sm text-muted-foreground">Review student projects and media submissions.</p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchPendingData} disabled={loading}>
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="projects" className="flex flex-1 flex-col">
        <TabsList className="mb-4 grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="projects">
            Projects
            {pendingProjects.length > 0 && <Badge variant="secondary" className="ml-2 text-xs">{pendingProjects.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="media">
            Media
            {pendingMedia.length > 0 && <Badge variant="secondary" className="ml-2 text-xs">{pendingMedia.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="h-full flex-1 pr-4">
          <TabsContent value="projects" className="mt-0 space-y-4">
            {renderProjectList()}
          </TabsContent>
          <TabsContent value="media" className="mt-0 space-y-4">
            {renderMediaList()}
          </TabsContent>
        </ScrollArea>
      </Tabs>

      <Dialog open={!!reviewTarget} onOpenChange={(open) => !open && closeReview()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reviewTarget?.action === "approve" ? "Approve submission" : "Reject submission"}</DialogTitle>
            <DialogDescription>
              {reviewTarget?.action === "approve"
                ? `Approve ${reviewTarget.title} for the student's portfolio.`
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
    </div>
  );

  return (
    <ExpandableWidget
      title="Teacher Approvals"
      icon={<AlertCircle className={`h-5 w-5 ${totalPending > 0 ? "text-amber-500" : "text-green-500"}`} />}
      className={className}
      defaultExpanded={defaultExpanded}
      expandedContent={<ExpandedContent />}
    >
      <CollapsedContent />
    </ExpandableWidget>
  );
}
