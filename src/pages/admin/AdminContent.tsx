import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Eye,
  FileDown,
  History,
  Images,
  LayoutGrid,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  Send,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import AdminShell from "@/components/AdminShell";
import SchoolAdminLayout from "@/components/SchoolAdminLayout";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import SchoolPageEditor from "@/components/admin/SchoolPageEditor";
import RichTextEditor from "@/components/RichTextEditor";
import SanitizedHtml from "@/components/SanitizedHtml";
import { cn } from "@/lib/utils";
import type { CmsAudience, CmsContentVersion, CmsEvent, CmsNews, CmsPage, CmsResource } from "@/integrations/supabase/types";
import {
  createCmsEvent,
  createCmsNews,
  createCmsPage,
  createCmsResource,
  deleteCmsEvent,
  deleteCmsNews,
  deleteCmsPage,
  deleteCmsResource,
  listCmsVersions,
  listSchoolEvents,
  listSchoolNews,
  listSchoolPages,
  listSchoolResources,
  publishCms,
  rejectCms,
  restoreCmsVersion,
  submitCmsForReview,
  updateCmsEvent,
  updateCmsNews,
  updateCmsPage,
  updateCmsResource,
  uploadCmsMedia,
  type CmsEntityType,
} from "@/lib/supabase/cms";

type CmsStatus = "draft" | "pending_review" | "published" | "rejected";

const STATUS_STYLES: Record<CmsStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  pending_review: "bg-amber-100 text-amber-700 border-amber-200",
  published: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-100 text-rose-700 border-rose-200",
};

const STATUS_LABELS: Record<CmsStatus, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  published: "Published",
  rejected: "Rejected",
};

const AUDIENCES: { value: CmsAudience; label: string }[] = [
  { value: "public", label: "Public" },
  { value: "students", label: "Students" },
  { value: "staff", label: "Staff" },
];

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const fieldClasses = "mt-1.5 w-full";
const labelClasses = "text-sm font-medium";

const StatusBadge = ({ status, scheduled = false }: { status: CmsStatus; scheduled?: boolean }) => (
  <Badge variant="outline" className={scheduled ? "bg-sky-100 text-sky-700 border-sky-200" : STATUS_STYLES[status]}>
    {scheduled ? "Scheduled" : STATUS_LABELS[status]}
  </Badge>
);

interface WorkflowToolbarProps {
  itemId: string;
  status: CmsStatus;
  entityType: CmsEntityType;
  busyAction: string | null;
  isAdmin: boolean;
  isOwner: boolean;
  onRun: (action: "submit" | "publish" | "reject" | "history", id: string) => void;
}

const WorkflowToolbar = ({
  itemId,
  status,
  entityType,
  busyAction,
  isAdmin,
  isOwner,
  onRun,
}: WorkflowToolbarProps) => {
  void entityType;
  const canWorkflow = isAdmin || isOwner;
  if (!canWorkflow) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {status === "draft" && (
        <Button size="sm" variant="outline" disabled={busyAction !== null} onClick={() => onRun("submit", itemId)}>
          <Send className="mr-1.5 h-3.5 w-3.5" /> Submit
        </Button>
      )}
      {isAdmin && (status === "draft" || status === "pending_review") && (
        <Button size="sm" variant="outline" disabled={busyAction !== null} onClick={() => onRun("publish", itemId)}>
          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Publish
        </Button>
      )}
      {isAdmin && status === "pending_review" && (
        <Button size="sm" variant="outline" disabled={busyAction !== null} onClick={() => onRun("reject", itemId)}>
          <XCircle className="mr-1.5 h-3.5 w-3.5" /> Reject
        </Button>
      )}
      <Button size="sm" variant="ghost" disabled={busyAction !== null} onClick={() => onRun("history", itemId)}>
        <History className="mr-1.5 h-3.5 w-3.5" /> History
      </Button>
      {busyAction === itemId && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
    </div>
  );
};

interface UploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  accept?: string;
  folder: "images" | "files";
  schoolId: string;
  label: string;
  placeholder?: string;
  busy?: boolean;
  onBusyChange?: (busy: boolean) => void;
}

const UploadField = ({
  value,
  onChange,
  accept = "image/*",
  folder,
  schoolId,
  label,
  placeholder,
  busy,
  onBusyChange,
}: UploadFieldProps) => {
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    onBusyChange?.(true);
    try {
      const url = await uploadCmsMedia({ schoolId, file, folder });
      onChange(url);
      toast({ title: "Upload complete" });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: getErrorMessage(error, "Unable to upload this file."),
        variant: "destructive",
      });
    } finally {
      onBusyChange?.(false);
    }
  };

  return (
    <div>
      <Label className={labelClasses}>{label}</Label>
      <div className="mt-1.5 flex gap-2">
        <Input
          className="flex-1"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <label className="inline-flex">
          <span
            role="button"
            tabIndex={0}
            aria-label={`Upload ${label}`}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") (event.target as HTMLElement).click();
            }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload
          </span>
          <input
            type="file"
            accept={accept}
            className="hidden"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
              event.target.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
};

interface PreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  meta: string[];
  bodyHtml?: string | null;
  heroImageUrl?: string | null;
  plainBody?: string | null;
}

const PreviewDialog = ({
  open,
  onOpenChange,
  title,
  meta,
  bodyHtml,
  heroImageUrl,
  plainBody,
}: PreviewDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Preview</DialogTitle>
        <DialogDescription>How this content will look on the school profile.</DialogDescription>
      </DialogHeader>
      <div className="rounded-lg border bg-card">
        {heroImageUrl && (
          <img src={heroImageUrl} alt={title} className="h-48 w-full rounded-t-lg object-cover" />
        )}
        <div className="space-y-2 p-5">
          <h2 className="text-xl font-semibold">{title}</h2>
          {meta.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {meta.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          )}
          {bodyHtml ? (
            <SanitizedHtml html={bodyHtml} className="rich-text" />
          ) : plainBody ? (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{plainBody}</p>
          ) : null}
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

interface EditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  busy: boolean;
  onSave: () => void;
  onPreview: () => void;
  children: React.ReactNode;
}

const EditorDialog = ({ open, onOpenChange, title, description, busy, onSave, onPreview, children }: EditorDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[88vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">{children}</div>
      <DialogFooter>
        <Button variant="outline" onClick={onPreview}>
          <Eye className="mr-1.5 h-4 w-4" /> Preview
        </Button>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button disabled={busy} onClick={onSave}>
          {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Save
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

interface EntityHeaderProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onNew: () => void;
}

const EntityHeader = ({ icon, title, description, onNew }: EntityHeaderProps) => (
  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
    <div className="flex items-center gap-3">
      <div className="flat-icon h-9 w-9 shrink-0">{icon}</div>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
    <Button size="sm" onClick={onNew}>
      <Plus className="mr-1.5 h-4 w-4" /> New {title}
    </Button>
  </div>
);

const EmptyState = ({ onNew }: { onNew: () => void }) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-12 text-center">
    <p className="text-sm text-muted-foreground">Nothing here yet.</p>
    <Button size="sm" onClick={onNew}>
      <Plus className="mr-1.5 h-4 w-4" /> Create the first item
    </Button>
  </div>
);

interface VersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: CmsEntityType;
  entityId: string;
}

const VersionHistoryDialog = ({ open, onOpenChange, entityType, entityId }: VersionHistoryDialogProps) => {
  const { toast } = useToast();
  const [versions, setVersions] = useState<CmsContentVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);

  const loadVersions = useCallback(async () => {
    setLoading(true);
    try {
      setVersions(await listCmsVersions(entityType, entityId));
    } catch (error) {
      toast({
        title: "History failed",
        description: getErrorMessage(error, "Unable to load version history."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType, toast]);

  useEffect(() => {
    if (open) void loadVersions();
  }, [open, loadVersions]);

  const handleRestore = async (version: number) => {
    setRestoring(version);
    try {
      await restoreCmsVersion(entityType, entityId, version);
      toast({ title: "Version restored", description: "Restored as a new draft revision." });
      await loadVersions();
    } catch (error) {
      toast({
        title: "Restore failed",
        description: getErrorMessage(error, "Unable to restore that version."),
        variant: "destructive",
      });
    } finally {
      setRestoring(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Version history</DialogTitle>
          <DialogDescription>Every save and publish is snapshotted here. Restoring creates a new draft revision.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : versions.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No versions recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {versions.map((row) => (
              <Card key={row.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="text-sm font-medium">
                      Version {row.version}
                      {row.version === versions[0]?.version ? (
                        <span className="ml-2 text-xs text-muted-foreground">(latest)</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={restoring !== null || row.version === versions[0]?.version}
                    onClick={() => void handleRestore(row.version)}
                  >
                    {restoring === row.version ? <Loader2 className="h-4 w-4 animate-spin" /> : "Restore as draft"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

interface RejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string) => void;
  busy: boolean;
}

const RejectDialog = ({ open, onOpenChange, onSubmit, busy }: RejectDialogProps) => {
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject content</DialogTitle>
          <DialogDescription>The author will see your reason and can revise before resubmitting.</DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor="reject-reason">Reason</Label>
          <Textarea
            id="reject-reason"
            className="mt-1.5"
            placeholder="What needs to change before this can be published?"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={busy} onClick={() => onSubmit(reason)}>
            {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface PageDraft {
  editing?: CmsPage;
  slug: string;
  title: string;
  content: string;
  heroImageUrl: string;
}

interface NewsDraft {
  editing?: CmsNews;
  title: string;
  body: string;
  audience: CmsAudience;
  featured: boolean;
  publishAt: string;
  expireAt: string;
}

interface EventDraft {
  editing?: CmsEvent;
  title: string;
  description: string;
  location: string;
  eventDate: string;
  endDate: string;
  audience: CmsAudience;
}

interface ResourceDraft {
  editing?: CmsResource;
  title: string;
  description: string;
  category: string;
  fileUrl: string;
  fileType: string;
  fileSize: string;
  tags: string;
}

const AdminContent = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const schoolId = profile?.school_id ?? null;
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  const isTeacher = profile?.role === "teacher";

  const [activeTab, setActiveTab] = useState(isAdmin ? "pages" : "news");
  const [myOnly, setMyOnly] = useState(isTeacher);

  const [pages, setPages] = useState<CmsPage[]>([]);
  const [news, setNews] = useState<CmsNews[]>([]);
  const [events, setEvents] = useState<CmsEvent[]>([]);
  const [resources, setResources] = useState<CmsResource[]>([]);

  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [pageDraft, setPageDraft] = useState<PageDraft | null>(null);
  const [newsDraft, setNewsDraft] = useState<NewsDraft | null>(null);
  const [eventDraft, setEventDraft] = useState<EventDraft | null>(null);
  const [resourceDraft, setResourceDraft] = useState<ResourceDraft | null>(null);

  const [historyTarget, setHistoryTarget] = useState<{ entityType: CmsEntityType; entityId: string } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ entityType: CmsEntityType; entityId: string } | null>(null);
  const [preview, setPreview] = useState<{ title: string; meta: string[]; bodyHtml?: string | null; heroImageUrl?: string | null; plainBody?: string | null } | null>(null);

  const loadAll = useCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [p, n, e, r] = await Promise.all([
        listSchoolPages(schoolId),
        listSchoolNews(schoolId),
        listSchoolEvents(schoolId),
        listSchoolResources(schoolId),
      ]);
      setPages(p);
      setNews(n);
      setEvents(e);
      setResources(r);
    } catch (error) {
      toast({
        title: "CMS data failed",
        description: getErrorMessage(error, "Unable to load school content."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [schoolId, toast]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const runAction = async (action: "submit" | "publish" | "reject" | "history", entityType: CmsEntityType, entityId: string) => {
    if (action === "history") {
      setHistoryTarget({ entityType, entityId });
      return;
    }
    if (action === "reject") {
      setRejectTarget({ entityType, entityId });
      return;
    }
    setBusyAction(entityId);
    try {
      if (action === "submit") await submitCmsForReview(entityType, entityId);
      if (action === "publish") await publishCms(entityType, entityId);
      toast({ title: "Content updated", description: `Moved to ${action === "submit" ? "pending review" : "published"}.` });
      await loadAll();
    } catch (error) {
      toast({
        title: "Action failed",
        description: getErrorMessage(error, "Unable to update content."),
        variant: "destructive",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleReject = async (reason: string) => {
    if (!rejectTarget) return;
    setBusyAction(rejectTarget.entityId);
    try {
      await rejectCms(rejectTarget.entityType, rejectTarget.entityId, reason);
      toast({ title: "Content rejected", description: "The author has been notified of the outcome." });
      setRejectTarget(null);
      await loadAll();
    } catch (error) {
      toast({
        title: "Reject failed",
        description: getErrorMessage(error, "Unable to reject content."),
        variant: "destructive",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleDelete = async (entityType: CmsEntityType, id: string) => {
    setBusyAction(id);
    try {
      if (entityType === "cms_pages") await deleteCmsPage(id);
      if (entityType === "cms_news") await deleteCmsNews(id);
      if (entityType === "cms_events") await deleteCmsEvent(id);
      if (entityType === "cms_resources") await deleteCmsResource(id);
      toast({ title: "Content deleted" });
      await loadAll();
    } catch (error) {
      toast({
        title: "Delete failed",
        description: getErrorMessage(error, "Unable to delete content."),
        variant: "destructive",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const canManage = (createdBy: string | null) => isAdmin || profile?.id === createdBy;

  const savePage = async () => {
    if (!pageDraft || !schoolId) return;
    setSaving(true);
    try {
      const payload = {
        slug: pageDraft.slug || slugify(pageDraft.title),
        title: pageDraft.title,
        content: pageDraft.content,
        hero_image_url: pageDraft.heroImageUrl || null,
      };
      if (pageDraft.editing) await updateCmsPage(pageDraft.editing.id, payload);
      else await createCmsPage({ school_id: schoolId, ...payload });
      toast({ title: "Page saved" });
      setPageDraft(null);
      await loadAll();
    } catch (error) {
      toast({ title: "Save failed", description: getErrorMessage(error, "Unable to save the page."), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveNews = async () => {
    if (!newsDraft || !schoolId) return;
    setSaving(true);
    try {
      const payload = {
        title: newsDraft.title,
        body: newsDraft.body,
        audience: newsDraft.audience,
        featured: newsDraft.featured,
        publish_at: newsDraft.publishAt ? new Date(newsDraft.publishAt).toISOString() : null,
        expire_at: newsDraft.expireAt ? new Date(newsDraft.expireAt).toISOString() : null,
      };
      if (newsDraft.editing) await updateCmsNews(newsDraft.editing.id, payload);
      else await createCmsNews({ school_id: schoolId, ...payload });
      toast({ title: "News saved" });
      setNewsDraft(null);
      await loadAll();
    } catch (error) {
      toast({ title: "Save failed", description: getErrorMessage(error, "Unable to save the news item."), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveEvent = async () => {
    if (!eventDraft || !schoolId) return;
    setSaving(true);
    try {
      const payload = {
        title: eventDraft.title,
        description: eventDraft.description || null,
        location: eventDraft.location || null,
        event_date: new Date(eventDraft.eventDate).toISOString(),
        end_date: eventDraft.endDate ? new Date(eventDraft.endDate).toISOString() : null,
        audience: eventDraft.audience,
      };
      if (eventDraft.editing) await updateCmsEvent(eventDraft.editing.id, payload);
      else await createCmsEvent({ school_id: schoolId, ...payload });
      toast({ title: "Event saved" });
      setEventDraft(null);
      await loadAll();
    } catch (error) {
      toast({ title: "Save failed", description: getErrorMessage(error, "Unable to save the event."), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveResource = async () => {
    if (!resourceDraft || !schoolId) return;
    setSaving(true);
    try {
      const payload = {
        title: resourceDraft.title,
        description: resourceDraft.description || null,
        category: resourceDraft.category || null,
        file_url: resourceDraft.fileUrl,
        file_type: resourceDraft.fileType || null,
        file_size: resourceDraft.fileSize ? Number(resourceDraft.fileSize) : null,
        tags: resourceDraft.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      };
      if (resourceDraft.editing) await updateCmsResource(resourceDraft.editing.id, payload);
      else await createCmsResource({ school_id: schoolId, ...payload });
      toast({ title: "Resource saved" });
      setResourceDraft(null);
      await loadAll();
    } catch (error) {
      toast({ title: "Save failed", description: getErrorMessage(error, "Unable to save the resource."), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!schoolId) {
    const Shell = isAdmin ? SchoolAdminLayout : AdminShell;
    return (
      <Shell>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-semibold">No school linked</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Content management is tied to a school. Link your account to a school before publishing content.
          </p>
        </div>
      </Shell>
    );
  }

  const filteredNews = myOnly ? news.filter((item) => item.created_by === profile?.id) : news;
  const filteredEvents = myOnly ? events.filter((item) => item.created_by === profile?.id) : events;
  const filteredResources = myOnly ? resources.filter((item) => item.created_by === profile?.id) : resources;
  const filteredPages = myOnly ? pages.filter((item) => item.created_by === profile?.id) : pages;

  const Shell = isAdmin ? SchoolAdminLayout : AdminShell;

  return (
    <Shell>
      <div className="mx-auto max-w-5xl">
        <AdminPageHeader
          kicker="Content management"
          title="School CMS"
          description="Author and publish your school's public page — about, news, events, resources, and gallery. Every save is versioned and content flows through the approval workflow before going live."
          actions={
            isTeacher ? (
              <div className="flex items-center gap-2">
                <Label htmlFor="my-content" className={labelClasses}>
                  My content
                </Label>
                <Switch id="my-content" checked={myOnly} onCheckedChange={setMyOnly} />
              </div>
            ) : undefined
          }
        />

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList
              className={cn(
                "grid w-full grid-cols-2 sm:grid-cols-4",
                isAdmin ? "max-w-3xl lg:grid-cols-5" : "max-w-2xl"
              )}
            >
              {isAdmin && <TabsTrigger value="pages">Pages</TabsTrigger>}
              <TabsTrigger value="news">News</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
              {isAdmin && <TabsTrigger value="school">School page</TabsTrigger>}
            </TabsList>

            {isAdmin && (
              <TabsContent value="pages" className="mt-6">
                <EntityHeader
                  icon={<LayoutGrid className="h-4 w-4" />}
                  title="Pages"
                  description="Website pages like About, Admissions, and Contact."
                  onNew={() => setPageDraft({ slug: "", title: "", content: "", heroImageUrl: "" })}
                />
                {filteredPages.length === 0 ? (
                  <EmptyState onNew={() => setPageDraft({ slug: "", title: "", content: "", heroImageUrl: "" })} />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredPages.map((page) => (
                      <Card key={page.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <CardTitle className="truncate text-base">{page.title}</CardTitle>
                              <CardDescription className="truncate">/{page.slug}</CardDescription>
                            </div>
                            <StatusBadge status={page.status} />
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <SanitizedHtml html={page.content} className="rich-text line-clamp-3" />
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <WorkflowToolbar
                              itemId={page.id}
                              status={page.status}
                              entityType="cms_pages"
                              busyAction={busyAction}
                              isAdmin={isAdmin}
                              isOwner={canManage(page.created_by)}
                              onRun={(action, id) => void runAction(action, "cms_pages", id)}
                            />
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={busyAction !== null}
                                onClick={() =>
                                  setPreview({
                                    title: page.title,
                                    meta: [`/${page.slug}`],
                                    bodyHtml: page.content,
                                    heroImageUrl: page.hero_image_url,
                                  })
                                }
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              {canManage(page.created_by) && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={busyAction !== null}
                                    onClick={() =>
                                      setPageDraft({
                                        editing: page,
                                        slug: page.slug,
                                        title: page.title,
                                        content: page.content,
                                        heroImageUrl: page.hero_image_url || "",
                                      })
                                    }
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                    disabled={busyAction !== null}
                                    onClick={() => void handleDelete("cms_pages", page.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            )}

            <TabsContent value="news" className="mt-6">
              <EntityHeader
                icon={<Megaphone className="h-4 w-4" />}
                title="News"
                description="Announcements and updates shown on the school profile."
                onNew={() => setNewsDraft({ title: "", body: "", audience: "public", featured: false, publishAt: "", expireAt: "" })}
              />
              {filteredNews.length === 0 ? (
                <EmptyState onNew={() => setNewsDraft({ title: "", body: "", audience: "public", featured: false, publishAt: "", expireAt: "" })} />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredNews.map((item) => {
                    const scheduled =
                      item.status === "published" && !!item.publish_at && new Date(item.publish_at) > new Date();
                    return (
                      <Card key={item.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base">{item.title}</CardTitle>
                            <StatusBadge status={item.status} scheduled={scheduled} />
                          </div>
                          <CardDescription>
                            {AUDIENCES.find((audience) => audience.value === item.audience)?.label}
                            {item.featured ? " · Featured" : ""}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <SanitizedHtml html={item.body} className="rich-text line-clamp-3" />
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <WorkflowToolbar
                              itemId={item.id}
                              status={item.status}
                              entityType="cms_news"
                              busyAction={busyAction}
                              isAdmin={isAdmin}
                              isOwner={canManage(item.created_by)}
                              onRun={(action, id) => void runAction(action, "cms_news", id)}
                            />
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={busyAction !== null}
                                onClick={() =>
                                  setPreview({
                                    title: item.title,
                                    meta: [
                                      AUDIENCES.find((audience) => audience.value === item.audience)?.label || "",
                                      item.publish_at ? new Date(item.publish_at).toLocaleDateString() : "",
                                    ].filter(Boolean),
                                    bodyHtml: item.body,
                                  })
                                }
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              {canManage(item.created_by) && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={busyAction !== null}
                                    onClick={() =>
                                      setNewsDraft({
                                        editing: item,
                                        title: item.title,
                                        body: item.body,
                                        audience: item.audience as CmsAudience,
                                        featured: item.featured,
                                        publishAt: item.publish_at ? item.publish_at.slice(0, 16) : "",
                                        expireAt: item.expire_at ? item.expire_at.slice(0, 16) : "",
                                      })
                                    }
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                    disabled={busyAction !== null}
                                    onClick={() => void handleDelete("cms_news", item.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="events" className="mt-6">
              <EntityHeader
                icon={<CalendarDays className="h-4 w-4" />}
                title="Events"
                description="Upcoming school calendar items shown on the public profile."
                onNew={() => setEventDraft({ title: "", description: "", location: "", eventDate: "", endDate: "", audience: "public" })}
              />
              {filteredEvents.length === 0 ? (
                <EmptyState onNew={() => setEventDraft({ title: "", description: "", location: "", eventDate: "", endDate: "", audience: "public" })} />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredEvents.map((event) => (
                    <Card key={event.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base">{event.title}</CardTitle>
                          <StatusBadge status={event.status} />
                        </div>
                        <CardDescription>
                          {new Date(event.event_date).toLocaleDateString()}
                          {event.location ? ` · ${event.location}` : ""}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {event.description ? (
                          <SanitizedHtml html={event.description} className="rich-text line-clamp-2" />
                        ) : null}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <WorkflowToolbar
                            itemId={event.id}
                            status={event.status}
                            entityType="cms_events"
                            busyAction={busyAction}
                            isAdmin={isAdmin}
                            isOwner={canManage(event.created_by)}
                            onRun={(action, id) => void runAction(action, "cms_events", id)}
                          />
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busyAction !== null}
                              onClick={() =>
                                setPreview({
                                  title: event.title,
                                  meta: [
                                    new Date(event.event_date).toLocaleString(),
                                    event.location || "",
                                    AUDIENCES.find((audience) => audience.value === event.audience)?.label || "",
                                  ].filter(Boolean),
                                  bodyHtml: event.description,
                                })
                              }
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {canManage(event.created_by) && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={busyAction !== null}
                                  onClick={() =>
                                    setEventDraft({
                                      editing: event,
                                      title: event.title,
                                      description: event.description || "",
                                      location: event.location || "",
                                      eventDate: event.event_date.slice(0, 16),
                                      endDate: event.end_date ? event.end_date.slice(0, 16) : "",
                                      audience: event.audience as CmsAudience,
                                    })
                                  }
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  disabled={busyAction !== null}
                                  onClick={() => void handleDelete("cms_events", event.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="resources" className="mt-6">
              <EntityHeader
                icon={<FileDown className="h-4 w-4" />}
                title="Resources"
                description="Documents and downloads available from the school profile."
                onNew={() => setResourceDraft({ title: "", description: "", category: "", fileUrl: "", fileType: "", fileSize: "", tags: "" })}
              />
              {filteredResources.length === 0 ? (
                <EmptyState onNew={() => setResourceDraft({ title: "", description: "", category: "", fileUrl: "", fileType: "", fileSize: "", tags: "" })} />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredResources.map((resource) => (
                    <Card key={resource.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base">{resource.title}</CardTitle>
                          <StatusBadge status={resource.status} />
                        </div>
                        <CardDescription>
                          {resource.category || "Uncategorized"}
                          {resource.file_type ? ` · ${resource.file_type}` : ""}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {resource.description ? (
                          <p className="line-clamp-2 text-sm text-muted-foreground">{resource.description}</p>
                        ) : null}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <WorkflowToolbar
                            itemId={resource.id}
                            status={resource.status}
                            entityType="cms_resources"
                            busyAction={busyAction}
                            isAdmin={isAdmin}
                            isOwner={canManage(resource.created_by)}
                            onRun={(action, id) => void runAction(action, "cms_resources", id)}
                          />
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busyAction !== null}
                              onClick={() =>
                                setPreview({
                                  title: resource.title,
                                  meta: [resource.category || "Uncategorized", resource.file_type || ""].filter(Boolean),
                                  plainBody: resource.description,
                                })
                              }
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {canManage(resource.created_by) && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={busyAction !== null}
                                  onClick={() =>
                                    setResourceDraft({
                                      editing: resource,
                                      title: resource.title,
                                      description: resource.description || "",
                                      category: resource.category || "",
                                      fileUrl: resource.file_url,
                                      fileType: resource.file_type || "",
                                      fileSize: resource.file_size != null ? String(resource.file_size) : "",
                                      tags: resource.tags.join(", "),
                                    })
                                  }
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  disabled={busyAction !== null}
                                  onClick={() => void handleDelete("cms_resources", resource.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {isAdmin && (
              <TabsContent value="school" className="mt-6">
                <EntityHeader
                  icon={<Images className="h-4 w-4" />}
                  title="School page"
                  description="Edit the hero image or video and the gallery shown on your public school page."
                />
                <SchoolPageEditor schoolId={schoolId} />
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>

      {pageDraft && (
        <EditorDialog
          open
          onOpenChange={(open) => !open && setPageDraft(null)}
          title={pageDraft.editing ? "Edit page" : "New page"}
          description="Pages render publicly once published. Slug is part of the public URL."
          busy={saving}
          onSave={() => void savePage()}
          onPreview={() =>
            setPreview({
              title: pageDraft.title || "Untitled page",
              meta: [`/${pageDraft.slug || slugify(pageDraft.title) || "page"}`],
              bodyHtml: pageDraft.content,
              heroImageUrl: pageDraft.heroImageUrl || null,
            })
          }
        >
          <div>
            <Label htmlFor="page-title" className={labelClasses}>Title</Label>
            <Input id="page-title" className={fieldClasses} value={pageDraft.title} onChange={(event) => setPageDraft({ ...pageDraft, title: event.target.value })} />
          </div>
          <div>
            <Label htmlFor="page-slug" className={labelClasses}>Slug</Label>
            <Input id="page-slug" className={fieldClasses} placeholder="about" value={pageDraft.slug} onChange={(event) => setPageDraft({ ...pageDraft, slug: slugify(event.target.value) })} />
          </div>
          <UploadField
            label="Hero image"
            value={pageDraft.heroImageUrl}
            onChange={(url) => setPageDraft({ ...pageDraft, heroImageUrl: url })}
            accept="image/*"
            folder="images"
            schoolId={schoolId}
            placeholder="https://... or upload"
            busy={uploading}
            onBusyChange={setUploading}
          />
          <div>
            <Label className={labelClasses}>Content</Label>
            <RichTextEditor
              className="mt-1.5"
              value={pageDraft.content}
              onChange={(content) => setPageDraft({ ...pageDraft, content })}
              placeholder="Start writing…"
              minHeight={220}
              onImageUpload={async (file) => {
                const url = await uploadCmsMedia({ schoolId, file, folder: "images" });
                return url;
              }}
            />
          </div>
        </EditorDialog>
      )}

      {newsDraft && (
        <EditorDialog
          open
          onOpenChange={(open) => !open && setNewsDraft(null)}
          title={newsDraft.editing ? "Edit news" : "New news item"}
          description="Announcements appear in the school's News feed once published."
          busy={saving}
          onSave={() => void saveNews()}
          onPreview={() =>
            setPreview({
              title: newsDraft.title || "Untitled news",
              meta: [AUDIENCES.find((audience) => audience.value === newsDraft.audience)?.label || ""],
              bodyHtml: newsDraft.body,
            })
          }
        >
          <div>
            <Label htmlFor="news-title" className={labelClasses}>Title</Label>
            <Input id="news-title" className={fieldClasses} value={newsDraft.title} onChange={(event) => setNewsDraft({ ...newsDraft, title: event.target.value })} />
          </div>
          <div>
            <Label className={labelClasses}>Body</Label>
            <RichTextEditor
              className="mt-1.5"
              value={newsDraft.body}
              onChange={(body) => setNewsDraft({ ...newsDraft, body })}
              placeholder="Write the story…"
              minHeight={200}
              onImageUpload={async (file) => {
                const url = await uploadCmsMedia({ schoolId, file, folder: "images" });
                return url;
              }}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="news-audience" className={labelClasses}>Audience</Label>
              <Select value={newsDraft.audience} onValueChange={(value) => setNewsDraft({ ...newsDraft, audience: value as CmsAudience })}>
                <SelectTrigger id="news-audience" className={fieldClasses}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUDIENCES.map((audience) => (
                    <SelectItem key={audience.value} value={audience.value}>
                      {audience.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end justify-between gap-2 pb-1">
              <Label htmlFor="news-featured" className={labelClasses}>Featured</Label>
              <Switch id="news-featured" checked={newsDraft.featured} onCheckedChange={(checked) => setNewsDraft({ ...newsDraft, featured: checked })} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="news-publish-at" className={labelClasses}>Publish after</Label>
              <Input id="news-publish-at" type="datetime-local" className={fieldClasses} value={newsDraft.publishAt} onChange={(event) => setNewsDraft({ ...newsDraft, publishAt: event.target.value })} />
            </div>
            <div>
              <Label htmlFor="news-expire-at" className={labelClasses}>Expire at</Label>
              <Input id="news-expire-at" type="datetime-local" className={fieldClasses} value={newsDraft.expireAt} onChange={(event) => setNewsDraft({ ...newsDraft, expireAt: event.target.value })} />
            </div>
          </div>
        </EditorDialog>
      )}

      {eventDraft && (
        <EditorDialog
          open
          onOpenChange={(open) => !open && setEventDraft(null)}
          title={eventDraft.editing ? "Edit event" : "New event"}
          description="Events appear on the school calendar once published."
          busy={saving}
          onSave={() => void saveEvent()}
          onPreview={() =>
            setPreview({
              title: eventDraft.title || "Untitled event",
              meta: [eventDraft.eventDate ? new Date(eventDraft.eventDate).toLocaleString() : "", eventDraft.location || ""].filter(Boolean),
              bodyHtml: eventDraft.description,
            })
          }
        >
          <div>
            <Label htmlFor="event-title" className={labelClasses}>Title</Label>
            <Input id="event-title" className={fieldClasses} value={eventDraft.title} onChange={(event) => setEventDraft({ ...eventDraft, title: event.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="event-date" className={labelClasses}>Starts</Label>
              <Input id="event-date" type="datetime-local" className={fieldClasses} value={eventDraft.eventDate} onChange={(event) => setEventDraft({ ...eventDraft, eventDate: event.target.value })} />
            </div>
            <div>
              <Label htmlFor="event-end" className={labelClasses}>Ends</Label>
              <Input id="event-end" type="datetime-local" className={fieldClasses} value={eventDraft.endDate} onChange={(event) => setEventDraft({ ...eventDraft, endDate: event.target.value })} />
            </div>
          </div>
          <div>
            <Label htmlFor="event-location" className={labelClasses}>Location</Label>
            <Input id="event-location" className={fieldClasses} placeholder="Main hall" value={eventDraft.location} onChange={(event) => setEventDraft({ ...eventDraft, location: event.target.value })} />
          </div>
          <div>
            <Label className={labelClasses}>Description</Label>
            <RichTextEditor
              className="mt-1.5"
              value={eventDraft.description}
              onChange={(description) => setEventDraft({ ...eventDraft, description })}
              placeholder="Event details…"
              minHeight={120}
              onImageUpload={async (file) => {
                const url = await uploadCmsMedia({ schoolId, file, folder: "images" });
                return url;
              }}
            />
          </div>
          <div>
            <Label htmlFor="event-audience" className={labelClasses}>Audience</Label>
            <Select value={eventDraft.audience} onValueChange={(value) => setEventDraft({ ...eventDraft, audience: value as CmsAudience })}>
              <SelectTrigger id="event-audience" className={fieldClasses}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUDIENCES.map((audience) => (
                  <SelectItem key={audience.value} value={audience.value}>
                    {audience.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </EditorDialog>
      )}

      {resourceDraft && (
        <EditorDialog
          open
          onOpenChange={(open) => !open && setResourceDraft(null)}
          title={resourceDraft.editing ? "Edit resource" : "New resource"}
          description="Downloads are listed on the school profile once published."
          busy={saving}
          onSave={() => void saveResource()}
          onPreview={() =>
            setPreview({
              title: resourceDraft.title || "Untitled resource",
              meta: [resourceDraft.category || "Uncategorized", resourceDraft.fileType || ""].filter(Boolean),
              plainBody: resourceDraft.description,
            })
          }
        >
          <div>
            <Label htmlFor="resource-title" className={labelClasses}>Title</Label>
            <Input id="resource-title" className={fieldClasses} value={resourceDraft.title} onChange={(event) => setResourceDraft({ ...resourceDraft, title: event.target.value })} />
          </div>
          <UploadField
            label="File"
            value={resourceDraft.fileUrl}
            onChange={(url) => setResourceDraft({ ...resourceDraft, fileUrl: url })}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,application/pdf,text/plain"
            folder="files"
            schoolId={schoolId}
            placeholder="https://... or upload"
            busy={uploading}
            onBusyChange={setUploading}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="resource-category" className={labelClasses}>Category</Label>
              <Input id="resource-category" className={fieldClasses} placeholder="Forms" value={resourceDraft.category} onChange={(event) => setResourceDraft({ ...resourceDraft, category: event.target.value })} />
            </div>
            <div>
              <Label htmlFor="resource-type" className={labelClasses}>File type</Label>
              <Input id="resource-type" className={fieldClasses} placeholder="PDF" value={resourceDraft.fileType} onChange={(event) => setResourceDraft({ ...resourceDraft, fileType: event.target.value })} />
            </div>
            <div>
              <Label htmlFor="resource-size" className={labelClasses}>Size (bytes)</Label>
              <Input id="resource-size" type="number" className={fieldClasses} placeholder="1024" value={resourceDraft.fileSize} onChange={(event) => setResourceDraft({ ...resourceDraft, fileSize: event.target.value })} />
            </div>
          </div>
          <div>
            <Label htmlFor="resource-tags" className={labelClasses}>Tags (comma-separated)</Label>
            <Input id="resource-tags" className={fieldClasses} placeholder="handbook, policies" value={resourceDraft.tags} onChange={(event) => setResourceDraft({ ...resourceDraft, tags: event.target.value })} />
          </div>
          <div>
            <Label htmlFor="resource-description" className={labelClasses}>Description</Label>
            <Textarea id="resource-description" className={fieldClasses} rows={3} value={resourceDraft.description} onChange={(event) => setResourceDraft({ ...resourceDraft, description: event.target.value })} />
          </div>
        </EditorDialog>
      )}

      {historyTarget && (
        <VersionHistoryDialog
          open
          onOpenChange={(open) => !open && setHistoryTarget(null)}
          entityType={historyTarget.entityType}
          entityId={historyTarget.entityId}
        />
      )}

      {rejectTarget && (
        <RejectDialog
          open
          onOpenChange={(open) => !open && setRejectTarget(null)}
          busy={busyAction === rejectTarget.entityId}
          onSubmit={(reason) => void handleReject(reason)}
        />
      )}

      {preview && (
        <PreviewDialog
          open
          onOpenChange={(open) => !open && setPreview(null)}
          title={preview.title}
          meta={preview.meta}
          bodyHtml={preview.bodyHtml}
          heroImageUrl={preview.heroImageUrl}
          plainBody={preview.plainBody}
        />
      )}
    </Shell>
  );
};

export default AdminContent;
