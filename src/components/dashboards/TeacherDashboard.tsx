import { useEffect, useState } from "react";
import { achievements as achievementsApi, projects as projectsApi } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CheckCircle, Calendar, Upload, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInView } from "@/hooks/useInView";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TeacherDashboard = ({ profile }: { profile: any }) => {
  const isAdmin = profile.role === "admin";
  const { ref: statsRef, isInView: statsInView } = useInView({ threshold: 0.2 });
  const { toast } = useToast();

  const [pendingAchievements, setPendingAchievements] = useState<any[]>([]);
  const [pendingProjects, setPendingProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingData();
  }, []);

  const fetchPendingData = async () => {
    try {
      const [achievementsRes, projectsRes] = await Promise.all([
        achievementsApi.getAll(true),
        projectsApi.getAll(true)
      ]);
      setPendingAchievements(Array.isArray(achievementsRes.data) ? achievementsRes.data : []);
      setPendingProjects(Array.isArray(projectsRes.data) ? projectsRes.data : []);
    } catch (error) {
      console.error("Failed to fetch teacher data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAchievement = async (id: string) => {
    try {
      await achievementsApi.verify(id);
      toast({ title: "Verified", description: "Achievement verified successfully" });
      fetchPendingData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to verify", variant: "destructive" });
    }
  };

  const handleVerifyProject = async (id: string) => {
    try {
      await projectsApi.verify(id);
      toast({ title: "Verified", description: "Project verified successfully" });
      fetchPendingData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to verify", variant: "destructive" });
    }
  };

  const totalPending = pendingAchievements.length + pendingProjects.length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">
          Welcome, {profile.full_name}!
        </h2>
        <p className="text-muted-foreground">
          {isAdmin ? "Manage your school's StudentHub platform" : "Guide and verify student achievements"}
        </p>
      </div>

      <div
        ref={statsRef}
        className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        {[
          { icon: Users, label: "Total Students", value: "24", gradient: "from-primary to-blue-500" }, // Mock value
          { icon: CheckCircle, label: "Pending Verifications", value: totalPending.toString(), gradient: "from-accent to-amber-500" },
          { icon: Calendar, label: "Upcoming Events", value: "3", gradient: "from-secondary to-purple-500" },
          { icon: Upload, label: "Media Items", value: "156", gradient: "from-emerald-500 to-teal-500" }
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className={`transition-all duration-700 ${statsInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
              style={{ transitionDelay: statsInView ? `${index * 50}ms` : '0ms' }}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-2xl font-bold">{stat.value}</span>
                </div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Pending Verifications
              {totalPending > 0 && <Badge variant="destructive">{totalPending}</Badge>}
            </CardTitle>
            <CardDescription>Review and approve student submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="achievements">
              <TabsList>
                <TabsTrigger value="achievements">Achievements ({pendingAchievements.length})</TabsTrigger>
                <TabsTrigger value="projects">Projects ({pendingProjects.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="achievements" className="mt-4">
                {loading ? <div className="text-center py-4">Loading...</div> : pendingAchievements.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No pending achievements</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingAchievements.map(item => (
                      <div key={item.id} className="flex justify-between items-center p-4 border rounded-lg bg-slate-50">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold">{item.title}</h4>
                            <Badge variant="outline">{item.student_name}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">Date: {new Date(item.date_earned).toLocaleDateString()}</p>
                        </div>
                        <Button size="sm" onClick={() => handleVerifyAchievement(item.id.toString())}>Verify</Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="projects" className="mt-4">
                {loading ? <div className="text-center py-4">Loading...</div> : pendingProjects.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>No pending projects</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingProjects.map(item => (
                      <div key={item.id} className="flex justify-between items-center p-4 border rounded-lg bg-slate-50">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold">{item.title}</h4>
                            <Badge variant="outline">{item.student_name}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>
                          <div className="flex gap-2 mt-1">
                            {item.thumbnail_url && (
                              <img src={item.thumbnail_url} alt="Thumbnail" className="w-16 h-10 object-cover rounded" />
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => window.open(`/projects/${item.id}`, '_blank')}>View</Button>
                          <Button size="sm" onClick={() => handleVerifyProject(item.id.toString())}>Verify</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeacherDashboard;