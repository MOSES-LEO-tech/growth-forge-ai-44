import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, Check, X, Flag, Star, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface PortfolioModerationWidgetProps {
  className?: string;
  defaultExpanded?: boolean;
  schoolId?: number;
}

interface ProjectRecord {
  id: number;
  title: string;
  studentName: string;
  status: string;
  featured: boolean;
  flagged: boolean;
  submittedAt: string;
}

export function PortfolioModerationWidget({ className = "", defaultExpanded = false, schoolId }: PortfolioModerationWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [searchTerm, setSearchTerm] = useState("");
  const [projects, setProjects] = useState<ProjectRecord[]>([]);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!schoolId) {
        setLoading(false);
        return;
      }
      
      setTimeout(() => {
        setProjects([
          { id: 1, title: "AI-powered Garden Monitor", studentName: "John Smith", status: "pending", featured: false, flagged: false, submittedAt: "2026-02-20" },
          { id: 2, title: "Sustainable Energy Project", studentName: "Jane Doe", status: "approved", featured: true, flagged: false, submittedAt: "2026-02-18" },
          { id: 3, title: "Mobile App Development", studentName: "Mike Johnson", status: "pending", featured: false, flagged: true, submittedAt: "2026-02-15" },
          { id: 4, title: "Robotics Competition Entry", studentName: "Sarah Williams", status: "approved", featured: false, flagged: false, submittedAt: "2026-02-10" },
        ]);
        setLoading(false);
      }, 500);
    };

    fetchProjects();
  }, [schoolId]);

  if (!schoolId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Portfolio Moderation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No school assigned to your account.</p>
        </CardContent>
      </Card>
    );
  }

  const pendingCount = projects.filter(p => p.status === "pending").length;
  const flaggedCount = projects.filter(p => p.flagged).length;

  return (
    <Card className={className}>
      <CardHeader 
        className="cursor-pointer" 
        onClick={() => setExpanded(!expanded)}
      >
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Portfolio Moderation
          </div>
          <div className="flex gap-2 text-sm">
            {pendingCount > 0 && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">{pendingCount} pending</span>
            )}
            {flaggedCount > 0 && (
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full">{flaggedCount} flagged</span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      {expanded && (
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search projects..." 
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {projects.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase())).map(project => (
                  <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{project.title}</p>
                        {project.featured && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                        {project.flagged && <Flag className="h-4 w-4 text-red-500" />}
                      </div>
                      <p className="text-sm text-muted-foreground">{project.studentName} · {project.submittedAt}</p>
                    </div>
                    <div className="flex gap-2">
                      {project.status === "pending" && (
                        <>
                          <Button size="sm" variant="ghost" className="text-green-600">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-600">
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost">
                        <Star className={`h-4 w-4 ${project.featured ? 'text-yellow-500 fill-yellow-500' : ''}`} />
                      </Button>
                      <Button size="sm" variant="ghost" className={project.flagged ? 'text-red-500' : ''}>
                        <Flag className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
