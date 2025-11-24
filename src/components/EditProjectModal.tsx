import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { projects } from "@/services/api";

interface EditProjectModalProps {
    project: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onProjectUpdated?: () => void;
}

export default function EditProjectModal({ project, open, onOpenChange, onProjectUpdated }: EditProjectModalProps) {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const [form, setForm] = useState({
        title: "",
        description: "",
        start_date: "",
        end_date: "",
        status: "pending" as "pending" | "ongoing" | "complete"
    });

    // Initialize form with project data when modal opens
    useEffect(() => {
        if (project && open) {
            setForm({
                title: project.title || "",
                description: project.description || "",
                start_date: project.start_date ? project.start_date.split('T')[0] : "",
                end_date: project.end_date ? project.end_date.split('T')[0] : "",
                status: project.status || "pending"
            });
        }
    }, [project, open]);

    const handleChange = (field: string, value: string) => {
        setForm({ ...form, [field]: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await projects.update(project.id, {
                title: form.title,
                description: form.description,
                start_date: form.start_date,
                end_date: form.end_date || null,
                status: form.status
            });

            toast({
                title: "Success!",
                description: "Project updated successfully",
                className: "bg-green-500 text-white"
            });

            onOpenChange(false);
            onProjectUpdated?.();
        } catch (error: any) {
            console.error("Project update error:", error);
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to update project",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Edit Project</DialogTitle>
                    <DialogDescription>
                        Update your project details and track your progress
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="title">Project Title *</Label>
                        <Input
                            id="title"
                            value={form.title}
                            onChange={(e) => handleChange("title", e.target.value)}
                            placeholder="My Awesome Project"
                            required
                            className="text-base"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={form.description}
                            onChange={(e) => handleChange("description", e.target.value)}
                            placeholder="Describe your project goals, technologies used, and what you learned..."
                            rows={4}
                            className="resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="start_date">Start Date *</Label>
                            <Input
                                id="start_date"
                                type="date"
                                value={form.start_date}
                                onChange={(e) => handleChange("start_date", e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="end_date">End Date</Label>
                            <Input
                                id="end_date"
                                type="date"
                                value={form.end_date}
                                onChange={(e) => handleChange("end_date", e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select value={form.status} onValueChange={(value) => handleChange("status", value)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pending">📋 Pending</SelectItem>
                                <SelectItem value="ongoing">🚀 In Progress</SelectItem>
                                <SelectItem value="complete">✅ Completed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                "Update Project"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
