import { useState, useEffect } from "react";
import { getGalleryEvents, createEvent, deleteEvent, uploadMedia } from "@/lib/supabase/gallery";
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
    id: string;
    title: string;
    description: string | null;
    media_type?: string;
    media_url?: string;
    thumbnail_url?: string;
    visibility?: string;
    created_at: string;
}

interface GalleryWidgetProps {
    className?: string;
    defaultExpanded?: boolean;
    userId?: string;
}

export function GalleryWidget({ className, defaultExpanded, userId }: GalleryWidgetProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [openUpload, setOpenUpload] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [visibility, setVisibility] = useState('private');

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
            const event = await createEvent({
                created_by: user.id,
                title,
                description,
            });

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
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const collapsedContent = (
        <div className="flex flex-col h-full gap-4 min-w-0">
            <div className="grid grid-cols-2 gap-2 h-full max-h-[140px] min-w-0">
                {items.length === 0 && (
                    <div className="col-span-2 flex flex-col items-center justify-center text-muted-foreground h-full bg-muted/20 rounded">
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

            <ScrollArea className="flex-1 -mx-2 px-2 overflow-hidden">
                {filteredItems.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">No items found.</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-6 min-w-0">
                        {filteredItems.map((item) => (
                            <Card
                                key={item.id}
                                className="overflow-hidden group relative hover:shadow-lg transition-shadow cursor-pointer min-w-0 flex flex-col"
                            >
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
                                                e.stopPropagation();
                                                handleDelete(item.id);
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </ScrollArea>
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

                        <DialogFooter>
                            <Button type="submit" disabled={uploading}>
                                {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : 'Upload Item'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
