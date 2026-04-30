import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getEventDetails, uploadMedia } from '@/lib/supabase/gallery';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Calendar, MapPin, Plus, Image as ImageIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import Navbar from '@/components/Navbar';

interface EventMedia {
  id: number;
  title: string;
  description: string;
  media_type: 'image' | 'video';
  media_url: string;
  uploaded_by: number;
}

interface SchoolEventDetails {
  id: number;
  title: string;
  description: string;
  event_date: string;
  location: string;
  school_name: string;
  media: EventMedia[];
}

const EventGallery = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [event, setEvent] = useState<SchoolEventDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Upload State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (id) fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      if (!id) return;
      const data = await getEventDetails(id);
      setEvent(data as any);
    } catch (error) {
      console.error('Fetch event details error:', error);
      toast({ title: "Error", description: "Failed to load event details", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !id) return;

    setUploading(true);
    try {
      await uploadMedia(id, uploadFile);
      toast({ title: "Success", description: "Media added to event" });
      setIsUploadOpen(false);
      setUploadFile(null);
      fetchEventDetails();
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: "Error", description: "Failed to upload media", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const canUpload = user?.role === 'teacher' || user?.role === 'admin';

  if (loading) return <div className="text-center py-20">Loading...</div>;
  if (!event) return <div className="text-center py-20">Event not found</div>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 pt-24">
        <Button variant="ghost" className="mb-6" onClick={() => navigate('/school/gallery')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Gallery
        </Button>

      <section className="dashboard-hero mb-8">
        <div className="flex justify-between items-start">
          <div>
            <p className="editorial-kicker mb-2">Event record</p>
            <h1 className="mb-3 text-4xl font-semibold">{event.title}</h1>
            <div className="mb-4 flex flex-wrap items-center gap-4 text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {new Date(event.event_date).toLocaleDateString()}</span>
              {event.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {event.location}</span>}
              <span className="rounded bg-secondary px-2 py-0.5 text-sm font-medium text-secondary-foreground">{event.school_name}</span>
            </div>
            <p className="text-lg">{event.description}</p>
          </div>
        </div>
      </section>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Event Media</h2>
        {canUpload && (
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Photos/Videos
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Upload Media</DialogTitle></DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-2">
                  <Label>Select File</Label>
                  <Input
                    type="file"
                    accept="image/*,video/*"
                    onChange={e => setUploadFile(e.target.files?.[0] || null)}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={uploading}>
                    {uploading ? 'Uploading...' : 'Upload'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {event.media && event.media.length > 0 ? (
          event.media.map((item, index) => (
            <Card key={item.id} className={`media-tile group relative bg-muted ${index === 0 ? 'aspect-[4/3] md:col-span-2 md:row-span-2' : 'aspect-square'}`}>
              {item.media_type === 'video' ? (
                <video src={item.media_url} controls className="w-full h-full object-cover" />
              ) : (
                <img
                  src={item.media_url}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                <p className="text-white text-sm truncate w-full">{item.title}</p>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            <ImageIcon className="mx-auto h-12 w-12 opacity-20 mb-2" />
            <p>No media uploaded yet.</p>
          </div>
        )}
      </div>
      </main>
    </div>
  );
};

export default EventGallery;
