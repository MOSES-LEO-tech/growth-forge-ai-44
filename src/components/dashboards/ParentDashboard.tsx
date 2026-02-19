import { useEffect, useState } from "react";
import { profile as profileApi } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSearchParams } from "react-router-dom";

// Widget Imports
import { ParentStatsWidget } from "@/components/widgets/ParentStatsWidget";
import { ProjectsWidget } from "@/components/widgets/ProjectsWidget";
import { AchievementsWidget } from "@/components/widgets/AchievementsWidget";
import { GalleryWidget } from "@/components/widgets/GalleryWidget";
import { SchoolGalleryWidget } from "@/components/widgets/SchoolGalleryWidget";

const ParentDashboard = ({ profile }: { profile: any }) => {
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const activeWidget = searchParams.get("widget");

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
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold mb-2">Welcome, {profile.full_name}!</h2>
          <p className="text-muted-foreground">Monitor your child's growth and achievements.</p>
        </div>

        {children.length > 0 && (
          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-sm text-muted-foreground whitespace-nowrap hidden md:block">Viewing:</span>
            <Select value={selectedChildId || ''} onValueChange={setSelectedChildId}>
              <SelectTrigger className="w-full md:w-64">
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

      {/* Main Content Area */}
      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : children.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Welcome to Growth Forge</CardTitle>
            <CardDescription>Link your child's account to start tracking their journey.</CardDescription>
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
        <div className="space-y-6">

          {/* Info Banner if needed */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3 text-blue-800 text-sm">
            <Info className="w-5 h-5 flex-shrink-0" />
            <p>
              You are viewing <strong>{selectedChild.full_name}'s</strong> profile.
              Use the dropdown above to switch between children.
            </p>
          </div>

          {/* Widgets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-[minmax(180px,auto)]">

            {/* 1. Statistics & Overview */}
            <ParentStatsWidget
              className="md:col-span-2 lg:col-span-2"
              studentData={selectedChild}
              defaultExpanded={activeWidget === 'stats'}
            />

            {/* 2. Projects */}
            <ProjectsWidget
              className="md:col-span-2 lg:col-span-2"
              userId={selectedChildId || undefined}
              defaultExpanded={activeWidget === 'projects'}
            />

            {/* 3. Achievements */}
            <AchievementsWidget
              className="md:col-span-2 lg:col-span-2"
              userId={selectedChildId || undefined}
              defaultExpanded={activeWidget === 'achievements'}
            />

            {/* 4. Personal Gallery */}
            <GalleryWidget
              className="md:col-span-2 lg:col-span-2"
              userId={selectedChildId || undefined}
              defaultExpanded={activeWidget === 'gallery'}
            />

            {/* 5. School Gallery (Reuse existing, general info) */}
            <SchoolGalleryWidget
              className="md:col-span-1 lg:col-span-1 xl:col-span-1"
              defaultExpanded={activeWidget === 'school'}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ParentDashboard;