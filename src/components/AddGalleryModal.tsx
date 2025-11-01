import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import UploadPanel from "@/components/UploadPanel";

interface AddGalleryModalProps {
  userId: string;
  onItemAdded?: () => void;
}

export default function AddGalleryModal({ userId, onItemAdded }: AddGalleryModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const [form, setForm] = useState({
    title: "",
    description: "",
    media_type: "photo" as "photo" | "video",
    media_url: "",
    event_date: ""
  });
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First create an event
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .insert([{
          title: form.title,
          description: form.description,
          event_date: form.event_date,
          created_by: userId
        }])
        .select()
        .single();

      if (eventError) throw eventError;

      // Handle file uploads if any
      let mediaUrl = form.media_url;
      
      if (selectedFiles.length > 0) {
        const file = selectedFiles[0]; // Use the first file as the primary media
        const filePath = `${userId}/${eventData.id}/${file.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('gallery-media')
          .upload(filePath, file);
          
        if (uploadError) {
          console.error('Error uploading file:', uploadError);
        } else {
          // Get public URL for the uploaded file
          const { data: publicUrlData } = supabase.storage
            .from('gallery-media')
            .getPublicUrl(filePath);
            
          if (publicUrlData) {
            mediaUrl = publicUrlData.publicUrl;
          }
        }
        
        // Upload any additional files
        if (selectedFiles.length > 1) {
          for (let i = 1; i < selectedFiles.length; i++) {
            const additionalFile = selectedFiles[i];
            const additionalFilePath = `${userId}/${eventData.id}/additional/${additionalFile.name}`;
            
            await supabase.storage
              .from('gallery-media')
              .upload(additionalFilePath, additionalFile);
          }
        }
      }

      // Then add media item linked to the event
      const { error: mediaError } = await supabase
        .from("media_items")
        .insert([{
          title: form.title,
          description: form.description,
          media_type: form.media_type,
          media_url: mediaUrl,
          event_id: eventData.id,
          uploaded_by: userId
        }]);

      if (mediaError) throw mediaError;

      toast({
        title: "Success!",
        description: "Gallery item added successfully"
      });

      setForm({ title: "", description: "", media_type: "photo", media_url: "", event_date: "" });
      setSelectedFiles([]);
      setOpen(false);
      onItemAdded?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add gallery item",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2" variant="secondary">
          <ImagePlus className="w-4 h-4" />
          Add to Gallery
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add to Gallery</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Event Name</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="Enter event name"
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Describe the event..."
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="media_type">Media Type</Label>
            <Select value={form.media_type} onValueChange={(value) => handleChange("media_type", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="photo">Photo</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="media_url">Media URL (Optional if uploading files)</Label>
            <Input
              id="media_url"
              value={form.media_url}
              onChange={(e) => handleChange("media_url", e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>
          <div>
            <Label htmlFor="files" className="mb-2 block">Upload Media</Label>
            <UploadPanel 
              onFilesSelected={setSelectedFiles} 
              selectedFiles={selectedFiles} 
            />
          </div>
          <div>
            <Label htmlFor="event_date">Event Date</Label>
            <Input
              id="event_date"
              type="date"
              value={form.event_date}
              onChange={(e) => handleChange("event_date", e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add to Gallery"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
