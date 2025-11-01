import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import UploadPanel from "@/components/UploadPanel";

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
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Insert project data
      const { data: projectData, error } = await supabase
        .from("projects")
        .insert([{
          owner_id: userId,
          title: form.title,
          description: form.description,
          start_date: form.start_date,
          status: form.status
        }])
        .select();

      if (error) throw error;
      
      // Upload files if any are selected
      if (selectedFiles.length > 0 && projectData) {
        const projectId = projectData[0].id;
        
        for (const file of selectedFiles) {
          const filePath = `${userId}/${projectId}/${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('project-files')
            .upload(filePath, file);
            
          if (uploadError) {
            console.error('Error uploading file:', uploadError);
          }
        }
      }

      toast({
        title: "Success!",
        description: "Project added successfully"
      });

      setForm({ title: "", description: "", start_date: "", status: "pending" });
      setSelectedFiles([]);
      setOpen(false);
      onProjectAdded?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add project",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Project Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="Enter project title"
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Describe your project..."
              rows={4}
            />
          </div>
          <div>
            <Label htmlFor="start_date">Start Date</Label>
            <Input
              id="start_date"
              type="date"
              value={form.start_date}
              onChange={(e) => handleChange("start_date", e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={form.status} onValueChange={(value) => handleChange("status", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="ongoing">In Progress</SelectItem>
                <SelectItem value="complete">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="files" className="mb-2 block">Project Files</Label>
            <UploadPanel 
              onFilesSelected={setSelectedFiles} 
              selectedFiles={selectedFiles} 
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
