import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, Trophy, Brain, HardDrive, FolderOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getSchoolMetrics } from "@/lib/supabase/schools";

interface SchoolOverviewWidgetProps {
  className?: string;
  defaultExpanded?: boolean;
  schoolId?: number;
}

interface SchoolMetrics {
  totalStudents: number;
  totalTeachers: number;
  totalParents: number;
  totalProjects: number;
  achievementCompletions: number;
  aiUsageCount: number;
  storageUsed: number;
}

export function SchoolOverviewWidget({ className = "", defaultExpanded = false, schoolId }: SchoolOverviewWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<SchoolMetrics | null>(null);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!schoolId) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        const data = await getSchoolMetrics(String(schoolId));
        setMetrics(data);
      } catch (err) {
        console.error('Failed to fetch school overview:', err);
        setError('Failed to load metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [schoolId]);

  if (!schoolId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            School Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No school assigned to your account.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader 
        className="cursor-pointer" 
        onClick={() => setExpanded(!expanded)}
      >
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          School Overview
        </CardTitle>
      </CardHeader>
      {expanded && (
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : metrics ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col items-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                <Users className="h-6 w-6 text-blue-600 mb-2" />
                <span className="text-2xl font-bold">{metrics.totalStudents}</span>
                <span className="text-xs text-muted-foreground">Students</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-lg bg-green-50 dark:bg-green-950">
                <BookOpen className="h-6 w-6 text-green-600 mb-2" />
                <span className="text-2xl font-bold">{metrics.totalTeachers}</span>
                <span className="text-xs text-muted-foreground">Teachers</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-lg bg-purple-50 dark:bg-purple-950">
                <Trophy className="h-6 w-6 text-purple-600 mb-2" />
                <span className="text-2xl font-bold">{metrics.achievementCompletions}</span>
                <span className="text-xs text-muted-foreground">Achievements</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-lg bg-orange-50 dark:bg-orange-950">
                <Brain className="h-6 w-6 text-orange-600 mb-2" />
                <span className="text-2xl font-bold">{metrics.aiUsageCount}</span>
                <span className="text-xs text-muted-foreground">Guidance Requests</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950">
                <HardDrive className="h-6 w-6 text-yellow-600 mb-2" />
                <span className="text-2xl font-bold">{metrics.storageUsed}GB</span>
                <span className="text-xs text-muted-foreground">Storage</span>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Unable to load metrics.</p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
