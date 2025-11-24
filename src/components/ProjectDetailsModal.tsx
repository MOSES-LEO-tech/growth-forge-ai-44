import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";

interface ProjectDetailsModalProps {
    project: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function ProjectDetailsModal({ project, open, onOpenChange }: ProjectDetailsModalProps) {
    if (!project) return null;

    const formatDate = (dateString: string) => {
        if (!dateString) return "Not set";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            pending: { label: "📋 Pending", className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" },
            ongoing: { label: "🚀 In Progress", className: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
            complete: { label: "✅ Completed", className: "bg-green-100 text-green-800 hover:bg-green-100" }
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
        return <Badge className={config.className}>{config.label}</Badge>;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <DialogTitle className="text-2xl mb-2">{project.title}</DialogTitle>
                            <DialogDescription className="text-base">
                                Project Details
                            </DialogDescription>
                        </div>
                        {getStatusBadge(project.status)}
                    </div>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Description */}
                    {project.description && (
                        <div>
                            <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Description</h3>
                            <p className="text-base leading-relaxed">{project.description}</p>
                        </div>
                    )}

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Start Date
                            </h3>
                            <p className="text-base">{formatDate(project.start_date)}</p>
                        </div>
                        {project.end_date && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    End Date
                                </h3>
                                <p className="text-base">{formatDate(project.end_date)}</p>
                            </div>
                        )}
                    </div>

                    {/* Skills (if available) */}
                    {project.skills && project.skills.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Skills</h3>
                            <div className="flex flex-wrap gap-2">
                                {project.skills.map((skill: string, index: number) => (
                                    <Badge key={index} variant="secondary">{skill}</Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Metadata */}
                    <div className="pt-4 border-t space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span>Created: {formatDate(project.created_at)}</span>
                        </div>
                        {project.updated_at && project.updated_at !== project.created_at && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                <span>Last updated: {formatDate(project.updated_at)}</span>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
