import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getGalleryEvents, createEvent, deleteEvent, updateEvent, uploadMedia,
  getGalleryFolders, createGalleryFolder, renameGalleryFolder, deleteGalleryFolder,
} from '@/lib/supabase/gallery';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2, Plus, Image as ImageIcon, Video, Trash2, Eye, EyeOff, Users, Globe, Lock,
  X, ChevronLeft, ChevronRight, Edit2, Search, Folder, FolderPlus, MoreHorizontal, Pencil, FolderOpen,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Navbar from '@/components/Navbar';
import { Breadcrumb } from '@/components/Breadcrumb';
import type { GalleryEvent, GalleryFolder } from '@/integrations/supabase/types';
import { MediaDisplay } from '@/components/MediaDisplay';

interface GalleryItem {
    id: string;
    title: string;
    description: string;
    media_type: 'image' | 'video' | 'document';
    media_url: string;
    thumbnail_url?: string;
    visibility: 'private' | 'public' | 'parents';
    folder_id?: string | null;
    tags?: string[];
    created_at: string;
}

type VisibilityFilter = 'all' | 'private' | 'parents' | 'public';

const visibilityConfig = {
    private: { icon: Lock, label: 'Private', color: 'bg-muted text-muted-foreground' },
    parents: { icon: Users, label: 'Parents', color: 'bg-accent/20 text-accent-foreground' },
    public: { icon: Globe, label: 'Public', color: 'bg-primary/20 text-primary' },
};

const titleFromFileName = (name: string): string => {
    const base = name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    return base.charAt(0).toUpperCase() + base.slice(1);
};

const parseTags = (value: string): string[] =>
    value.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);

const StudentGallery = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [items, setItems] = useState<GalleryItem[]>([]);
    const [folders, setFolders] = useState<GalleryFolder[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState<VisibilityFilter>('all');
    const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
    const [tagFilter, setTagFilter] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);
    const [editItem, setEditItem] = useState<GalleryItem | null>(null);
    const [editOpen, setEditOpen] = useState(false);

    // Upload Form State
    const [files, setFiles] = useState<File[]>([]);
    const [description, setDescription] = useState('');
    const [visibility, setVisibility] = useState<'private' | 'parents' | 'public'>('private');
    const [uploadFolderId, setUploadFolderId] = useState<string>('none');
    const [tagsText, setTagsText] = useState('');
    const [preview, setPreview] = useState<string | null>(null);

    // Folder modal state
    const [folderModalOpen, setFolderModalOpen] = useState(false);
    const [folderName, setFolderName] = useState('');
    const [editingFolder, setEditingFolder] = useState<GalleryFolder | null>(null);
    const [savingFolder, setSavingFolder] = useState(false);

    useEffect(() => {
        fetchItems();
        fetchFolders();
    }, []);

    const fetchItems = async () => {
        try {
            if (!user) return;
            const data = await getGalleryEvents(user.id);
            setItems(data as GalleryItem[]);
        } catch (error) {
            console.error('Error fetching gallery:', error);
            toast({ title: "Error", description: "Failed to load gallery items", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const fetchFolders = async () => {
        if (!user) return;
        try {
            const data = await getGalleryFolders(user.id);
            setFolders(data);
        } catch (error) {
            console.error('Error fetching folders:', error);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files ? Array.from(e.target.files) : [];
        if (selected.length > 0) {
            setFiles(selected);
            // Generate preview of the first file
            const url = URL.createObjectURL(selected[0]);
            setPreview(url);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (files.length === 0 || !user) {
            toast({ title: "Error", description: "Please select at least one file", variant: "destructive" });
            return;
        }

        setUploading(true);
        setUploadProgress(5);
        const tags = parseTags(tagsText);
        const folderId = uploadFolderId === 'none' ? null : uploadFolderId;

        try {
            let completed = 0;
            for (const file of files) {
                // 1. Create event
                const event = await createEvent({
                    user_id: user.id,
                    title: titleFromFileName(file.name),
                    description,
                    is_public: visibility === 'public',
                    folder_id: folderId,
                    tags,
                });

                // 2. Upload media
                await uploadMedia(event.id, file);
                completed++;
                setUploadProgress(Math.round((completed / files.length) * 100));
            }

            toast({ title: "Success!", description: `${completed} item${completed > 1 ? 's' : ''} added to your gallery` });
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
        setFiles([]);
        setDescription('');
        setVisibility('private');
        setUploadFolderId('none');
        setTagsText('');
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
                is_public: editItem.visibility === 'public',
                folder_id: editItem.folder_id || null,
                tags: editItem.tags || [],
            });
            toast({ title: "Updated", description: "Item updated successfully" });
            setEditOpen(false);
            fetchItems();
        } catch (error) {
            toast({ title: "Error", description: "Failed to update", variant: "destructive" });
        }
    };

    const handleSaveFolder = async () => {
        if (!folderName.trim()) {
            toast({ title: "Error", description: "Folder name is required", variant: "destructive" });
            return;
        }
        setSavingFolder(true);
        try {
            if (editingFolder) {
                await renameGalleryFolder(editingFolder.id, folderName);
                toast({ title: "Renamed", description: "Folder renamed successfully" });
            } else if (user) {
                await createGalleryFolder(user.id, folderName);
                toast({ title: "Created", description: "Folder created successfully" });
            }
            setFolderModalOpen(false);
            setEditingFolder(null);
            setFolderName('');
            fetchFolders();
        } catch (error) {
            toast({ title: "Error", description: "Failed to save folder", variant: "destructive" });
        } finally {
            setSavingFolder(false);
        }
    };

    const handleDeleteFolder = async (folder: GalleryFolder) => {
        if (!confirm(`Delete folder "${folder.name}"? Its items will move to All items.`)) return;
        try {
            await deleteGalleryFolder(folder.id);
            setFolders(folders.filter((f) => f.id !== folder.id));
            if (activeFolderId === folder.id) setActiveFolderId(null);
            toast({ title: "Deleted", description: "Folder removed" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete folder", variant: "destructive" });
        }
    };

    const openEditFolder = (folder: GalleryFolder) => {
        setEditingFolder(folder);
        setFolderName(folder.name);
        setFolderModalOpen(true);
    };

    const closeFolderModal = () => {
        setFolderModalOpen(false);
        setEditingFolder(null);
        setFolderName('');
    };

    const filteredItems = items.filter((item) => {
        if (filter !== 'all' && item.visibility !== filter) return false;
        if (activeFolderId && item.folder_id !== activeFolderId) return false;
        if (tagFilter && !(item.tags || []).includes(tagFilter)) return false;
        const q = searchQuery.toLowerCase();
        if (q) {
            const haystack = `${item.title} ${item.description || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
            if (!haystack.includes(q)) return false;
        }
        return true;
    });

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

    const allTags = Array.from(new Set(items.flatMap((i) => i.tags || []))).sort();

    const folderCount = (folderId: string) => items.filter((i) => i.folder_id === folderId).length;

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container mx-auto px-4 pt-24 pb-8">
                <Breadcrumb to="/dashboard" label="Back to Dashboard" />
                {/* Header */}
                <section className="dashboard-hero mb-8">
                    <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
                        <div>
                            <p className="editorial-kicker mb-2">Personal archive</p>
                            <h1 className="text-3xl md:text-4xl">My Gallery</h1>
                            <p className="mt-2 text-sm text-muted-foreground">Showcase your best moments, projects, and achievements</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
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
                                        <DialogDescription>Add one or more photos or videos to your personal gallery</DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleUpload} className="space-y-5">
                                        {/* File Input & Preview */}
                                        <div className="space-y-2">
                                            <Label>Media Files *</Label>
                                            {preview ? (
                                                <div className="relative rounded-lg overflow-hidden border bg-muted aspect-video">
                                                    {files[0]?.type.startsWith('video/') ? (
                                                        <video src={preview} className="w-full h-full object-contain" controls />
                                                    ) : (
                                                        <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => { setFiles([]); setPreview(null); }}
                                                        className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background border"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                    {files.length > 1 && (
                                                        <span className="absolute bottom-2 left-2 rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium border">
                                                            +{files.length - 1} more file{files.length > 2 ? 's' : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
                                                    <ImageIcon className="w-10 h-10 text-muted-foreground mb-2" />
                                                    <span className="text-sm text-muted-foreground">Click to select photos or videos</span>
                                                    <span className="text-xs text-muted-foreground/60 mt-1">JPG, PNG, GIF, MP4, MOV — multiple allowed</span>
                                                    <Input type="file" accept="image/*,video/*" multiple onChange={handleFileChange} className="hidden" />
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
                                            <Label>Description</Label>
                                            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What makes these special?" rows={2} className="resize-none" />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="upload-folder">Folder</Label>
                                                <Select value={uploadFolderId} onValueChange={setUploadFolderId}>
                                                    <SelectTrigger id="upload-folder"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">No folder</SelectItem>
                                                        {folders.map((folder) => (
                                                            <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
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
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="upload-tags">Tags (comma separated)</Label>
                                            <Input
                                                id="upload-tags"
                                                value={tagsText}
                                                onChange={(e) => setTagsText(e.target.value)}
                                                placeholder="science, projects, field-trip"
                                            />
                                        </div>

                                        <DialogFooter>
                                            <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }} disabled={uploading}>Cancel</Button>
                                            <Button type="submit" disabled={uploading || files.length === 0}>
                                                {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : `Upload ${files.length > 1 ? `(${files.length})` : ''}`}
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>
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

                    {/* Visibility filter */}
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
                ) : (
                    <div className="flex flex-col gap-6 lg:flex-row">
                        {/* Folder sidebar */}
                        <aside className="w-full shrink-0 lg:w-56" aria-label="Gallery folders">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-xs font-semibold uppercase text-muted-foreground">Folders</h2>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingFolder(null); setFolderName(''); setFolderModalOpen(true); }} aria-label="New folder">
                                    <FolderPlus className="h-4 w-4" />
                                </Button>
                            </div>
                            <ScrollArea className="max-h-[300px] lg:max-h-none">
                                <div className="space-y-1">
                                    <button
                                        type="button"
                                        onClick={() => setActiveFolderId(null)}
                                        className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
                                            activeFolderId === null ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                                        }`}
                                    >
                                        <FolderOpen className="h-4 w-4 shrink-0" />
                                        <span className="truncate flex-1 text-left">All items</span>
                                        <span className="text-xs text-muted-foreground">{items.length}</span>
                                    </button>
                                    {folders.map((folder) => (
                                        <div
                                            key={folder.id}
                                            className={`flex items-center rounded-md transition-colors ${
                                                activeFolderId === folder.id ? 'bg-primary/10' : 'hover:bg-muted'
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setActiveFolderId(activeFolderId === folder.id ? null : folder.id)}
                                                className={`flex w-full min-w-0 items-center gap-2 px-2.5 py-2 text-sm font-medium ${
                                                    activeFolderId === folder.id ? 'text-primary' : 'text-muted-foreground'
                                                }`}
                                            >
                                                <Folder className="h-4 w-4 shrink-0" />
                                                <span className="truncate flex-1 text-left">{folder.name}</span>
                                                <span className="text-xs text-muted-foreground">{folderCount(folder.id)}</span>
                                            </button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-background/70"
                                                        aria-label={`Options for ${folder.name}`}
                                                    >
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start">
                                                    <DropdownMenuItem onClick={() => openEditFolder(folder)}>
                                                        <Pencil className="mr-2 h-4 w-4" /> Rename
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteFolder(folder)}>
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </aside>

                        {/* Main content */}
                        <div className="min-w-0 flex-1">
                            {/* Search */}
                            <div className="relative mb-4 w-full max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Search by title, description, or tag..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                    aria-label="Search gallery"
                                />
                            </div>

                            {/* Tag filter */}
                            {allTags.length > 0 && (
                                <div className="mb-4 flex flex-wrap gap-2">
                                    {allTags.map((tag) => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                                tagFilter === tag
                                                    ? 'border-primary bg-primary text-primary-foreground'
                                                    : 'text-muted-foreground hover:border-primary/50 hover:text-foreground'
                                            }`}
                                        >
                                            #{tag}
                                        </button>
                                    ))}
                                    {tagFilter && (
                                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setTagFilter(null)}>
                                            Clear tag filter
                                        </Button>
                                    )}
                                </div>
                            )}

                            {filteredItems.length === 0 ? (
                                <div className="text-center py-16 border-2 border-dashed rounded-xl">
                                    <ImageIcon className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
                                    <h3 className="text-xl font-semibold text-foreground mb-1">
                                        {items.length === 0 ? 'Your gallery is empty' : 'No items match your filters'}
                                    </h3>
                                    <p className="text-muted-foreground mb-4">
                                        {items.length === 0 ? 'Upload photos and videos to build your portfolio!' : 'Try adjusting the folder, tag, or search filters'}
                                    </p>
                                    {items.length === 0 && (
                                        <Button onClick={() => setOpen(true)} className="gap-2">
                                            <Plus className="w-4 h-4" /> Upload Your First Item
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
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
                                                    {(item.tags && item.tags.length > 0) && (
                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                            {item.tags.slice(0, 3).map((tag) => (
                                                                <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">#{tag}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <p className="text-xs text-muted-foreground/60 mt-1">{new Date(item.created_at).toLocaleDateString()}</p>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
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
                                            {(lightboxItem.tags && lightboxItem.tags.length > 0) && (
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {lightboxItem.tags.map((tag) => (
                                                        <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">#{tag}</span>
                                                    ))}
                                                </div>
                                            )}
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
                    <DialogContent className="sm:max-w-[440px]">
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
                                    <Label htmlFor="edit-folder">Folder</Label>
                                    <Select
                                        value={editItem.folder_id || 'none'}
                                        onValueChange={(v) => setEditItem({ ...editItem, folder_id: v === 'none' ? null : v })}
                                    >
                                        <SelectTrigger id="edit-folder"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No folder</SelectItem>
                                            {folders.map((folder) => (
                                                <SelectItem key={folder.id} value={folder.id}>{folder.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-tags">Tags (comma separated)</Label>
                                    <Input
                                        id="edit-tags"
                                        value={(editItem.tags || []).join(', ')}
                                        onChange={e => setEditItem({ ...editItem, tags: parseTags(e.target.value) })}
                                    />
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

                {/* Folder create/rename Dialog */}
                <Dialog open={folderModalOpen} onOpenChange={(v) => { if (!v) closeFolderModal(); }}>
                    <DialogContent className="sm:max-w-[400px]">
                        <DialogHeader>
                            <DialogTitle>{editingFolder ? 'Rename Folder' : 'New Folder'}</DialogTitle>
                            <DialogDescription>
                                {editingFolder ? 'Give this folder a new name.' : 'Organize your gallery items into folders.'}
                            </DialogDescription>
                        </DialogHeader>
                        <form
                            onSubmit={(e) => { e.preventDefault(); handleSaveFolder(); }}
                            className="space-y-4"
                        >
                            <div className="space-y-2">
                                <Label htmlFor="folder-name">Folder Name</Label>
                                <Input
                                    id="folder-name"
                                    value={folderName}
                                    onChange={(e) => setFolderName(e.target.value)}
                                    placeholder="e.g. Science Fair 2026"
                                    autoFocus
                                    required
                                />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={closeFolderModal} disabled={savingFolder}>Cancel</Button>
                                <Button type="submit" disabled={savingFolder}>
                                    {savingFolder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    {editingFolder ? 'Rename' : 'Create'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};

export default StudentGallery;
