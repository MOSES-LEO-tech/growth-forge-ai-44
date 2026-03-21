import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProjects } from "@/lib/supabase/projects";
import type { Project } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Rocket, BookOpen, CheckCircle } from "lucide-react";
import ProjectCard from "@/components/ProjectCard";
import AddProjectModal from "@/components/AddProjectModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExpandableWidget } from "@/components/ExpandableWidget";
import { Badge } from "@/components/ui/badge";

interface ProjectsWidgetProps {
    className?: string;
    defaultExpanded?: boolean;
    userId?: string;
}

export function ProjectsWidget({ className, defaultExpanded, userId }: ProjectsWidgetProps) {
    const [searchQuery, setSearchQuery] = useState("");

    // We can use the same query key as the page to share cache
    const { data: projects, isLoading, refetch } = useQuery<Project[]>({
        queryKey: ["projects", userId],
        queryFn: async () => {
            if (!userId) return [];
            return await getProjects(userId);
        },
        enabled: !!userId,
    });

    const filteredProjects = projects?.filter((project: Project) =>
        project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const ongoingCount = projects?.filter(p => p.status === 'ongoing').length || 0;
    const completedCount = projects?.filter(p => p.status === 'complete').length || 0;

    // Content for the collapsed state
    const CollapsedContent = () => (
        <div className="flex flex-col gap-4 h-full">
            <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-primary/10 rounded-lg p-3">
                    <Rocket className="w-5 h-5 mx-auto mb-1 text-primary" />
                    <span className="text-2xl font-bold">{ongoingCount}</span>
                    <p className="text-xs text-muted-foreground">Ongoing</p>
                </div>
                <div className="bg-green-500/10 rounded-lg p-3">
                    <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-600" />
                    <span className="text-2xl font-bold">{completedCount}</span>
                    <p className="text-xs text-muted-foreground">Completed</p>
                </div>
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

            <Button className="w-full mt-auto" size="sm" variant="outline">
                View All Projects
            </Button>
        </div>
    );

    // Content for the expanded state
    const ExpandedContent = () => {
        const newProjects = filteredProjects?.filter((p: Project) => p.status === 'pending');
        const ongoingProjects = filteredProjects?.filter((p: Project) => p.status === 'ongoing');
        const completedProjects = filteredProjects?.filter((p: Project) => p.status === 'complete');

        return (
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
                    <AddProjectModal userId={userId} onProjectAdded={refetch} />
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
                            <ProjectGrid projects={filteredProjects} isLoading={isLoading} />
                        </TabsContent>
                        <TabsContent value="new" className="mt-0">
                            <ProjectGrid projects={newProjects} isLoading={isLoading} />
                        </TabsContent>
                        <TabsContent value="ongoing" className="mt-0">
                            <ProjectGrid projects={ongoingProjects} isLoading={isLoading} />
                        </TabsContent>
                        <TabsContent value="completed" className="mt-0">
                            <ProjectGrid projects={completedProjects} isLoading={isLoading} />
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            </div>
        );
    };

    return (
        <ExpandableWidget
            title="Projects"
            icon={<BookOpen className="w-5 h-5 text-blue-500" />}
            className={className}
            defaultExpanded={defaultExpanded}
            expandedContent={<ExpandedContent />}
        >
            <CollapsedContent />
        </ExpandableWidget>
    );
}

function ProjectGrid({ projects, isLoading }: { projects: Project[] | undefined, isLoading: boolean }) {
    if (isLoading) {
        return <div className="text-center py-12 text-muted-foreground">Loading projects...</div>;
    }

    if (!projects || projects.length === 0) {
        return <div className="text-center py-12 text-muted-foreground">No projects found.</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-6">
            {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
            ))}
        </div>
    );
}
