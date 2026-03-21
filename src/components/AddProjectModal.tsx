import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, UploadCloud } from "lucide-react";
import { createProject, updateProject } from "@/lib/supabase/projects";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddProjectModalProps {
  userId: string;
  onProjectAdded?: () => void;
}

export default function AddProjectModal({ userId, onProjectAdded }: AddProjectModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    title: "",
    description: "",
    start_date: "",
    status: "pending" as "pending" | "ongoing" | "complete"
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create the project
      const project = await createProject({
        owner_id: userId,
        title: form.title,
        description: form.description,
        start_date: form.start_date || new Date().toISOString(),
      });

      const projectId = project.id;

      // 2. Upload file if selected
      if (file && projectId) {
        setUploadProgress(1); // Indicate start
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${projectId}/${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('project-media')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('project-media')
          .getPublicUrl(filePath);

        // Media uploaded - could link via media_id in future
        // For now just upload to storage
      }

      toast({
        title: "Success!",
        description: "Project added successfully",
        className: "bg-green-500 text-white"
      });

      setForm({ title: "", description: "", start_date: "", status: "pending" });
      setFile(null);
      setUploadProgress(0);
      setOpen(false);
      onProjectAdded?.();
    } catch (error: any) {
      console.error("Project creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add project",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create New Project</DialogTitle>
          <DialogDescription>
            Track your work, showcase your skills, and demonstrate growth
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
          </div>

          {/* File Upload Section */}
          <div className="space-y-2">
            <Label htmlFor="file_upload">Attach File (Optional)</Label>
            <div className="flex items-center gap-3">
              <Input
                id="file_upload"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="flex-1"
                accept="image/*,video/*,.pdf,.doc,.docx"
              />
            </div>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <p className="text-xs text-blue-500">Uploading file: {uploadProgress}%</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
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
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
