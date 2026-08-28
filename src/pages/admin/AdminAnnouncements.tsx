import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import AdminShell from "@/components/AdminShell";
import SchoolAdminLayout from "@/components/SchoolAdminLayout";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { supabase } from "@/integrations/supabase/client";
import type { SchoolAnnouncement } from "@/integrations/supabase/types";
import {
  createAnnouncement,
  deleteAnnouncement,
  listSchoolAnnouncements,
  publishAnnouncement,
  updateAnnouncement,
  type AnnouncementAudience,
} from "@/lib/supabase/announcements";

const AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  students: "Students",
  parents: "Parents",
  staff: "Staff",
};

const AUDIENCE_STYLES: Record<AnnouncementAudience, string> = {
  students: "bg-blue-100 text-blue-700 border-blue-200",
  parents: "bg-purple-100 text-purple-700 border-purple-200",
  staff: "bg-orange-100 text-orange-700 border-orange-200",
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

interface AnnouncementDraft {
  editing?: SchoolAnnouncement;
  title: string;
  message: string;
  audience: AnnouncementAudience;
}

const emptyDraft = (): AnnouncementDraft => ({
  title: "",
  message: "",
  audience: "students",
});

const AdminAnnouncements = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const schoolId = profile?.school_id ?? null;
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";

  const [items, setItems] = useState<SchoolAnnouncement[]>([]);
  const [creators, setCreators] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AnnouncementDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await listSchoolAnnouncements(schoolId);
      setItems(rows);
      const creatorIds = [...new Set(rows.map((row) => row.created_by).filter(Boolean))] as string[];
      if (creatorIds.length > 0) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", creatorIds);
        if (!error && data) {
          setCreators(Object.fromEntries(data.map((creator) => [creator.id, creator.full_name || "Staff"])));
        }
      }
    } catch (error) {
      toast({
        title: "Announcements failed",
        description: getErrorMessage(error, "Unable to load announcements."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [schoolId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveDraft = async () => {
    if (!draft || !schoolId) return;
    if (!draft.title.trim() || !draft.message.trim()) {
      toast({
        title: "Missing details",
        description: "Add a title and message before saving.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      if (draft.editing) {
        await updateAnnouncement(draft.editing.id, {
          title: draft.title.trim(),
          message: draft.message.trim(),
          audience: draft.audience,
        });
      } else {
        await createAnnouncement({
          school_id: schoolId,
          title: draft.title.trim(),
          message: draft.message.trim(),
          audience: draft.audience,
        });
      }
      toast({ title: "Draft saved", description: "Publishing sends it to the audience's notification feed." });
      setDraft(null);
      await load();
    } catch (error) {
      toast({
        title: "Save failed",
        description: getErrorMessage(error, "Unable to save the announcement."),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (id: string) => {
    setBusyId(id);
    try {
      const result = await publishAnnouncement(id);
      toast({
        title: "Announcement published",
        description: `Sent to ${result.recipients} recipient${result.recipients === 1 ? "" : "s"}.`,
      });
      await load();
    } catch (error) {
      toast({
        title: "Publish failed",
        description: getErrorMessage(error, "Unable to publish the announcement."),
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (item: SchoolAnnouncement) => {
    const canDelete = isAdmin || (profile?.id === item.created_by && item.status === "draft");
    if (!canDelete) return;
    setBusyId(item.id);
    try {
      await deleteAnnouncement(item.id);
      toast({ title: "Announcement deleted" });
      await load();
    } catch (error) {
      toast({
        title: "Delete failed",
        description: getErrorMessage(error, "Unable to delete the announcement."),
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const canEdit = (item: SchoolAnnouncement) =>
    isAdmin || (profile?.id === item.created_by && item.status === "draft");

  const visibleItems = useMemo(
    () =>
      isAdmin
        ? items
        : items.filter((item) => item.status === "published" || item.created_by === profile?.id),
    [items, isAdmin, profile?.id]
  );

  const Shell = isAdmin ? SchoolAdminLayout : AdminShell;

  if (!schoolId) {
    return (
      <Shell>
        <div className="py-16 text-center">
          <h1 className="text-2xl font-semibold">No school linked</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Announcements are tied to a school. Link your account to a school to continue.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <AdminPageHeader
        kicker="Announcements"
        title="School announcements"
        description="Write announcements for students, parents, or staff. Publishing delivers them straight to recipients' notification feeds."
        actions={
          <Button onClick={() => setDraft(emptyDraft())}>
            <Plus className="mr-1.5 h-4 w-4" /> New announcement
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-14 text-center">
          <Megaphone className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No announcements yet.</p>
          <Button size="sm" onClick={() => setDraft(emptyDraft())}>
            <Plus className="mr-1.5 h-4 w-4" /> Create the first one
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleItems.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{item.title}</h3>
                    <Badge variant="outline" className={AUDIENCE_STYLES[item.audience]}>
                      {AUDIENCE_LABELS[item.audience]}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        item.status === "published"
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }
                    >
                      {item.status === "published" ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{item.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {creators[item.created_by ?? ""] || "School staff"} ·{" "}
                    {item.published_at
                      ? `Published ${new Date(item.published_at).toLocaleDateString()}`
                      : `Created ${new Date(item.created_at).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {isAdmin && item.status === "draft" && (
                    <Button
                      size="sm"
                      disabled={busyId !== null}
                      onClick={() => void handlePublish(item.id)}
                    >
                      {busyId === item.id ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Publish
                    </Button>
                  )}
                  {canEdit(item) && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId !== null}
                      onClick={() =>
                        setDraft({
                          editing: item,
                          title: item.title,
                          message: item.message,
                          audience: item.audience,
                        })
                      }
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {canEdit(item) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={busyId !== null}
                      onClick={() => void handleDelete(item)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {draft && (
        <Dialog open onOpenChange={(open) => !open && setDraft(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{draft.editing ? "Edit announcement" : "New announcement"}</DialogTitle>
              <DialogDescription>
                {isAdmin
                  ? "Saving keeps it a draft; publishing delivers it to the chosen audience."
                  : "Save your draft and a school admin will review and publish it."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="announcement-title">Title</Label>
                <Input
                  id="announcement-title"
                  className="mt-1.5"
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  placeholder="Term 2 begins Monday"
                />
              </div>
              <div>
                <Label htmlFor="announcement-message">Message</Label>
                <Textarea
                  id="announcement-message"
                  className="mt-1.5"
                  rows={5}
                  value={draft.message}
                  onChange={(event) => setDraft({ ...draft, message: event.target.value })}
                  placeholder="What should your audience know?"
                />
              </div>
              <div>
                <Label htmlFor="announcement-audience">Audience</Label>
                <Select
                  value={draft.audience}
                  onValueChange={(value) => setDraft({ ...draft, audience: value as AnnouncementAudience })}
                >
                  <SelectTrigger id="announcement-audience" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(AUDIENCE_LABELS) as AnnouncementAudience[]).map((audience) => (
                      <SelectItem key={audience} value={audience}>
                        {AUDIENCE_LABELS[audience]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDraft(null)}>
                Cancel
              </Button>
              <Button disabled={saving} onClick={() => void saveDraft()}>
                {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Save draft
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Shell>
  );
};

export default AdminAnnouncements;
