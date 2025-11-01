import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Recommendations from "@/components/Recommendations";
import ScholarshipMatches from "@/components/ScholarshipMatches";
import SmartBuddy from "@/components/SmartBuddy";
import DashboardStats from "@/components/DashboardStats";
import AddProjectModal from "@/components/AddProjectModal";
import AddGalleryModal from "@/components/AddGalleryModal";

const StudentDashboard = ({ profile }: { profile: any }) => {
  const [achievements, setAchievements] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const { data: achievementsData } = await supabase
      .from("achievements")
      .select("*")
      .eq("user_id", profile.id)
      .order("date_earned", { ascending: false })
      .limit(5);

    const { data: projectsData } = await supabase
      .from("projects")
      .select("*")
      .eq("owner_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(5);

    setAchievements(achievementsData || []);
    setProjects(projectsData || []);
    setLoading(false);
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

      <DashboardStats
        achievements={achievements.length}
        projects={projects.filter((p: any) => p.status === "ongoing").length}
        events={12}
        growthScore={85}
      />

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Achievements</CardTitle>
                <CardDescription>Your latest verified accomplishments</CardDescription>
              </div>
              <AddGalleryModal userId={profile.id} onItemAdded={fetchData} />
            </div>
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
                  <div key={project.id} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-semibold">{project.title}</h4>
                      <Badge 
                        variant={
                          project.status === "complete" ? "default" :
                          project.status === "ongoing" ? "secondary" : "outline"
                        }
                      >
                        {project.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{project.description}</p>
                    {project.skills_tracked && Object.keys(project.skills_tracked).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(project.skills_tracked).map(([skill, level]: [string, any]) => (
                          <Badge key={skill} variant="outline" className="text-xs">
                            {skill}: {level}/5
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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
    </div>
  );
};

export default StudentDashboard;