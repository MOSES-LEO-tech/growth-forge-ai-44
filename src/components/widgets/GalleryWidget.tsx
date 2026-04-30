import { useState, useEffect } from "react";
import { getGalleryEvents, createEvent, deleteEvent, uploadMedia } from "@/lib/supabase/gallery";
import type { GalleryEvent, GalleryMedia } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExpandableWidget } from "@/components/ExpandableWidget";
import { Loader2, Plus, Image as ImageIcon, Video, Trash2, Search } from "lucide-react";

interface GalleryItem {
    id: number;
    title: string;
    description: string;
    media_type: 'image' | 'video';
    media_url: string;
    thumbnail_url?: string;
    visibility: 'private' | 'public' | 'parents';
    created_at: string;
}

interface GalleryWidgetProps {
    className?: string;
    defaultExpanded?: boolean;
    userId?: string;
    openUploadExternal?: boolean;
    onOpenUploadChange?: (open: boolean) => void;
}

export function GalleryWidget({ className, defaultExpanded, userId, openUploadExternal, onOpenUploadChange }: GalleryWidgetProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [internalOpenUpload, setInternalOpenUpload] = useState(false);
    const isControlled = openUploadExternal !== undefined;
    const openUpload = isControlled ? openUploadExternal : internalOpenUpload;
    const setOpenUpload = isControlled
        ? (onOpenUploadChange ?? (() => {}))
        : setInternalOpenUpload;
    const [searchQuery, setSearchQuery] = useState("");

    // Upload Form State
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [visibility, setVisibility] = useState('private');

    // Lightbox State
    const [selectedMedia, setSelectedMedia] = useState<any | null>(null);

    const fetchItems = async () => {
        try {
            if (!user) return;
            const targetId = userId || user.id;
            const events = await getGalleryEvents(targetId);
            setItems(events);
        } catch (error) {
            console.error('Error fetching gallery:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, [userId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !user) {
            toast({ title: "Error", description: "Please select a file", variant: "destructive" });
            return;
        }

        setUploading(true);
        try {
            // 1. Create event
            const event = await createEvent({
                user_id: user.id,
                title,
                description,
                is_public: visibility === 'public'
            });

            // 2. Upload media
            await uploadMedia(event.id, file);

            toast({ title: "Success", description: "Item added to gallery" });
            setOpenUpload(false);
            resetForm();
            fetchItems();
        } catch (error: any) {
            console.error('Upload failed:', error);
            toast({ title: "Error", description: error.message || "Failed to upload item", variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    const resetForm = () => {
        setFile(null);
        setTitle('');
        setDescription('');
        setVisibility('private');
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this item?")) return;
        try {
            await deleteEvent(id);
            setItems(items.filter(item => item.id !== id));
            toast({ title: "Deleted", description: "Item removed" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete item", variant: "destructive" });
        }
    };

    const filteredItems = items.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const photos = filteredItems.filter(i => i.media_type === 'image');
    const videos = filteredItems.filter(i => i.media_type === 'video');

    // Collapsed view - shown in the card
    const collapsedContent = (
        <div className="flex flex-col h-full gap-4 min-w-0">
            <div className="grid h-full max-h-[150px] min-w-0 grid-cols-3 gap-2">
                {items.slice(0, 4).map((item) => (
                    <div
                        key={item.id}
                        className={`group relative cursor-pointer overflow-hidden rounded-md bg-muted ${items.indexOf(item) === 0 ? 'col-span-2 row-span-2' : 'aspect-square'}`}
                        onClick={() => setSelectedMedia(item)}
                    >
                        {item.media_type === 'video' ? (
                            <div className="w-full h-full bg-black/10 flex items-center justify-center">
                                <Video className="w-6 h-6 text-muted-foreground" />
                            </div>
                        ) : (
                            <img
                                src={item.thumbnail_url || item.media_url}
                                alt={item.title}
                                className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                            />
                        )}
                    </div>
                ))}
                {items.length === 0 && (
                    <div className="col-span-3 flex h-full flex-col items-center justify-center rounded-md bg-muted/30 text-muted-foreground">
                        <ImageIcon className="w-8 h-8 opacity-50 mb-2" />
                        <span className="text-xs">No photos yet</span>
                    </div>
                )}
            </div>
            <div className="mt-auto">
                <Button className="w-full" size="sm" variant="outline" onClick={() => setOpenUpload(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Upload Media
                </Button>
            </div>
        </div>
    );

    // Expanded view - shown in the dialog
    const expandedContent = (
        <div className="flex flex-col h-full gap-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search gallery..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Button onClick={() => setOpenUpload(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add New Item
                </Button>
            </div>

            <Tabs defaultValue="all" className="flex-1 flex flex-col">
                <TabsList className="grid w-full max-w-md grid-cols-3 self-center md:self-start mb-4">
                    <TabsTrigger value="all">All Items</TabsTrigger>
                    <TabsTrigger value="photos">Photos</TabsTrigger>
                    <TabsTrigger value="videos">Videos</TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1 -mx-2 px-2 overflow-hidden">
                    <TabsContent value="all" className="mt-0">
                        <GalleryGrid items={filteredItems} onDelete={handleDelete} onSelectMedia={setSelectedMedia} />
                    </TabsContent>
                    <TabsContent value="photos" className="mt-0">
                        <GalleryGrid items={photos} onDelete={handleDelete} onSelectMedia={setSelectedMedia} />
                    </TabsContent>
                    <TabsContent value="videos" className="mt-0">
                        <GalleryGrid items={videos} onDelete={handleDelete} onSelectMedia={setSelectedMedia} />
                    </TabsContent>
                </ScrollArea>
            </Tabs>
        </div>
    );

    return (
        <>
            <ExpandableWidget
                title="Personal Gallery"
                icon={<ImageIcon className="w-5 h-5 text-purple-500" />}
                className={className}
                defaultExpanded={defaultExpanded}
                expandedContent={expandedContent}
            >
                {collapsedContent}
            </ExpandableWidget>

            {/* Upload Dialog - rendered outside ExpandableWidget to prevent blink */}
            <Dialog open={openUpload} onOpenChange={(open) => { setOpenUpload(open); if (!open) resetForm(); }}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Add to Gallery</DialogTitle>
                        <DialogDescription>Upload a photo or video to share.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpload} className="space-y-4">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="media">Media File</Label>
                            <Input id="media" type="file" accept="image/*,video/*" onChange={handleFileChange} required />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="My Awesome Project" required />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="desc">Description</Label>
                            <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this about?" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="vis">Visibility</Label>
                            <Select value={visibility} onValueChange={setVisibility}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select visibility" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="private">Private (Only Me)</SelectItem>
                                    <SelectItem value="parents">Parents Only</SelectItem>
                                    <SelectItem value="public">Public</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter>
                            <Button type="submit" disabled={uploading}>
                                {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : 'Upload Item'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Lightbox Dialog for Fullscreen Preview */}
            <Dialog open={!!selectedMedia} onOpenChange={(open) => { if (!open) setSelectedMedia(null); }}>
                <DialogContent className="sm:max-w-5xl bg-black/95 border-none p-0 overflow-hidden flex flex-col justify-center items-center h-[90vh]">
                    <DialogTitle className="sr-only">Media Preview</DialogTitle>
                    <div className="absolute top-4 left-4 z-50 text-white">
                        <h3 className="font-semibold drop-shadow-md">{selectedMedia?.title}</h3>
                        <p className="text-sm opacity-80 drop-shadow-md">{selectedMedia?.description}</p>
                    </div>
                    {selectedMedia?.media_type === 'video' ? (
                        <video
                            src={selectedMedia.media_url}
                            controls
                            autoPlay
                            className="max-w-full max-h-full object-contain"
                        />
                    ) : selectedMedia?.media_type === 'image' ? (
                        <img
                            src={selectedMedia.media_url}
                            alt={selectedMedia.title}
                            className="max-w-full max-h-[90vh] object-contain"
                        />
                    ) : null}
                </DialogContent>
            </Dialog>
        </>
    );
}

function GalleryGrid({ items, onDelete, onSelectMedia }: { items: GalleryItem[], onDelete: (id: number) => void, onSelectMedia: (item: GalleryItem) => void }) {
    if (items.length === 0) {
        return <div className="text-center py-12 text-muted-foreground">No items found.</div>;
    }

    return (
        <div className="grid min-w-0 grid-cols-1 gap-5 pb-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {items.map((item, index) => (
                <Card
                    key={item.id}
                    className={`media-tile group relative flex min-w-0 cursor-pointer flex-col ${index === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}
                    onClick={() => onSelectMedia(item)}
                >
                    <div className={`${index === 0 ? 'aspect-[4/3]' : 'aspect-square'} relative w-full shrink-0 overflow-hidden bg-muted`}>
                        {item.media_type === 'video' ? (
                            <div className="w-full h-full flex items-center justify-center bg-black/5">
                                <Video className="w-12 h-12 text-muted-foreground opacity-50" />
                            </div>
                        ) : (
                            <img src={item.media_url} alt={item.title} className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105" />
                        )}
                        <div className="absolute top-2 right-2">
                            <Badge variant={item.visibility === 'public' ? 'default' : 'secondary'} className="opacity-90">
                                {item.visibility}
                            </Badge>
                        </div>
                    </div>
                    <CardContent className="p-4 flex flex-col justify-between flex-1 min-w-0">
                        <div>
                            <h3 className="font-semibold truncate" title={item.title}>{item.title}</h3>
                            <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-2 border-t text-muted-foreground">
                            <span className="text-xs">{new Date(item.created_at).toLocaleDateString()}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10 z-10"
                                onClick={(e) => {
                                    e.stopPropagation(); // prevent opening lightbox when deleting
                                    onDelete(item.id);
                                }}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
