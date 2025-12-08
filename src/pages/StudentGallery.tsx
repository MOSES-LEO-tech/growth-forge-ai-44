import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { personalGallery, upload } from '../services/api';
import { useToast } from '../components/ui/use-toast';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Loader2, Plus, Image as ImageIcon, Video, Trash2, Eye } from 'lucide-react';
import { Badge } from '../components/ui/badge';

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

const StudentGallery = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [items, setItems] = useState<GalleryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [open, setOpen] = useState(false);

    // Upload Form State
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [visibility, setVisibility] = useState('private');

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            const response = await personalGallery.getMyItems();
            setItems(response.data.items);
        } catch (error) {
            console.error('Error fetching gallery:', error);
            toast({
                title: "Error",
                description: "Failed to load gallery items",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            toast({ title: "Error", description: "Please select a file", variant: "destructive" });
            return;
        }

        setUploading(true);
        try {
            // 1. Upload file
            const uploadResponse = await upload.uploadFile(file);
            const { url, thumbnailUrl, mimetype } = uploadResponse.data;
            const mediaType = mimetype.startsWith('video/') ? 'video' : 'image';

            // 2. Create gallery item
            await personalGallery.createItem({
                title,
                description,
                mediaType,
                mediaUrl: url,
                thumbnailUrl: thumbnailUrl || (mediaType === 'image' ? url : null),
                visibility
            });

            toast({ title: "Success", description: "Item added to gallery" });
            setOpen(false);
            resetForm();
            fetchItems();
        } catch (error) {
            console.error('Upload failed:', error);
            toast({ title: "Error", description: "Failed to upload item", variant: "destructive" });
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

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this item?")) return;
        try {
            await personalGallery.deleteItem(id);
            setItems(items.filter(item => item.id !== id));
            toast({ title: "Deleted", description: "Item removed" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete item", variant: "destructive" });
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="container mx-auto py-8 text-foreground">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">My Personal Gallery</h1>
                    <p className="text-muted-foreground mt-1">Showcase your best moments and work</p>
                </div>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Add New Item
                        </Button>
                    </DialogTrigger>
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
            </div>

            {items.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">Your gallery is empty</h3>
                    <p className="text-muted-foreground">Start adding photos and videos to build your portfolio!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {items.map((item) => (
                        <Card key={item.id} className="overflow-hidden group relative">
                            <div className="aspect-square relative bg-muted">
                                {item.media_type === 'video' ? (
                                    <video src={item.media_url} className="object-cover w-full h-full" controls={false} /> // Use thumbnail in real app or poster
                                ) : (
                                    <img src={item.media_url} alt={item.title} className="object-cover w-full h-full transition-transform group-hover:scale-105" />
                                )}
                                <div className="absolute top-2 right-2">
                                    <Badge variant={item.visibility === 'public' ? 'default' : 'secondary'}>
                                        {item.visibility}
                                    </Badge>
                                </div>
                            </div>
                            <CardContent className="p-4">
                                <h3 className="font-semibold truncate">{item.title}</h3>
                                <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                                <div className="flex justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StudentGallery;
