import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, FolderOpen, Loader2, Search, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface PortfolioModerationWidgetProps {
  className?: string;
  defaultExpanded?: boolean;
  schoolId?: string | null;
}

interface SchoolProject {
  id: string;
  title: string;
  description: string | null;
  approval_status: string | null;
  created_at: string;
  student_name: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-green-100 text-green-800 border-green-200",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export function PortfolioModerationWidget({
  className = "",
  defaultExpanded = false,
  schoolId,
}: PortfolioModerationWidgetProps) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<SchoolProject[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<SchoolProject | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title, description, approval_status, created_at, profiles!inner(full_name)")
        .eq("profiles.school_id", schoolId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setProjects(
        (data || []).map((row) => ({
          id: row.id,
          title: row.title,
          description: row.description,
          approval_status: row.approval_status,
          created_at: row.created_at,
          student_name: (row as any).profiles?.full_name || null,
        }))
      );
    } catch (error) {
      toast({
        title: "Projects failed",
        description: getErrorMessage(error, "Unable to load student projects."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [schoolId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () =>
      projects.filter((project) =>
        `${project.title} ${project.student_name || ""}`.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [projects, searchTerm]
  );

  const approve = async (project: SchoolProject) => {
    setBusyId(project.id);
    try {
      const { error } = await supabase.rpc("approve_student_project", { p_project_id: project.id });
      if (error) throw error;
      toast({ title: "Project approved" });
      await load();
    } catch (error) {
      toast({
        title: "Approve failed",
        description: getErrorMessage(error, "Unable to approve this project."),
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const reject = async () => {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    try {
      const { error } = await supabase.rpc("reject_student_project", {
        p_project_id: rejectTarget.id,
        p_reason: reason || null,
      });
      if (error) throw error;
      toast({ title: "Project rejected" });
      setRejectTarget(null);
      setReason("");
      await load();
    } catch (error) {
      toast({
        title: "Reject failed",
        description: getErrorMessage(error, "Unable to reject this project."),
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (project: SchoolProject) => {
    setBusyId(project.id);
    try {
      const { error } = await supabase.rpc("delete_student_project", { p_project_id: project.id });
      if (error) throw error;
      toast({ title: "Project deleted" });
      await load();
    } catch (error) {
      toast({
        title: "Delete failed",
        description: getErrorMessage(error, "Unable to delete this project."),
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  if (!schoolId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Portfolio Moderation
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
            <FolderOpen className="h-5 w-5" />
            Portfolio Moderation
          </span>
          <Badge variant="secondary">{projects.filter((p) => p.approval_status === "pending").length} pending</Badge>
        </CardTitle>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              No student projects to moderate.
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((project) => (
                <div key={project.id} className="flex flex-col justify-between gap-3 rounded-lg border p-4 md:flex-row md:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{project.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {project.student_name || "Unknown student"} · {new Date(project.created_at).toLocaleDateString()}
                    </p>
                    <Badge variant="outline" className={`mt-2 ${STATUS_STYLES[project.approval_status || "pending"]}`}>
                      {project.approval_status || "pending"}
                    </Badge>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={busyId !== null} onClick={() => void approve(project)}>
                      <Check className="mr-1.5 h-4 w-4" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" disabled={busyId !== null} onClick={() => { setRejectTarget(project); setReason(""); }}>
                      <X className="mr-1.5 h-4 w-4" /> Reject
                    </Button>
                    <Button size="sm" variant="ghost" aria-label="Delete" disabled={busyId !== null} onClick={() => void remove(project)}>
                      {busyId === project.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject project</DialogTitle>
                <DialogDescription>Leave a note for the student (optional).</DialogDescription>
              </DialogHeader>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for rejection" className="min-h-[96px]" />
              <DialogFooter>
                <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={busyId !== null}>Cancel</Button>
                <Button onClick={() => void reject()} disabled={busyId !== null}>
                  {busyId === rejectTarget?.id ? "Rejecting..." : "Reject"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      )}
    </Card>
  );
}
