import { useEffect, useMemo, useRef, useState } from "react";
import {
  Folder, FolderPlus, UploadCloud, Search, FileText, FileSpreadsheet,
  Presentation, FileArchive, File as FileIcon, FileImage, MoreVertical,
  Download, Trash2, Pencil, FolderInput, X, Eye, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import type { ProjectFile, ProjectFolder } from "@/integrations/supabase/types";
import {
  getProjectFolders, createProjectFolder, renameProjectFolder, deleteProjectFolder,
  getProjectFiles, uploadProjectDocument, updateProjectFile, deleteProjectFile,
  getProjectFileUrl, formatFileSize, getFileCategory, type FileCategory,
} from "@/lib/supabase/projectFiles";

interface ProjectFilesPanelProps {
  projectId: string;
  canEdit?: boolean;
}

const CATEGORY_META: Record<FileCategory, { color: string; icon: React.ElementType }> = {
  pdf: { color: "text-red-500", icon: FileText },
  word: { color: "text-blue-500", icon: FileText },
  excel: { color: "text-green-600", icon: FileSpreadsheet },
  powerpoint: { color: "text-orange-500", icon: Presentation },
  text: { color: "text-slate-500", icon: FileText },
  image: { color: "text-purple-500", icon: FileImage },
  archive: { color: "text-amber-600", icon: FileArchive },
  other: { color: "text-slate-400", icon: FileIcon },
};

export default function ProjectFilesPanel({ projectId, canEdit }: ProjectFilesPanelProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [folders, setFolders] = useState<ProjectFolder[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  // Dialogs
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [editingFolder, setEditingFolder] = useState<ProjectFolder | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<ProjectFolder | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadFolderId, setUploadFolderId] = useState<string>("__root__");
  const [uploadTags, setUploadTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [renamingFile, setRenamingFile] = useState<ProjectFile | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [movingFile, setMovingFile] = useState<ProjectFile | null>(null);
  const [moveTarget, setMoveTarget] = useState<string>("__root__");
  const [deleteFileTarget, setDeleteFileTarget] = useState<ProjectFile | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [folderData, fileData] = await Promise.all([
        getProjectFolders(projectId),
        getProjectFiles(projectId),
      ]);
      setFolders(folderData);
      setFiles(fileData);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to load documents", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [projectId]);

  useEffect(() => {
    if (previewFile) {
      setPreviewUrl("");
      getProjectFileUrl(previewFile.file_path).then(setPreviewUrl);
    }
  }, [previewFile]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    files.forEach((f) => f.tags?.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [files]);

  const visibleFiles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return files.filter((f) => {
      if (activeFolderId && f.folder_id !== activeFolderId) return false;
      if (tagFilter && !(f.tags || []).includes(tagFilter)) return false;
      if (query) {
        const nameMatch = f.file_name.toLowerCase().includes(query);
        const tagMatch = (f.tags || []).some((t) => t.toLowerCase().includes(query));
        if (!nameMatch && !tagMatch) return false;
      }
      return true;
    });
  }, [files, activeFolderId, tagFilter, searchQuery]);

  const folderCount = (folderId: string) => files.filter((f) => f.folder_id === folderId).length;

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFolder) {
        await renameProjectFolder(editingFolder.id, folderName);
        toast({ title: "Folder renamed" });
      } else {
        await createProjectFolder(projectId, folderName);
        toast({ title: "Folder created" });
      }
      setFolderDialogOpen(false);
      setEditingFolder(null);
      setFolderName("");
      load();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save folder", variant: "destructive" });
    }
  };

  const handleDeleteFolder = async () => {
    if (!deleteFolderTarget) return;
    try {
      await deleteProjectFolder(deleteFolderTarget.id);
      toast({ title: "Folder deleted", description: "Its files moved to All files." });
      if (activeFolderId === deleteFolderTarget.id) setActiveFolderId(null);
      setDeleteFolderTarget(null);
      load();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete folder", variant: "destructive" });
    }
  };

  const doUpload = async (fileList: File[]) => {
    if (fileList.length === 0) return;
    setUploading(true);
    try {
      const tags = uploadTags.split(",").map((t) => t.trim()).filter(Boolean);
      const folderId = uploadFolderId === "__root__" ? null : uploadFolderId;
      for (const file of fileList) {
        await uploadProjectDocument(projectId, file, { folderId, tags });
      }
      toast({ title: "Files uploaded", description: `${fileList.length} file(s) added.` });
      setUploadOpen(false);
      setUploadFiles([]);
      setUploadTags("");
      setUploadFolderId("__root__");
      load();
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message || "Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doUpload(uploadFiles);
  };

  const handleSaveRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingFile) return;
    const name = renameValue.trim();
    if (!name) return;
    try {
      await updateProjectFile(renamingFile.id, { file_name: name });
      toast({ title: "File renamed" });
      setRenamingFile(null);
      load();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to rename file", variant: "destructive" });
    }
  };

  const handleMove = async () => {
    if (!movingFile) return;
    try {
      await updateProjectFile(movingFile.id, { folder_id: moveTarget === "__root__" ? null : moveTarget });
      toast({ title: "File moved" });
      setMovingFile(null);
      load();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to move file", variant: "destructive" });
    }
  };

  const handleDeleteFile = async () => {
    if (!deleteFileTarget) return;
    try {
      await deleteProjectFile(deleteFileTarget.id);
      toast({ title: "File deleted" });
      setDeleteFileTarget(null);
      load();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete file", variant: "destructive" });
    }
  };

  const openFolderEditor = (folder?: ProjectFolder) => {
    setEditingFolder(folder || null);
    setFolderName(folder?.name || "");
    setFolderDialogOpen(true);
  };

  const handlePreview = async (file: ProjectFile) => {
    setPreviewFile(file);
  };

  const categoryOf = (file: ProjectFile) => getFileCategory(file.file_type, file.file_name);
  const canPreviewInline = (file: ProjectFile) => {
    const c = categoryOf(file);
    return c === 'pdf' || c === 'text' || c === 'image';
  };

  const renderPreviewBody = () => {
    if (!previewFile) return null;
    const c = categoryOf(previewFile);
    if (!previewUrl) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
    if (c === 'image') {
      return <img src={previewUrl} alt={previewFile.file_name} className="max-h-[60vh] w-auto mx-auto rounded-lg" />;
    }
    if (c === 'pdf' || c === 'text') {
      return <iframe src={previewUrl} title={previewFile.file_name} className="w-full h-[60vh] rounded-lg border" />;
    }
    return (
      <div className="text-center py-12 space-y-4">
        <FileIcon className="h-12 w-12 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No inline preview for this file type.</p>
        <a href={previewUrl} target="_blank" rel="noopener noreferrer">
          <Button><Download className="mr-2 h-4 w-4" /> Download</Button>
        </a>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <CardTitle className="text-lg">Documents</CardTitle>
          {canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => openFolderEditor()}>
                <FolderPlus className="mr-2 h-4 w-4" /> New Folder
              </Button>
              <Button size="sm" onClick={() => setUploadOpen(true)}>
                <UploadCloud className="mr-2 h-4 w-4" /> Upload
              </Button>
            </div>
          )}
        </div>
        <div className="flex flex-col md:flex-row gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {allTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={tagFilter === tag ? "default" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading documents...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
            {/* Folder sidebar */}
            <div className="border rounded-lg p-2">
              <div
                className={`flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer text-sm ${activeFolderId === null ? 'bg-accent font-medium' : 'hover:bg-muted'}`}
                onClick={() => setActiveFolderId(null)}
              >
                <span className="flex items-center gap-2"><Folder className="h-4 w-4 text-primary" /> All files</span>
                <span className="text-xs text-muted-foreground">{files.length}</span>
              </div>
              <ScrollArea className="mt-1 max-h-64">
                {folders.map((folder) => (
                  <div key={folder.id} className="group flex items-center">
                    <div
                      className={`flex-1 flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer text-sm ${activeFolderId === folder.id ? 'bg-accent font-medium' : 'hover:bg-muted'}`}
                      style={{ marginLeft: folder.parent_id ? 16 : 0 }}
                      onClick={() => setActiveFolderId(folder.id)}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                        <span className="truncate">{folder.name}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">{folderCount(folder.id)}</span>
                    </div>
                    {canEdit && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openFolderEditor(folder)}>
                            <Pencil className="mr-2 h-4 w-4" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteFolderTarget(folder)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))}
                {folders.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No folders yet</p>
                )}
              </ScrollArea>
            </div>

            {/* File list */}
            <div
              className={`border rounded-lg ${dragOver ? 'bg-accent/40 border-primary' : ''}`}
              onDragOver={(e) => { if (canEdit) { e.preventDefault(); setDragOver(true); } }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (!canEdit) return;
                const dropped = Array.from(e.dataTransfer.files || []);
                if (dropped.length > 0) {
                  setUploadFiles(dropped);
                  setUploadOpen(true);
                }
              }}
            >
              {visibleFiles.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{searchQuery || tagFilter || activeFolderId ? 'No files match your filters.' : 'No documents yet.'}</p>
                  {canEdit && (
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => setUploadOpen(true)}>
                      <UploadCloud className="mr-2 h-4 w-4" /> Upload your first file
                    </Button>
                  )}
                </div>
              ) : (
                <ScrollArea className="max-h-96">
                  {visibleFiles.map((file) => {
                    const meta = CATEGORY_META[categoryOf(file)];
                    const Icon = meta.icon;
                    return (
                      <div key={file.id} className="flex items-center gap-3 px-3 py-2.5 border-b last:border-0 hover:bg-muted/40">
                        <Icon className={`h-6 w-6 shrink-0 ${meta.color}`} />
                        <div className="flex-1 min-w-0">
                          <button
                            className="text-sm font-medium truncate block w-full text-left hover:underline"
                            onClick={() => handlePreview(file)}
                          >
                            {file.file_name}
                          </button>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                            <span>{formatFileSize(file.file_size)}</span>
                            <span>{new Date(file.created_at).toLocaleDateString()}</span>
                            {(file.tags || []).slice(0, 3).map((t) => (
                              <Badge key={t} variant="outline" className="px-1.5 py-0 text-[10px]">{t}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePreview(file)} title="Preview">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canEdit && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setRenamingFile(file); setRenameValue(file.file_name); }}>
                                  <Pencil className="mr-2 h-4 w-4" /> Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setMovingFile(file); setMoveTarget(file.folder_id || "__root__"); }}>
                                  <FolderInput className="mr-2 h-4 w-4" /> Move to folder
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={async () => {
                                    const url = await getProjectFileUrl(file.file_path);
                                    if (url) window.open(url, "_blank", "noopener,noreferrer");
                                  }}
                                >
                                  <Download className="mr-2 h-4 w-4" /> Download
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => setDeleteFileTarget(file)}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </ScrollArea>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const selected = Array.from(e.target.files || []);
          if (selected.length > 0) {
            setUploadFiles(selected);
            setUploadOpen(true);
          }
          e.target.value = "";
        }}
      />

      {/* Create / rename folder */}
      <Dialog open={folderDialogOpen} onOpenChange={(o) => { setFolderDialogOpen(o); if (!o) { setEditingFolder(null); setFolderName(""); } }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingFolder ? "Rename Folder" : "New Folder"}</DialogTitle>
            <DialogDescription>
              {editingFolder ? "Update the folder name." : "Organize your documents into folders."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateFolder} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder name</Label>
              <Input
                id="folder-name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="e.g. Research Notes"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFolderDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editingFolder ? "Save" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Upload */}
      <Dialog open={uploadOpen} onOpenChange={(o) => { setUploadOpen(o); if (!o) { setUploadFiles([]); } }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload Documents</DialogTitle>
            <DialogDescription>
              PDF, Word, Excel, PowerPoint, text files, and images (up to 50MB each).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/40 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
              {uploadFiles.length > 0 ? (
                <div className="text-center">
                  <p className="text-sm font-medium">{uploadFiles.length} file(s) selected</p>
                  <ul className="text-xs text-muted-foreground mt-1 max-h-24 overflow-auto">
                    {uploadFiles.map((f, i) => (
                      <li key={i} className="flex items-center justify-between gap-2">
                        <span className="truncate">{f.name}</span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setUploadFiles(uploadFiles.filter((_, idx) => idx !== i)); }}>
                          <X className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Click to select or drag files here</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Folder</Label>
                <Select value={uploadFolderId} onValueChange={setUploadFolderId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__root__">All files</SelectItem>
                    {folders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tags</Label>
                <Input
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  placeholder="notes, homework (comma separated)"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>Cancel</Button>
              <Button type="submit" disabled={uploading || uploadFiles.length === 0}>
                {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : <>Upload</>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview */}
      <Dialog open={!!previewFile} onOpenChange={(o) => { if (!o) setPreviewFile(null); }}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle className="text-lg truncate">{previewFile?.file_name}</DialogTitle>
            <DialogDescription>Preview</DialogDescription>
          </DialogHeader>
          {renderPreviewBody()}
        </DialogContent>
      </Dialog>

      {/* Rename file */}
      <Dialog open={!!renamingFile} onOpenChange={(o) => { if (!o) setRenamingFile(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
            <DialogDescription>Update the display name of this file.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveRename} className="space-y-4">
            <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} required />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenamingFile(null)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Move file */}
      <Dialog open={!!movingFile} onOpenChange={(o) => { if (!o) setMovingFile(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Move File</DialogTitle>
            <DialogDescription>Choose the destination folder.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={moveTarget} onValueChange={setMoveTarget}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__root__">All files</SelectItem>
                {folders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMovingFile(null)}>Cancel</Button>
              <Button onClick={handleMove}>Move</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmations */}
      <AlertDialog open={!!deleteFolderTarget} onOpenChange={(o) => { if (!o) setDeleteFolderTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder?</AlertDialogTitle>
            <AlertDialogDescription>
              Files inside "{deleteFolderTarget?.name}" will be moved to All files. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFolder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteFileTarget} onOpenChange={(o) => { if (!o) setDeleteFileTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteFileTarget?.file_name}" will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFile} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
