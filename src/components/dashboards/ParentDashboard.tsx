import { useEffect, useState } from "react";
import { profile as profileApi } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Award, Calendar, BookOpen, GraduationCap } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const ParentDashboard = ({ profile }: { profile: any }) => {
  const { ref: statsRef, isInView: statsInView } = useInView({ threshold: 0.2 });
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      const res = await profileApi.getChildren();
      setChildren(res.data || []);
      if (res.data && res.data.length > 0) {
        setSelectedChildId(res.data[0].id.toString());
      }
    } catch (error) {
      console.error("Failed to fetch children", error);
    } finally {
      setLoading(false);
    }
  };

  const selectedChild = children.find(c => c.id.toString() === selectedChildId);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold mb-2">Welcome, {profile.full_name}!</h2>
          <p className="text-muted-foreground">Monitor your child's growth and achievements</p>
        </div>

        {children.length > 0 && (
          <div className="w-full md:w-64">
            <Select value={selectedChildId || ''} onValueChange={setSelectedChildId}>
              <SelectTrigger>
                <SelectValue placeholder="Select Child" />
              </SelectTrigger>
              <SelectContent>
                {children.map(child => (
                  <SelectItem key={child.id} value={child.id.toString()}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={child.avatar_url} />
                        <AvatarFallback>{child.full_name[0]}</AvatarFallback>
                      </Avatar>
                      {child.full_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : children.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Student Progress Overview</CardTitle>
            <CardDescription>Link your child's account to start tracking their journey</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No students linked yet.</p>
              <p className="text-sm mt-2">Contact your school administrator to link your child's account.</p>
            </div>
          </CardContent>
        </Card>
      ) : selectedChild ? (
        <>
          <div
            ref={statsRef}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            {[
              { icon: BookOpen, label: "Grade", value: selectedChild.grade || 'N/A', gradient: "from-primary to-blue-500" },
              { icon: TrendingUp, label: "GPA", value: selectedChild.gpa || 'N/A', gradient: "from-emerald-500 to-teal-500" },
              { icon: Award, label: "Achievements", value: selectedChild.achievement_count || '0', gradient: "from-accent to-amber-500" },
              { icon: GraduationCap, label: "Target Course", value: selectedChild.intended_course || 'Undecided', gradient: "from-secondary to-purple-500" }
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
                      <span className="text-xl font-bold truncate max-w-[120px]">{stat.value}</span>
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
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest updates from {selectedChild.full_name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Check their specialized dashboard views for more details.
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default ParentDashboard;