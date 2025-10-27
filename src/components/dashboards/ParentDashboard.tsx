import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Award, Calendar } from "lucide-react";

const ParentDashboard = ({ profile }: { profile: any }) => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Welcome, {profile.full_name}!</h2>
        <p className="text-muted-foreground">Monitor your child's growth and achievements</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { icon: Users, label: "Connected Students", value: "1", gradient: "from-primary to-blue-500" },
          { icon: Award, label: "Total Achievements", value: "0", gradient: "from-accent to-amber-500" },
          { icon: Calendar, label: "Events This Month", value: "0", gradient: "from-secondary to-purple-500" },
          { icon: TrendingUp, label: "Growth Trend", value: "↑ 15%", gradient: "from-emerald-500 to-teal-500" }
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${index * 50}ms` }}>
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
    </div>
  );
};

export default ParentDashboard;