import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getGalleryEvents, createEvent, deleteEvent, uploadMedia, getGalleryFolders } from "@/lib/supabase/gallery";
import type { GalleryFolder } from "@/integrations/supabase/types";
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
import { MediaDisplay } from "@/components/MediaDisplay";
import { FileText, Loader2, Plus, Image as ImageIcon, Video, Trash2, Search } from "lucide-react";

interface GalleryItem {
    id: string;
    title: string;
    description: string;
    media_type: 'image' | 'video' | 'document';
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
    const [widgetExpanded, setWidgetExpanded] = useState(defaultExpanded);
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
    const [folders, setFolders] = useState<GalleryFolder[]>([]);
    const [uploadFolderId, setUploadFolderId] = useState('none');
    const [tagsText, setTagsText] = useState('');

    // Lightbox State
    const [selectedMedia, setSelectedMedia] = useState<any | null>(null);

    const fetchItems = async () => {
        try {
            const targetId = userId || user?.id;
            if (!targetId) return;
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
        const targetId = userId || user?.id;
        if (targetId) {
            getGalleryFolders(targetId).then(setFolders).catch(() => {});
        }
    }, [userId, user?.id]);

    useEffect(() => {
        if (defaultExpanded) {
            setWidgetExpanded(true);
        }
    }, [defaultExpanded]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        const targetId = userId || user?.id;
        if (!file || !targetId) {
            toast({ title: "Error", description: "Please select a file", variant: "destructive" });
            return;
        }

        setUploading(true);
        try {
            // 1. Create event
            const event = await createEvent({
                user_id: targetId,
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
        setUploadFolderId('none');
        setTagsText('');
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

    const photos = filteredItems.filter(i => getGalleryMediaKind(i) === 'image');
    const videos = filteredItems.filter(i => getGalleryMediaKind(i) === 'video');
    const previewItems = items.slice(0, 2);

    // Collapsed view - shown in the card
    const collapsedContent = (
        <div className="flex flex-col h-full gap-4 min-w-0">
            <div className={`grid h-[150px] min-w-0 gap-2 overflow-hidden ${previewItems.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {previewItems.map((item) => (
                    <GalleryMediaTile
                        key={item.id}
                        item={item}
                        compact
                        onSelect={() => setSelectedMedia(item)}
                    />
                ))}
                {items.length === 0 && (
                    <div className="flex h-full flex-col items-center justify-center rounded-md bg-muted/30 text-muted-foreground">
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
                <Button variant="outline" asChild>
                    <Link to="/gallery/personal">View All</Link>
                </Button>
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
                expanded={widgetExpanded}
                onExpandedChange={setWidgetExpanded}
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

                        <div className="space-y-2">
                            <Label htmlFor="gallery-folder">Folder</Label>
                            <Select value={uploadFolderId} onValueChange={setUploadFolderId}>
                                <SelectTrigger id="gallery-folder">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No folder</SelectItem>
                                    {folders.map((folder) => (
                                        <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="gallery-tags">Tags (comma separated)</Label>
                            <Input
                                id="gallery-tags"
                                value={tagsText}
                                onChange={(e) => setTagsText(e.target.value)}
                                placeholder="science, projects, field-trip"
                            />
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
                    {selectedMedia && (
                        <MediaDisplay
                            src={getGalleryMediaUrl(selectedMedia)}
                            alt={selectedMedia.title}
                            kind={getGalleryMediaKind(selectedMedia)}
                            fit="contain"
                            controls={getGalleryMediaKind(selectedMedia) === "video"}
                            autoPlay={getGalleryMediaKind(selectedMedia) === "video"}
                            fallbackLabel={selectedMedia.title || "Preview unavailable"}
                            className="max-h-[90vh] max-w-full bg-transparent"
                            mediaClassName="max-h-[90vh] max-w-full"
                            loading="eager"
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

function getGalleryMediaUrl(item?: Partial<GalleryItem> | null) {
    return item?.thumbnail_url || item?.media_url || "";
}

function getGalleryMediaKind(item?: Partial<GalleryItem> | null): GalleryItem["media_type"] {
    const mediaType = item?.media_type;
    if (mediaType === "video" || mediaType === "document") return mediaType;
    const url = getGalleryMediaUrl(item);
    if (/\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url)) return "video";
    if (/\.pdf(\?|#|$)/i.test(url)) return "document";
    return "image";
}

function GalleryMediaTile({
    item,
    compact = false,
    onSelect,
}: {
    item: GalleryItem;
    compact?: boolean;
    onSelect: () => void;
}) {
    const [failed, setFailed] = useState(false);
    const mediaUrl = getGalleryMediaUrl(item);
    const mediaKind = getGalleryMediaKind(item);
    const iconClassName = compact ? "h-7 w-7" : "h-12 w-12";

    return (
        <button
            type="button"
            className="group relative h-full min-h-0 min-w-0 cursor-pointer overflow-hidden rounded-md bg-muted text-left"
            onClick={onSelect}
            title={item.title}
        >
            {mediaKind === "video" && mediaUrl && !failed ? (
                <>
                    <video
                        src={mediaUrl}
                        muted
                        playsInline
                        preload="metadata"
                        onError={() => setFailed(true)}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15 text-white">
                        <Video className="h-8 w-8 drop-shadow-md" />
                    </div>
                </>
            ) : mediaKind === "image" && mediaUrl && !failed ? (
                <img
                    src={mediaUrl}
                    alt={item.title}
                    onError={() => setFailed(true)}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
            ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted/60 p-3 text-center text-muted-foreground">
                    {mediaKind === "document" ? (
                        <FileText className={iconClassName} />
                    ) : mediaKind === "video" ? (
                        <Video className={iconClassName} />
                    ) : (
                        <ImageIcon className={iconClassName} />
                    )}
                    {!compact && <span className="max-w-full truncate text-xs">{item.title || "Media unavailable"}</span>}
                </div>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                <span className="line-clamp-1">{item.title}</span>
            </div>
        </button>
    );
}

function GalleryGrid({ items, onDelete, onSelectMedia }: { items: GalleryItem[], onDelete: (id: string) => void, onSelectMedia: (item: GalleryItem) => void }) {
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
                        <GalleryMediaTile item={item} onSelect={() => onSelectMedia(item)} />
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
