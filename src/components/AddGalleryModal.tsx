import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImagePlus, Loader2 } from "lucide-react";
import { createEvent, uploadMedia } from "@/lib/supabase/gallery";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

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
    media_type: "image" as "image" | "video",
    media_url: "",
    event_date: ""
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm({ ...form, [field]: value });
  };

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    if (file) {
      // Auto-detect media type
      if (file.type.startsWith("image/")) {
        setForm({ ...form, media_type: "image" });
      } else if (file.type.startsWith("video/")) {
        setForm({ ...form, media_type: "video" });
      }
    }
  };

  const handleUrlChange = (url: string) => {
    setForm({ ...form, media_url: url });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.media_url && !selectedFile) {
      toast({
        title: "Error",
        description: "Please provide a media URL or upload a file",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Create event
      const event = await createEvent({
        user_id: userId,
        title: form.title,
        description: form.description,
        is_public: true // Default to public for now as per original gallery logic
      });

      // 2. Upload file if selected
      if (selectedFile) {
        setUploading(true);
        await uploadMedia(event.id, selectedFile);
        setUploading(false);
      }

      toast({
        title: "Success!",
        description: "Gallery item added successfully",
        className: "bg-green-500 text-white"
      });

      setForm({ title: "", description: "", media_type: "image", media_url: "", event_date: "" });
      setSelectedFile(null);
      setUploadProgress(0);
      setOpen(false);
      onItemAdded?.();
    } catch (error: any) {
      console.error("Gallery upload error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add gallery item",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
          <ImagePlus className="w-4 h-4" />
          Add to Gallery
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Add to Gallery</DialogTitle>
          <DialogDescription>
            Upload photos or videos from your events and achievements
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Media Upload */}
          <div className="space-y-2">
            <Label>Media *</Label>
            <FileUpload
              accept="image/*,video/*"
              maxSize={50}
              onFileSelect={handleFileSelect}
              onUrlChange={handleUrlChange}
              preview={true}
            />
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Media Type */}
          <div className="space-y-2">
            <Label htmlFor="media_type">Media Type</Label>
            <Select value={form.media_type} onValueChange={(value) => handleChange("media_type", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image">📷 Photo</SelectItem>
                <SelectItem value="video">🎥 Video</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Event Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Event Name *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Science Fair 2024"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event_date">Event Date *</Label>
              <Input
                id="event_date"
                type="date"
                value={form.event_date}
                onChange={(e) => handleChange("event_date", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Describe the event and what made it special..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading || uploading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || uploading}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {loading || uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploading ? "Uploading..." : "Adding..."}
                </>
              ) : (
                "Add to Gallery"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
