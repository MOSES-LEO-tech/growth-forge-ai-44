import { useEffect, useState } from "react";
import { dashboard, projects as projectsApi } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Edit, Trash2, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Recommendations from "@/components/Recommendations";
import ScholarshipMatches from "@/components/ScholarshipMatches";
import SmartBuddy from "@/components/SmartBuddy";
import DashboardStats from "@/components/DashboardStats";
import AddProjectModal from "@/components/AddProjectModal";
import AddGalleryModal from "@/components/AddGalleryModal";
import EditProjectModal from "@/components/EditProjectModal";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import ProjectDetailsModal from "@/components/ProjectDetailsModal";

const StudentDashboard = ({ profile }: { profile: any }) => {
  const [achievements, setAchievements] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Modal states
  const [editProject, setEditProject] = useState<any>(null);
  const [deleteProject, setDeleteProject] = useState<any>(null);
  const [viewProject, setViewProject] = useState<any>(null);

  const fetchData = async () => {
    try {
      const [achievementsRes, projectsRes] = await Promise.all([
        dashboard.getAchievements(),
        dashboard.getProjects()
      ]);

      setAchievements(achievementsRes.data || []);
      setProjects(projectsRes.data || []);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteProject) return;

    try {
      await projectsApi.delete(deleteProject.id);

      toast({
        title: "Success!",
        description: "Project deleted successfully",
        className: "bg-green-500 text-white"
      });

      setDeleteProject(null);
      fetchData();
    } catch (error: any) {
      console.error("Delete project error:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete project",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile.id]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Welcome back, {profile.full_name}!</h2>
        <p className="text-muted-foreground">Here's what's happening with your journey</p>
      </div>

      <div className="mb-8">
        <DashboardStats
          achievements={achievements.length}
          projects={projects.filter((p: any) => p.status === "ongoing").length}
          events={12}
          growthScore={85}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Achievements</CardTitle>
            <CardDescription>Your latest verified accomplishments</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : achievements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No achievements yet. Start adding your accomplishments!
              </div>
            ) : (
              <div className="space-y-4">
                {achievements.map((achievement: any) => (
                  <div key={achievement.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-amber-500 flex items-center justify-center flex-shrink-0">
                      <Award className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold">{achievement.title}</h4>
                        {achievement.verified && (
                          <Badge variant="secondary" className="flex-shrink-0">Verified</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{achievement.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(achievement.date_earned).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active Projects</CardTitle>
                <CardDescription>Track your ongoing work</CardDescription>
              </div>
              <AddProjectModal userId={profile.id} onProjectAdded={fetchData} />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No projects yet. Start documenting your work!
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((project: any) => (
                  <div key={project.id} className="p-4 rounded-lg bg-gradient-to-br from-blue-50/50 to-cyan-50/50 border border-blue-100 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-semibold text-lg">{project.title}</h4>
                      <Badge
                        variant={
                          project.status === "complete" ? "default" :
                            project.status === "ongoing" ? "secondary" : "outline"
                        }
                      >
                        {project.status === "complete" ? "✅ Complete" :
                          project.status === "ongoing" ? "🚀 In Progress" : "📋 Pending"}
                      </Badge>
                    </div>
                    {project.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{project.description}</p>
                    )}
                    {project.skills_tracked && Object.keys(project.skills_tracked).length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {Object.entries(project.skills_tracked).map(([skill, level]: [string, any]) => (
                          <Badge key={skill} variant="outline" className="text-xs">
                            {skill}: {level}/5
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewProject(project)}
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditProject(project)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteProject(project)}
                        className="flex-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>School Gallery</CardTitle>
                <CardDescription>Latest school events and memories</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.location.href = '/school/gallery'}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-4">
              <p>Check out the latest photos and videos from school events!</p>
              <Button onClick={() => window.location.href = '/school/gallery'} className="w-full sm:w-auto">
                Browse Gallery
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Recommendations />
        <ScholarshipMatches />
      </div>

      <div className="mb-6">
        <SmartBuddy />
      </div>

      {/* Project Modals */}
      {editProject && (
        <EditProjectModal
          project={editProject}
          open={!!editProject}
          onOpenChange={(open) => !open && setEditProject(null)}
          onProjectUpdated={fetchData}
        />
      )}

      {deleteProject && (
        <DeleteConfirmDialog
          open={!!deleteProject}
          onOpenChange={(open) => !open && setDeleteProject(null)}
          onConfirm={handleDeleteProject}
          itemName={deleteProject.title}
          title="Delete Project?"
          description={`This will permanently delete "${deleteProject.title}" and all associated data. This action cannot be undone.`}
        />
      )}

      {viewProject && (
        <ProjectDetailsModal
          project={viewProject}
          open={!!viewProject}
          onOpenChange={(open) => !open && setViewProject(null)}
        />
      )}
    </div>
  );
};

export default StudentDashboard;