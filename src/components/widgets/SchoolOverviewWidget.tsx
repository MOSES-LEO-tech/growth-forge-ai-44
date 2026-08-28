import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, Trophy, Brain, HardDrive, FolderOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getSchoolMetrics } from "@/lib/supabase/schools";

interface SchoolOverviewWidgetProps {
  className?: string;
  defaultExpanded?: boolean;
  schoolId?: string | null;
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
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-5">
              {[
                { icon: Users, label: "Students", value: String(metrics.totalStudents) },
                { icon: BookOpen, label: "Teachers", value: String(metrics.totalTeachers) },
                { icon: Trophy, label: "Achievements", value: String(metrics.achievementCompletions) },
                { icon: Brain, label: "Guidance Requests", value: String(metrics.aiUsageCount) },
                { icon: HardDrive, label: "Storage", value: `${metrics.storageUsed}GB` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex flex-col gap-1.5 bg-card p-4">
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-2xl font-semibold leading-none tabular-nums tracking-tight">
                    {value}
                  </span>
                  <span className="caps-label text-[10px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Unable to load metrics.</p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
