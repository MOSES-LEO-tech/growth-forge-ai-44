import { useState, useEffect, useCallback } from "react";
import { getChildProjects, postProjectComment } from "@/lib/supabase/parent";
import { ExpandableWidget } from "@/components/ExpandableWidget";
import { FolderOpen, CheckCircle, Clock, MessageSquare, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

interface ProjectsMonitoringWidgetProps {
    className?: string;
    defaultExpanded?: boolean;
    childId: string | number;
}

type ProjectItem = {
    id: string;
    title: string;
    description: string | null;
    status: string;
    verified: boolean;
    skills?: string[];
    started_at?: string;
    completed_at?: string;
    created_at: string;
    files_count: number;
    my_comments_count: number;
};

const STATUS_COLORS: Record<string, string> = {
    complete: "bg-emerald-500/15 text-emerald-700",
    in_progress: "bg-blue-500/15 text-blue-700",
    pending: "bg-amber-500/15 text-amber-700",
};

export function ProjectsMonitoringWidget({ className, defaultExpanded, childId }: ProjectsMonitoringWidgetProps) {
    const [projects, setProjects] = useState<ProjectItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [commentingOn, setCommentingOn] = useState<string | null>(null);
    const [commentText, setCommentText] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const fetchProjects = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getChildProjects(childId);
            setProjects(data as any[]);
        } catch (err: any) {
            setError(err?.message || "Failed to load projects.");
        } finally {
            setLoading(false);
        }
    }, [childId]);

    useEffect(() => { fetchProjects(); }, [fetchProjects]);

    const handleSubmitComment = async (projectId: string) => {
        if (commentText.trim().length < 10) {
            toast({ title: "Comment too short", description: "Please write at least 10 characters.", variant: "destructive" });
            return;
        }
        try {
            setSubmitting(true);
            await postProjectComment(projectId, commentText.trim());
            toast({ title: "Encouragement sent! 🎉", description: "Your child will see your message." });
            setCommentingOn(null);
            setCommentText("");
            fetchProjects();
        } catch (err: any) {
            toast({ title: "Failed to send", description: err?.message || "Please try again.", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    const inProgress = projects.filter(p => p.status !== 'complete');
    const completed = projects.filter(p => p.status === 'complete');

    const CollapsedContent = () => (
        <div className="flex flex-col h-full gap-3">
            {loading ? <Skeleton className="h-16 w-full" /> : error ? <p className="text-sm text-destructive">{error}</p> : (
                <>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-blue-500/10 text-center">
                            <div className="text-xl font-bold text-blue-600">{inProgress.length}</div>
                            <div className="text-xs text-muted-foreground">In Progress</div>
                        </div>
                        <div className="p-3 rounded-lg bg-emerald-500/10 text-center">
                            <div className="text-xl font-bold text-emerald-600">{completed.length}</div>
                            <div className="text-xs text-muted-foreground">Completed</div>
                        </div>
                    </div>
                    {projects[0] && (
                        <div className="text-xs text-muted-foreground truncate border-t pt-2">
                            Latest: <span className="font-medium">{projects[0].title}</span>
                        </div>
                    )}
                </>
            )}
        </div>
    );

    const ExpandedContent = () => (
        <div className="flex flex-col gap-4 p-2">
            {loading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
            ) : error ? (
                <div className="text-center py-8 text-destructive">{error}<button onClick={fetchProjects} className="block mt-2 mx-auto text-sm text-primary underline">Retry</button></div>
            ) : projects.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>No projects yet</p>
                </div>
            ) : (
                <ScrollArea className="max-h-[400px]">
                    <div className="space-y-3 pr-2">
                        {projects.map(project => (
                            <div key={project.id} className="p-4 rounded-xl border bg-card hover:shadow-sm transition-shadow">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <h4 className="font-semibold">{project.title}</h4>
                                    <div className="flex gap-1 flex-shrink-0">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[project.status] || 'bg-muted text-muted-foreground'}`}>
                                            {project.status.replace('_', ' ')}
                                        </span>
                                        {project.verified && (
                                            <Badge variant="secondary" className="text-[10px] h-5">
                                                <CheckCircle className="w-3 h-3 mr-1 text-emerald-500" />Verified
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                {project.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{project.description}</p>}
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    {project.started_at && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Started {new Date(project.started_at).toLocaleDateString()}</span>}
                                    <span>{project.files_count} files</span>
                                </div>
                                {/* Encouragement section */}
                                {commentingOn === project.id ? (
                                    <div className="mt-3 space-y-2">
                                        <Textarea
                                            placeholder="Write an encouraging message... (10–500 characters)"
                                            value={commentText}
                                            onChange={e => setCommentText(e.target.value)}
                                            className="text-sm"
                                            rows={3}
                                        />
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={() => handleSubmitComment(project.id)} disabled={submitting}>
                                                <Send className="w-3 h-3 mr-1" />{submitting ? "Sending..." : "Send"}
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => { setCommentingOn(null); setCommentText(""); }}>Cancel</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setCommentingOn(project.id)}
                                        className="mt-3 text-xs flex items-center gap-1 text-primary hover:underline"
                                    >
                                        <MessageSquare className="w-3 h-3" />
                                        Encourage{project.my_comments_count > 0 ? ` (${project.my_comments_count} sent)` : ""}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            )}
        </div>
    );

    return (
        <ExpandableWidget
            title="Projects"
            icon={<FolderOpen className="w-5 h-5 text-blue-500" />}
            className={className}
            defaultExpanded={defaultExpanded}
            expandedContent={<ExpandedContent />}
        >
            <CollapsedContent />
        </ExpandableWidget>
    );
}
