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

      // Then add media item linked to the event
      const { error: mediaError } = await supabase
        .from("media_items")
        .insert([{
          title: form.title,
          description: form.description,
          media_type: form.media_type,
          media_url: form.media_url,
          event_id: eventData.id,
          uploaded_by: userId
        }]);

      if (mediaError) throw mediaError;

      toast({
        title: "Success!",
        description: "Gallery item added successfully"
      });

      setForm({ title: "", description: "", media_type: "photo", media_url: "", event_date: "" });
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
            <Label htmlFor="media_url">Media URL</Label>
            <Input
              id="media_url"
              value={form.media_url}
              onChange={(e) => handleChange("media_url", e.target.value)}
              placeholder="https://example.com/image.jpg"
              required
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
