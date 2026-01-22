import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { projects as projectsApi } from "@/services/api";
import type { Project } from "@/services/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";
import ProjectCard from "@/components/ProjectCard";
// Duplicate imports removed
import { useInView } from "@/hooks/useInView";
import { useToast } from "@/hooks/use-toast";

const Projects = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { ref: heroRef, isInView: heroInView } = useInView({ threshold: 0.2 });
  const { ref: gridRef, isInView: gridInView } = useInView({ threshold: 0.1 });
  const { toast } = useToast();

  const { data: projects, isLoading, isError, error } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await projectsApi.getAll();
      return response.data.data as Project[];
    },
  });

  useEffect(() => {
    if (isError) {
      toast({
        title: "Error",
        description: "Failed to load projects. Please try again.",
        variant: "destructive",
      });
      console.error("Projects fetch error:", error);
    }
  }, [isError, error, toast]);

  const filteredProjects = projects?.filter((project: Project) =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const newProjects = filteredProjects?.filter((p: Project) => p.status === 'pending');
  const ongoingProjects = filteredProjects?.filter((p: Project) => p.status === 'ongoing');
  const completedProjects = filteredProjects?.filter((p: Project) => p.status === 'complete');

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div
            ref={heroRef}
            className={`text-center max-w-3xl mx-auto transition-all duration-1000 ${heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Project
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> Hub</span>
              <span className="ml-3">🚀</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Manage your projects, track progress, and showcase your achievements.
            </p>

            {/* Search and Create */}
            <div className="flex gap-4 max-w-xl mx-auto mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-4 py-6 text-lg"
                />
              </div>
              <Button size="lg" className="gap-2">
                <Plus className="w-5 h-5" />
                New Project
              </Button>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full max-w-lg mx-auto grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="new">New</TabsTrigger>
                <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-8">
                <div
                  ref={gridRef}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {isLoading ? (
                    <div className="col-span-full text-center py-16">
                      <p className="text-muted-foreground">Loading projects...</p>
                    </div>
                  ) : filteredProjects && filteredProjects.length > 0 ? (
                    filteredProjects.map((project, index) => (
                      <div
                        key={project.id}
                        className={`transition-all duration-700 ${gridInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                        style={{
                          transitionDelay: gridInView ? `${index * 100}ms` : '0ms'
                        }}
                      >
                        <ProjectCard project={project} />
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-16">
                      <p className="text-muted-foreground">No projects found. Create your first project!</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="new" className="mt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {newProjects?.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="ongoing" className="mt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {ongoingProjects?.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="completed" className="mt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedProjects?.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Projects;
