import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CheckCircle, Calendar, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

const TeacherDashboard = ({ profile }: { profile: any }) => {
  const isAdmin = profile.role === "admin";

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

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { icon: Users, label: "Total Students", value: "0", gradient: "from-primary to-blue-500" },
          { icon: CheckCircle, label: "Pending Verifications", value: "0", gradient: "from-accent to-amber-500" },
          { icon: Calendar, label: "Upcoming Events", value: "0", gradient: "from-secondary to-purple-500" },
          { icon: Upload, label: "Media Items", value: "0", gradient: "from-emerald-500 to-teal-500" }
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

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pending Verifications</CardTitle>
            <CardDescription>Review and approve student submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No pending verifications</p>
              <p className="text-sm mt-2">Student submissions will appear here for review</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Event Management</CardTitle>
                <CardDescription>Create and manage school events</CardDescription>
              </div>
              <Button size="sm">Create Event</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No events scheduled</p>
              <p className="text-sm mt-2">Create events to engage students and document activities</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeacherDashboard;