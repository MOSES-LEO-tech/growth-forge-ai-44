import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getProjects, uploadProjectMedia } from "@/lib/supabase/projects";
import type { Project } from "@/integrations/supabase/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Rocket, BookOpen, CheckCircle, Loader2, UploadCloud, ListChecks, Target } from "lucide-react";
import ProjectCard from "@/components/ProjectCard";
import AddProjectModal from "@/components/AddProjectModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExpandableWidget } from "@/components/ExpandableWidget";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { normalizeProjectStatus } from "@/lib/projectStatus";
import { useTaskStats } from "@/hooks/useTaskStats";

interface ProjectsWidgetProps {
    className?: string;
    defaultExpanded?: boolean;
    userId?: string;
    openAddExternal?: boolean;
    onOpenAddChange?: (open: boolean) => void;
}

export function ProjectsWidget({ className, defaultExpanded, userId, openAddExternal, onOpenAddChange }: ProjectsWidgetProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [widgetExpanded, setWidgetExpanded] = useState(defaultExpanded);
    const [mediaProject, setMediaProject] = useState<Project | null>(null);
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const { toast } = useToast();

    // Internal modal control
    const [internalOpenAdd, setInternalOpenAdd] = useState(false);
    const isControlled = openAddExternal !== undefined;
    const openAdd = isControlled ? openAddExternal : internalOpenAdd;
    const setOpenAdd = isControlled
        ? (onOpenAddChange ?? (() => {}))
        : setInternalOpenAdd;

    // We can use the same query key as the page to share cache
    const { data: projects, isLoading, refetch } = useQuery<Project[]>({
        queryKey: ["projects", userId],
        queryFn: async () => {
            if (!userId) return [];
            return await getProjects(userId);
        },
        enabled: !!userId,
    });

    const projectIds = projects?.map((p) => p.id) || [];
    const { data: taskStatsMap } = useTaskStats(projectIds);

    const filteredProjects = projects?.filter((project: Project) =>
        project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeCount = projects?.filter(p => normalizeProjectStatus(p.status) !== 'complete').length || 0;
    const completedCount = projects?.filter(p => normalizeProjectStatus(p.status) === 'complete').length || 0;

    // Aggregate real progress across all projects (task-driven when tasks exist).
    const aggregate = (projects || []).reduce(
        (acc, p) => {
            const stats = taskStatsMap?.get(p.id);
            if (stats && stats.total > 0) {
                acc.tasksTotal += stats.total;
                acc.tasksDone += stats.done;
                acc.weighted += (stats.done / stats.total) * 100;
                acc.withTasks += 1;
            } else if (normalizeProjectStatus(p.status) === 'complete') {
                acc.weighted += 100;
            }
            acc.total += 1;
            return acc;
        },
        { tasksTotal: 0, tasksDone: 0, weighted: 0, withTasks: 0, total: 0 }
    );
    const overallProgress = aggregate.total === 0
        ? 0
        : aggregate.tasksTotal > 0
            ? Math.round((aggregate.tasksDone / aggregate.tasksTotal) * 100)
            : Math.round(aggregate.weighted / aggregate.total);

    useEffect(() => {
        if (defaultExpanded || openAdd) {
            setWidgetExpanded(true);
        }
    }, [defaultExpanded, openAdd]);

    const handleWidgetExpandedChange = (open: boolean) => {
        setWidgetExpanded(open);
        if (!open && openAdd) {
            setOpenAdd(false);
        }
    };

    const handleMediaUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mediaProject || !mediaFile) {
            toast({
                title: "Select a file",
                description: "Choose an image, video, or PDF before uploading.",
                variant: "destructive",
            });
            return;
        }

        setUploadingMedia(true);
        try {
            await uploadProjectMedia(mediaProject.id, mediaFile);
            toast({
                title: "Media added",
                description: `${mediaFile.name} was attached to ${mediaProject.title}.`,
            });
            setMediaProject(null);
            setMediaFile(null);
            await refetch();
        } catch (error: any) {
            toast({
                title: "Upload failed",
                description: error.message || "Please try again.",
                variant: "destructive",
            });
        } finally {
            setUploadingMedia(false);
        }
    };

    const CollapsedContent = (
        <div className="flex flex-col gap-4 h-full">
            <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-primary/10 rounded-lg p-3">
                    <Rocket className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <span className="text-2xl font-bold">{activeCount}</span>
                    <p className="text-xs text-muted-foreground">Active</p>
                </div>
                <div className="bg-green-500/10 rounded-lg p-3">
                    <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-600" />
                    <span className="text-2xl font-bold">{completedCount}</span>
                    <p className="text-xs text-muted-foreground">Completed</p>
                </div>
            </div>

            {/* Overall progress */}
            <div className="border rounded-lg p-3 bg-muted/30">
                <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground flex items-center gap-1">
                        <Target className="w-3.5 h-3.5" /> Overall progress
                    </span>
                    <span className="font-semibold">{overallProgress}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${overallProgress}%` }}
                    />
                </div>
                {aggregate.tasksTotal > 0 && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <ListChecks className="w-3.5 h-3.5" />
                        {aggregate.tasksDone}/{aggregate.tasksTotal} tasks completed
                    </p>
                )}
            </div>

            <div className="flex-1">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Recent Activity</h4>
                <div className="space-y-2">
                    {projects?.slice(0, 2).map(project => (
                        <div key={project.id} className="text-sm border rounded p-2 bg-muted/30 truncate">
                            {project.title}
                        </div>
                    ))}
                    {(!projects || projects.length === 0) && (
                        <div className="text-sm text-center text-muted-foreground italic">No projects yet</div>
                    )}
                </div>
            </div>

            <Button className="w-full mt-auto" size="sm" variant="outline" asChild>
                <Link to="/projects">View All Projects</Link>
            </Button>
        </div>
    );

    const ExpandedContent = (
        <div className="flex flex-col h-full gap-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search projects..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Button onClick={() => setOpenAdd(true)} disabled={!userId}>
                    <Plus className="mr-2 h-4 w-4" /> New Project
                </Button>
                {userId && (
                    <AddProjectModal userId={userId} onProjectAdded={refetch} open={openAdd} onOpenChange={setOpenAdd} />
                )}
            </div>

            <Tabs defaultValue="all" className="flex-1 flex flex-col">
                <TabsList className="grid w-full max-w-md grid-cols-4 self-center md:self-start mb-4">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="new">New</TabsTrigger>
                    <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1 -mx-2 px-2">
                    <TabsContent value="all" className="mt-0">
                        <ProjectGrid projects={filteredProjects} isLoading={isLoading} taskStatsMap={taskStatsMap} onAddMedia={setMediaProject} />
                    </TabsContent>
                    <TabsContent value="new" className="mt-0">
                        <ProjectGrid projects={filteredProjects?.filter((p: Project) => normalizeProjectStatus(p.status) === 'pending')} isLoading={isLoading} taskStatsMap={taskStatsMap} onAddMedia={setMediaProject} />
                    </TabsContent>
                    <TabsContent value="ongoing" className="mt-0">
                        <ProjectGrid projects={filteredProjects?.filter((p: Project) => normalizeProjectStatus(p.status) === 'ongoing')} isLoading={isLoading} taskStatsMap={taskStatsMap} onAddMedia={setMediaProject} />
                    </TabsContent>
                    <TabsContent value="completed" className="mt-0">
                        <ProjectGrid projects={filteredProjects?.filter((p: Project) => normalizeProjectStatus(p.status) === 'complete')} isLoading={isLoading} taskStatsMap={taskStatsMap} onAddMedia={setMediaProject} />
                    </TabsContent>
                </ScrollArea>
            </Tabs>
        </div>
    );

    return (
        <>
            <ExpandableWidget
                title="Projects"
                icon={<BookOpen className="w-5 h-5 text-blue-500" />}
                className={className}
                defaultExpanded={defaultExpanded}
                expanded={widgetExpanded}
                onExpandedChange={handleWidgetExpandedChange}
                expandedContent={ExpandedContent}
            >
                {CollapsedContent}
            </ExpandableWidget>

            <Dialog open={!!mediaProject} onOpenChange={(open) => { if (!open) { setMediaProject(null); setMediaFile(null); } }}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Add Project Media</DialogTitle>
                        <DialogDescription>
                            Attach an image, video, or PDF to {mediaProject?.title || "this project"}.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleMediaUpload} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="project-media-file">File</Label>
                            <Input
                                id="project-media-file"
                                type="file"
                                accept="image/*,video/*,application/pdf"
                                onChange={(event) => setMediaFile(event.target.files?.[0] || null)}
                                required
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => { setMediaProject(null); setMediaFile(null); }} disabled={uploadingMedia}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={uploadingMedia || !mediaFile}>
                                {uploadingMedia ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud className="mr-2 h-4 w-4" />
                                        Upload Media
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

function ProjectGrid({
    projects,
    isLoading,
    taskStatsMap,
    onAddMedia,
}: {
    projects: Project[] | undefined;
    isLoading: boolean;
    taskStatsMap?: Map<string, { total: number; done: number; inProgress: number }>;
    onAddMedia: (project: Project) => void;
}) {
    if (isLoading) {
        return <div className="text-center py-12 text-muted-foreground">Loading projects...</div>;
    }

    if (!projects || projects.length === 0) {
        return <div className="text-center py-12 text-muted-foreground">No projects found.</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-6">
            {projects.map((project) => (
                <div key={project.id} className="flex min-w-0 flex-col gap-2">
                    <ProjectCard project={project} taskStats={taskStatsMap?.get(project.id)} />
                    <Button size="sm" variant="outline" className="w-full" onClick={() => onAddMedia(project)}>
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Add media
                    </Button>
                </div>
            ))}
        </div>
    );
}
