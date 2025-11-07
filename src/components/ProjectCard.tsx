import { Calendar, Users, TrendingUp, Paperclip, FileText, FileVideo, Image } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  start_date: string;
  end_date: string | null;
  collaborators: string[] | null;
  skills_tracked: any;
  owner_id?: string;
}

interface ProjectFile {
  name: string;
  url: string;
  type: 'image' | 'video' | 'document';
}

interface ProjectFile {
  name: string;
  url: string;
  type: 'image' | 'video' | 'document';
}

interface ProjectCardProps {
  project: Project;
}

const ProjectCard = ({ project }: ProjectCardProps) => {
  const navigate = useNavigate();
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);

  // Fetch project files
  useEffect(() => {
    const fetchProjectFiles = async () => {
      try {
        // List all files in the project's folder
        const { data, error } = await supabase.storage
          .from('project-files')
          .list(`${project.id}`);

        if (error) {
          console.error('Error fetching project files:', error);
          return;
        }

        if (data && data.length > 0) {
          // Process each file
          const files = await Promise.all(data.map(async (file) => {
            // Get public URL for the file
            const { data: urlData } = await supabase.storage
              .from('project-files')
              .getPublicUrl(`${project.id}/${file.name}`);

            // Determine file type
            const fileType = file.name.match(/\.(jpeg|jpg|png|gif|webp)$/i)
              ? 'image'
              : file.name.match(/\.(mp4|webm|mov|avi)$/i)
                ? 'video'
                : 'document';

            return {
              name: file.name,
              url: urlData.publicUrl,
              type: fileType as 'image' | 'video' | 'document'
            };
          }));

          setProjectFiles(files);
        }
      } catch (error) {
        console.error('Error processing project files:', error);
      }
    };

    fetchProjectFiles();
  }, [project.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'New';
      case 'in_progress':
        return 'Ongoing';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  // Calculate mock progress based on status
  const progress = project.status === 'completed' ? 100 : 
                   project.status === 'in_progress' ? 60 : 10;

  return (
    <Card 
      className="overflow-hidden cursor-pointer group hover:shadow-lg transition-all duration-300"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <CardHeader>
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

        {/* File Previews */}
        {projectFiles.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Paperclip className="w-3 h-3" />
              <span>{projectFiles.length} file{projectFiles.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {projectFiles.slice(0, 3).map((file, index) => (
                <div 
                  key={index} 
                  className="w-12 h-12 rounded-md overflow-hidden border flex items-center justify-center bg-muted"
                  title={file.name}
                >
                  {file.type === 'image' ? (
                    <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                  ) : file.type === 'video' ? (
                    <FileVideo className="w-6 h-6 text-muted-foreground" />
                  ) : (
                    <FileText className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
              ))}
              {projectFiles.length > 3 && (
                <div className="w-12 h-12 rounded-md border flex items-center justify-center bg-muted">
                  <span className="text-xs text-muted-foreground">+{projectFiles.length - 3}</span>
                </div>
              )}
            </div>
          </div>
        )}

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
