import { Calendar, Users, TrendingUp, Image as ImageIcon, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import type { Project } from "@/services/api";

interface ProjectCardProps {
  project: Project;
}

const ProjectCard = ({ project }: ProjectCardProps) => {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'ongoing':
        return 'bg-blue-500';
      case 'complete':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'New';
      case 'ongoing':
        return 'Ongoing';
      case 'complete':
        return 'Completed';
      default:
        return status;
    }
  };

  // Calculate mock progress based on status
  const progress = project.status === 'complete' ? 100 :
    project.status === 'ongoing' ? 60 : 10;

  return (
    <Card
      className="overflow-hidden flex flex-col cursor-pointer group hover:shadow-lg transition-all duration-300"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      {/* Thumbnail or Media Indicator */}
      {project.thumbnail_url && (
        <div className="w-full h-32 bg-muted relative overflow-hidden shrink-0 border-b">
          {!project.thumbnail_url.endsWith('.pdf') && !project.thumbnail_url.includes('word') ? (
            <img
              src={project.thumbnail_url}
              alt={project.title}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-primary/5">
              <FileText className="w-8 h-8 mb-2 opacity-60" />
              <span className="text-xs font-semibold uppercase">Document</span>
            </div>
          )}
        </div>
      )}

      <CardHeader className={project.thumbnail_url ? "pt-4" : ""}>
        <div className="flex items-start justify-between mb-2">
          <CardTitle className="line-clamp-1 group-hover:text-primary transition-colors">
            {project.title}
          </CardTitle>
          <Badge className={getStatusColor(project.status)}>
            {getStatusLabel(project.status)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {project.description || "No description available"}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Details */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{format(new Date(project.start_date), "MMM dd, yyyy")}</span>
          </div>
          {project.collaborators && project.collaborators.length > 0 && (
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{project.collaborators.length} collaborators</span>
            </div>
          )}
          {project.skills_tracked && Object.keys(project.skills_tracked).length > 0 && (
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>{Object.keys(project.skills_tracked).length} skills</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectCard;
