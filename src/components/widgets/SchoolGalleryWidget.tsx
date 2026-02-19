import { useState, useEffect } from "react";
import { schoolGallery, upload } from "@/services/api";
import { ExpandableWidget } from "@/components/ExpandableWidget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Plus, Image as ImageIcon, Video, Calendar, MapPin, Trash2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SchoolEvent {
    id: string;
    title: string;
    description: string;
    event_date: string;
    location: string;
    media_count?: number;
    thumbnail_url?: string;
}

interface SchoolGalleryWidgetProps {
    className?: string;
    defaultExpanded?: boolean;
}

export function SchoolGalleryWidget({ className, defaultExpanded }: SchoolGalleryWidgetProps) {
    const { toast } = useToast();
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

    // Create Event Form
    const [newEvent, setNewEvent] = useState({ title: '', description: '', date: '', location: '' });
    const [creating, setCreating] = useState(false);

    // Upload Media Form
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const fetchEvents = async () => {
        try {
            const response = await schoolGallery.getAll();
            setEvents(response.data.events || response.data || []);
        } catch (error) {
            console.error("Failed to fetch school events", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            await schoolGallery.create({
                title: newEvent.title,
                description: newEvent.description,
                eventDate: newEvent.date,
                location: newEvent.location
            });
            toast({ title: "Success", description: "Event created successfully" });
            setCreateOpen(false);
            setNewEvent({ title: '', description: '', date: '', location: '' });
            fetchEvents();
        } catch (error) {
            toast({ title: "Error", description: "Failed to create event", variant: "destructive" });
        } finally {
            setCreating(false);
        }
    };

    const handleUploadMedia = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !selectedEventId) return;
        setUploading(true);
        try {
            const uploadRes = await upload.uploadFile(file);
            const { url } = uploadRes.data;

            await schoolGallery.addMedia(selectedEventId, {
                media_type: file.type.startsWith('video') ? 'video' : 'image',
                media_url: url
            });

            toast({ title: "Success", description: "Media added to event" });
            setUploadOpen(false);
            setFile(null);
            fetchEvents();
        } catch (error) {
            toast({ title: "Error", description: "Failed to upload media", variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteEvent = async (id: string) => {
        if (!confirm("Are you sure? This will delete the event and all its media.")) return;
        try {
            await schoolGallery.delete(id);
            toast({ title: "Deleted", description: "Event deleted" });
            fetchEvents();
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete event", variant: "destructive" });
        }
    }

    const CollapsedContent = () => (
        <div className="flex flex-col h-full gap-4">
            <div className="flex-1 space-y-2">
                {events.length > 0 ? (
                    events.slice(0, 2).map(event => (
                        <div key={event.id} className="text-sm bg-muted/40 p-2 rounded">
                            <div className="font-semibold truncate">{event.title}</div>
                            <div className="flex items-center text-xs text-muted-foreground gap-2">
                                <Calendar className="w-3 h-3" />
                                {new Date(event.event_date).toLocaleDateString()}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center text-muted-foreground text-sm py-4">No events scheduled</div>
                )}
            </div>
            <Button size="sm" className="w-full mt-auto" onClick={(e) => { e.stopPropagation(); setCreateOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" /> New Event
            </Button>
        </div>
    );

    const ExpandedContent = () => (
        <div className="flex flex-col h-full gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold">School Events Manager</h3>
                    <p className="text-sm text-muted-foreground">Manage events and upload gallery photos</p>
                </div>
                <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Create Event
                </Button>
            </div>

            <ScrollArea className="flex-1 pr-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
                    {events.map(event => (
                        <Card key={event.id} className="overflow-hidden hover:shadow-md transition-shadow">
                            <div className="h-32 bg-muted relative">
                                {event.thumbnail_url ? (
                                    <img src={event.thumbnail_url} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-primary/5">
                                        <ImageIcon className="w-8 h-8 text-primary/20" />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 flex gap-1">
                                    <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => { setSelectedEventId(event.id); setUploadOpen(true); }}>
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                    <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteEvent(event.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                            <CardContent className="p-4">
                                <h4 className="font-bold mb-1 truncate">{event.title}</h4>
                                <div className="space-y-1 text-sm text-muted-foreground mb-3">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(event.event_date).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-3 h-3" />
                                        {event.location}
                                    </div>
                                </div>
                                <p className="text-sm line-clamp-2">{event.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </ScrollArea>

            {/* Create Event Dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create School Event</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateEvent} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Event Title</Label>
                            <Input value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Date</Label>
                                <Input type="date" value={newEvent.date} onChange={e => setNewEvent({ ...newEvent, date: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label>Location</Label>
                                <Input value={newEvent.location} onChange={e => setNewEvent({ ...newEvent, location: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={creating}>
                                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Event"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Upload Media Dialog */}
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upload Media to Event</DialogTitle>
                        <DialogDescription>Add photos or videos to this event gallery.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUploadMedia} className="space-y-4">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="media">Media File</Label>
                            <Input id="media" type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={uploading}>
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Upload"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );

    return (
        <ExpandableWidget
            title="School Gallery"
            icon={<ImageIcon className="w-5 h-5 text-purple-500" />}
            className={className}
            defaultExpanded={defaultExpanded}
            expandedContent={<ExpandedContent />}
        >
            <CollapsedContent />
        </ExpandableWidget>
    );
}
