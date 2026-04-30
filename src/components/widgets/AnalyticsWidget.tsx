import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, FileText, Download, Users, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface AnalyticsWidgetProps {
  className?: string;
  defaultExpanded?: boolean;
  schoolId?: number;
}

interface ReportType {
  id: string;
  name: string;
  description: string;
  lastGenerated?: string;
}

export function AnalyticsWidget({ className = "", defaultExpanded = false, schoolId }: AnalyticsWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [reports, setReports] = useState<ReportType[]>([]);

  useEffect(() => {
    const fetchReports = async () => {
      if (!schoolId) {
        setLoading(false);
        return;
      }
      
      setTimeout(() => {
        setReports([
          { id: "student-performance", name: "Student Performance Report", description: "Overall academic performance and growth metrics", lastGenerated: "2026-02-20" },
          { id: "teacher-engagement", name: "Teacher Engagement Report", description: "Teacher activity and student interaction metrics", lastGenerated: "2026-02-18" },
          { id: "guidance-usage", name: "Guidance Usage Report", description: "Guidance feature adoption and usage patterns", lastGenerated: "2026-02-15" },
          { id: "growth-analytics", name: "Growth Analytics", description: "Student growth over time and achievement trends", lastGenerated: "2026-02-10" },
        ]);
        setLoading(false);
      }, 500);
    };

    fetchReports();
  }, [schoolId]);

  if (!schoolId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics & Reports
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
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics & Reports
          </div>
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); }}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
        </CardTitle>
      </CardHeader>
      {expanded && (
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map(report => (
                <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      {report.id === "student-performance" ? <Users className="h-5 w-5 text-blue-600" /> :
                       report.id === "teacher-engagement" ? <Users className="h-5 w-5 text-green-600" /> :
                       report.id === "guidance-usage" ? <BarChart3 className="h-5 w-5 text-purple-600" /> :
                       <FileText className="h-5 w-5 text-orange-600" />}
                    </div>
                    <div>
                      <p className="font-medium">{report.name}</p>
                      <p className="text-sm text-muted-foreground">{report.description}</p>
                      {report.lastGenerated && (
                        <p className="text-xs text-muted-foreground mt-1">Last generated: {report.lastGenerated}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      View
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
