import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getGalleryEvents, createEvent, deleteEvent, updateEvent, uploadMedia } from '@/lib/supabase/gallery';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Image as ImageIcon, Video, Trash2, Eye, EyeOff, Users, Globe, Lock, X, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Navbar from '@/components/Navbar';
import type { GalleryEvent } from '@/integrations/supabase/types';
import { MediaDisplay } from '@/components/MediaDisplay';

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

type VisibilityFilter = 'all' | 'private' | 'parents' | 'public';

const visibilityConfig = {
    private: { icon: Lock, label: 'Private', color: 'bg-muted text-muted-foreground' },
    parents: { icon: Users, label: 'Parents', color: 'bg-accent/20 text-accent-foreground' },
    public: { icon: Globe, label: 'Public', color: 'bg-primary/20 text-primary' },
};

const StudentGallery = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [items, setItems] = useState<GalleryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState<VisibilityFilter>('all');
    const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);
    const [editItem, setEditItem] = useState<GalleryItem | null>(null);
    const [editOpen, setEditOpen] = useState(false);

    // Upload Form State
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [visibility, setVisibility] = useState<'private' | 'parents' | 'public'>('private');
    const [preview, setPreview] = useState<string | null>(null);

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            if (!user) return;
            const data = await getGalleryEvents(user.id);
            setItems(data as any[]);
        } catch (error) {
            console.error('Error fetching gallery:', error);
            toast({ title: "Error", description: "Failed to load gallery items", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            // Generate preview
            const url = URL.createObjectURL(selectedFile);
            setPreview(url);
            // Auto-set title from filename if empty
            if (!title) {
                const name = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
                setTitle(name.charAt(0).toUpperCase() + name.slice(1));
            }
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !user) {
            toast({ title: "Error", description: "Please select a file", variant: "destructive" });
            return;
        }

        setUploading(true);
        setUploadProgress(10);
        try {
            // 1. Create event
            const event = await createEvent({
                user_id: user.id,
                title: title || 'Untitled',
                description,
                is_public: visibility === 'public'
            });

            // 2. Upload media
            setUploadProgress(30);
            await uploadMedia(event.id, file);
            setUploadProgress(100);

            toast({ title: "Success!", description: "Item added to your gallery" });
            setOpen(false);
            resetForm();
            fetchItems();
        } catch (error) {
            console.error('Upload failed:', error);
            toast({ title: "Error", description: "Failed to upload item", variant: "destructive" });
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const resetForm = () => {
        setFile(null);
        setTitle('');
        setDescription('');
        setVisibility('private');
        setPreview(null);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this item?")) return;
        try {
            await deleteEvent(id);
            setItems(items.filter(item => item.id !== id));
            if (lightboxItem?.id === id) setLightboxItem(null);
            toast({ title: "Deleted", description: "Item removed from gallery" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete item", variant: "destructive" });
        }
    };

    const handleEditSave = async () => {
        if (!editItem) return;
        try {
            await updateEvent(editItem.id, {
                title: editItem.title,
                description: editItem.description,
                is_public: editItem.visibility === 'public'
            });
            toast({ title: "Updated", description: "Item updated successfully" });
            setEditOpen(false);
            fetchItems();
        } catch (error) {
            toast({ title: "Error", description: "Failed to update", variant: "destructive" });
        }
    };

    const filteredItems = filter === 'all' ? items : items.filter(i => i.visibility === filter);

    const navigateLightbox = useCallback((direction: 'prev' | 'next') => {
        if (!lightboxItem) return;
        const idx = filteredItems.findIndex(i => i.id === lightboxItem.id);
        const newIdx = direction === 'next'
            ? (idx + 1) % filteredItems.length
            : (idx - 1 + filteredItems.length) % filteredItems.length;
        setLightboxItem(filteredItems[newIdx]);
    }, [lightboxItem, filteredItems]);

    const stats = {
        total: items.length,
        photos: items.filter(i => i.media_type === 'image').length,
        videos: items.filter(i => i.media_type === 'video').length,
        public: items.filter(i => i.visibility === 'public').length,
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <section className="dashboard-hero mb-8">
                    <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
                        <div>
                            <p className="editorial-kicker mb-2">Personal archive</p>
                            <h1 className="text-3xl md:text-4xl">My Gallery</h1>
                            <p className="mt-2 text-sm text-muted-foreground">Showcase your best moments, projects, and achievements</p>
                        </div>
                        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
                            <DialogTrigger asChild>
                                <Button className="gap-2">
                                    <Plus className="w-4 h-4" />
                                    Upload
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[520px]">
                                <DialogHeader>
                                    <DialogTitle>Upload to Gallery</DialogTitle>
                                    <DialogDescription>Add photos or videos to your personal gallery</DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleUpload} className="space-y-5">
                                    {/* File Input & Preview */}
                                    <div className="space-y-2">
                                        <Label>Media File *</Label>
                                        {preview ? (
                                            <div className="relative rounded-lg overflow-hidden border bg-muted aspect-video">
                                                {file?.type.startsWith('video/') ? (
                                                    <video src={preview} className="w-full h-full object-contain" controls />
                                                ) : (
                                                    <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => { setFile(null); setPreview(null); }}
                                                    className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background border"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
                                                <ImageIcon className="w-10 h-10 text-muted-foreground mb-2" />
                                                <span className="text-sm text-muted-foreground">Click to select photo or video</span>
                                                <span className="text-xs text-muted-foreground/60 mt-1">JPG, PNG, GIF, MP4, MOV</span>
                                                <Input type="file" accept="image/*,video/*" onChange={handleFileChange} className="hidden" />
                                            </label>
                                        )}
                                    </div>

                                    {uploading && (
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>Uploading...</span>
                                                <span>{uploadProgress}%</span>
                                            </div>
                                            <Progress value={uploadProgress} className="h-1.5" />
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label>Title *</Label>
                                        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="My awesome photo" required />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Description</Label>
                                        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What makes this special?" rows={2} className="resize-none" />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Who can see this?</Label>
                                        <Select value={visibility} onValueChange={(v) => setVisibility(v as 'private' | 'parents' | 'public')}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="private">
                                                    <span className="flex items-center gap-2"><Lock className="w-3.5 h-3.5" /> Only Me</span>
                                                </SelectItem>
                                                <SelectItem value="parents">
                                                    <span className="flex items-center gap-2"><Users className="w-3.5 h-3.5" /> Parents</span>
                                                </SelectItem>
                                                <SelectItem value="public">
                                                    <span className="flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Everyone</span>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <DialogFooter>
                                        <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }} disabled={uploading}>Cancel</Button>
                                        <Button type="submit" disabled={uploading || !file}>
                                            {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : 'Upload'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Stats */}
                    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                            { label: 'Total', value: stats.total, icon: ImageIcon },
                            { label: 'Photos', value: stats.photos, icon: ImageIcon },
                            { label: 'Videos', value: stats.videos, icon: Video },
                            { label: 'Public', value: stats.public, icon: Globe },
                        ].map(s => (
                            <Card key={s.label} className="border bg-background/70">
                                <CardContent className="p-4 flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/10">
                                        <s.icon className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-foreground">{s.value}</p>
                                        <p className="text-xs text-muted-foreground">{s.label}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Filter */}
                    <div className="flex flex-wrap gap-2">
                        {(['all', 'private', 'parents', 'public'] as const).map(f => (
                            <Button
                                key={f}
                                size="sm"
                                variant={filter === f ? 'default' : 'outline'}
                                onClick={() => setFilter(f)}
                                className="capitalize"
                            >
                                {f === 'all' ? 'All' : visibilityConfig[f].label}
                            </Button>
                        ))}
                    </div>
                </section>

                {/* Content */}
                {loading ? (
                    <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>
                ) : filteredItems.length === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed rounded-xl">
                        <ImageIcon className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
                        <h3 className="text-xl font-semibold text-foreground mb-1">
                            {items.length === 0 ? 'Your gallery is empty' : 'No items match this filter'}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                            {items.length === 0 ? 'Upload photos and videos to build your portfolio!' : 'Try a different filter'}
                        </p>
                        {items.length === 0 && (
                            <Button onClick={() => setOpen(true)} className="gap-2">
                                <Plus className="w-4 h-4" /> Upload Your First Item
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {filteredItems.map((item, index) => {
                            const vis = visibilityConfig[item.visibility];
                            const VisIcon = vis.icon;
                            return (
                                <Card key={item.id} className={`media-tile group relative cursor-pointer ${index === 0 ? 'md:col-span-2 md:row-span-2' : ''}`} onClick={() => setLightboxItem(item)}>
                                    <div className={`${index === 0 ? 'aspect-[4/3]' : 'aspect-square'} relative overflow-hidden bg-muted`}>
                                        <MediaDisplay
                                            src={item.thumbnail_url || item.media_url}
                                            alt={item.title}
                                            kind={item.media_type}
                                            fit="cover"
                                            fallbackLabel={item.title}
                                            mediaClassName="transition-transform duration-300 group-hover:scale-105"
                                        />
                                        <div className="absolute top-2 right-2">
                                            <Badge className={`text-xs ${vis.color}`}>
                                                <VisIcon className="w-3 h-3 mr-1" />
                                                {vis.label}
                                            </Badge>
                                        </div>
                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <Button size="icon" variant="secondary" className="h-9 w-9" onClick={(e) => { e.stopPropagation(); setEditItem({...item}); setEditOpen(true); }}>
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="destructive" className="h-9 w-9" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <CardContent className="p-3">
                                        <h3 className="font-semibold text-sm truncate text-foreground">{item.title}</h3>
                                        {item.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</p>}
                                        <p className="text-xs text-muted-foreground/60 mt-1">{new Date(item.created_at).toLocaleDateString()}</p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* Lightbox */}
                <Dialog open={!!lightboxItem} onOpenChange={(v) => { if (!v) setLightboxItem(null); }}>
                    <DialogContent className="sm:max-w-[90vw] max-h-[90vh] p-0 overflow-hidden bg-background/95 backdrop-blur-sm border">
                        {lightboxItem && (
                            <div className="relative">
                                <div className="flex items-center justify-center min-h-[50vh] max-h-[75vh] bg-muted/30">
                                    <MediaDisplay
                                        src={lightboxItem.media_url}
                                        alt={lightboxItem.title}
                                        kind={lightboxItem.media_type}
                                        fit="contain"
                                        controls={lightboxItem.media_type === 'video'}
                                        autoPlay={lightboxItem.media_type === 'video'}
                                        fallbackLabel={lightboxItem.title}
                                        className="max-h-[75vh] bg-transparent"
                                        mediaClassName="max-h-[75vh]"
                                        loading="eager"
                                    />
                                </div>
                                {/* Navigation */}
                                {filteredItems.length > 1 && (
                                    <>
                                        <button onClick={(e) => { e.stopPropagation(); navigateLightbox('prev'); }} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background border shadow">
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); navigateLightbox('next'); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background border shadow">
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </>
                                )}
                                <div className="p-4 border-t">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-semibold text-foreground">{lightboxItem.title}</h3>
                                            {lightboxItem.description && <p className="text-sm text-muted-foreground mt-1">{lightboxItem.description}</p>}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="outline" onClick={() => { setEditItem({...lightboxItem}); setEditOpen(true); }}>
                                                <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleDelete(lightboxItem.id)}>
                                                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                                            </Button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">{new Date(lightboxItem.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Edit Dialog */}
                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogContent className="sm:max-w-[400px]">
                        <DialogHeader>
                            <DialogTitle>Edit Item</DialogTitle>
                        </DialogHeader>
                        {editItem && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Title</Label>
                                    <Input value={editItem.title} onChange={e => setEditItem({...editItem, title: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Textarea value={editItem.description} onChange={e => setEditItem({...editItem, description: e.target.value})} rows={2} className="resize-none" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Visibility</Label>
                                    <Select value={editItem.visibility} onValueChange={(v) => setEditItem({...editItem, visibility: v as 'private' | 'parents' | 'public'})}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="private"><span className="flex items-center gap-2"><Lock className="w-3.5 h-3.5" /> Only Me</span></SelectItem>
                                            <SelectItem value="parents"><span className="flex items-center gap-2"><Users className="w-3.5 h-3.5" /> Parents</span></SelectItem>
                                            <SelectItem value="public"><span className="flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Everyone</span></SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                                    <Button onClick={handleEditSave}>Save Changes</Button>
                                </DialogFooter>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};

export default StudentGallery;
