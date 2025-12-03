import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, Video } from "lucide-react";
import { useHeroVideo } from "@/hooks/useHeroVideo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function HeroVideoUploader() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { videoUrl, uploadVideo, removeVideo } = useHeroVideo();
  const [open, setOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        alert("File size must be less than 100MB");
        return;
      }
      uploadVideo.mutate(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Video className="h-4 w-4" />
          Manage Hero Video
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hero Video Settings</DialogTitle>
          <DialogDescription>
            Upload a video to display as the hero background on the home page.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {videoUrl && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Current Video:</p>
              <video
                src={videoUrl}
                className="w-full h-32 object-cover rounded-lg"
                muted
                autoPlay
                loop
                playsInline
              />
              <Button
                variant="destructive"
                size="sm"
                onClick={() => removeVideo.mutate()}
                disabled={removeVideo.isPending}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Remove Video
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/ogg"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadVideo.isPending}
              className="w-full gap-2"
            >
              <Upload className="h-4 w-4" />
              {uploadVideo.isPending ? "Uploading..." : "Upload New Video"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Supported formats: MP4, WebM, OGG (max 100MB)
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
