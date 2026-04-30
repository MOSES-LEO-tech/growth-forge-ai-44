import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, UploadCloud, X, FileText, Film, Image as ImageIcon } from "lucide-react";
import { createProject, updateProject } from "@/lib/supabase/projects";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { uploadProjectFile } from "@/lib/storage";
import { Progress } from "@/components/ui/progress";

interface AddProjectModalProps {
  userId: string;
  onProjectAdded?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function AddProjectModal({ userId, onProjectAdded, open: controlledOpen, onOpenChange }: AddProjectModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;
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
        status: form.status as any
      });

      const projectId = project.id;

      // 2. Upload file if selected
      if (file && projectId) {
        setUploadProgress(1); // Indicate start
        
        const publicUrl = await uploadProjectFile(file, userId, projectId, {
          onProgress: (p) => setUploadProgress(p)
        });

        // Update project with media URL
        await updateProject(projectId, {
          media_urls: [publicUrl]
        });
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
      {!isControlled && (
        <DialogTrigger asChild>
          <Button size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </DialogTrigger>
      )}
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
          <div className="space-y-3">
            <Label htmlFor="file_upload">Attach File (Optional)</Label>
            {!file ? (
              <div 
                className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => document.getElementById('file_upload')?.click()}
              >
                <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                <p className="text-sm text-slate-600 font-medium">Click to upload or drag and drop</p>
                <p className="text-xs text-slate-400 mt-1">Images, Video (MP4), or PDF up to 10MB</p>
                <input
                  id="file_upload"
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                  accept="image/*,video/mp4,application/pdf"
                />
              </div>
            ) : (
              <div className="flex items-center gap-4 p-3 border border-slate-200 rounded-lg bg-slate-50 relative group">
                <div className="w-12 h-12 rounded bg-white flex items-center justify-center border border-slate-100 overflow-hidden">
                  {file.type.startsWith('image/') ? (
                    <img 
                      src={URL.createObjectURL(file)} 
                      alt="Preview" 
                      className="w-full h-full object-cover" 
                    />
                  ) : file.type === 'application/pdf' ? (
                    <FileText className="w-6 h-6 text-red-500" />
                  ) : file.type.startsWith('video/') ? (
                    <Film className="w-6 h-6 text-blue-500" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-full" 
                  onClick={() => setFile(null)}
                  disabled={loading}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
            
            {uploadProgress > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-blue-600 font-medium">Uploading...</span>
                  <span className="text-slate-500">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-1" />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
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
