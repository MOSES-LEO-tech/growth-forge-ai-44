import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import SchoolAdminLayout from "@/components/SchoolAdminLayout";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getErrorMessage } from "@/lib/errors";
import {
  CATEGORIES,
  LEVELS,
  formatAward,
  publishReadiness,
  validateRequirement,
} from "@/lib/scholarshipAdmin";
import {
  createScholarshipDraft,
  getScholarshipAdmin,
  listCatalogEvents,
  listRequirements,
  removeRequirement,
  saveRequirement,
  setScholarshipStatus,
  toScholarshipPatch,
  updateScholarship,
  type RequirementDraft,
  type ScholarshipFormValues,
} from "@/lib/supabase/scholarshipsAdmin";
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";

const EMPTY: ScholarshipFormValues = {
  title: "",
  provider_name: "",
  provider_contact: "",
  category: "merit",
  description: "",
  application_mode: "internal",
  application_url: "",
  source_url: "",
  verified_at: "",
  award_min: "",
  award_max: "",
  currency: "UGX",
  award_type: "",
  opens_at: "",
  closes_at: "",
  decision_by: "",
  levels: "",
  gender: "",
  region: "",
  subjects: "",
  activities: "",
  min_grade: "",
  need_band: "",
  renewal_terms: "",
  steps: "",
};

const toDateInput = (iso: string | null): string => (iso ? iso.slice(0, 10) : "");
const toDateTimeInput = (iso: string | null): string => (iso ? iso.slice(0, 16) : "");

const emptyRequirement = (): RequirementDraft => ({
  key: "",
  label: "",
  why: "",
  example: "",
  doc_type: "either",
  required: true,
  max_files: 1,
  sensitivity: "normal",
});

const AdminScholarshipEditor = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, userRole } = useAuth();
  const isPlatformAdmin = userRole === "super_admin";

  const [values, setValues] = useState<ScholarshipFormValues>(EMPTY);
  const [status, setStatus] = useState<"draft" | "published" | "archived">("draft");
  const [saving, setSaving] = useState(false);
  const [requirements, setRequirements] = useState<RequirementDraft[]>([]);

  const { data: record, isLoading } = useQuery({
    queryKey: ["scholarship", id],
    queryFn: () => getScholarshipAdmin(id as string),
    enabled: !isNew && !!id,
  });

  const { data: storedRequirements } = useQuery({
    queryKey: ["scholarship-requirements", id],
    queryFn: () => listRequirements(id as string),
    enabled: !isNew && !!id,
  });

  const { data: events } = useQuery({
    queryKey: ["catalog-events", id],
    queryFn: () => listCatalogEvents(id as string),
    enabled: !isNew && !!id,
  });

  useEffect(() => {
    if (!record) return;
    setStatus((record.status as typeof status) ?? "draft");
    setValues({
      title: record.title ?? "",
      provider_name: record.provider_name ?? "",
      provider_contact: record.provider_contact ?? "",
      category: record.category ?? "merit",
      description: record.description ?? "",
      application_mode: record.application_mode ?? "internal",
      application_url: record.application_url ?? "",
      source_url: record.source_url ?? "",
      verified_at: toDateInput(record.verified_at),
      award_min: record.award_min != null ? String(record.award_min) : "",
      award_max: record.award_max != null ? String(record.award_max) : "",
      currency: record.currency ?? "UGX",
      award_type: record.award_type ?? "",
      opens_at: toDateTimeInput(record.opens_at),
      closes_at: toDateTimeInput(record.closes_at),
      decision_by: toDateTimeInput(record.decision_by),
      levels: Array.isArray((record.eligibility_rules as { level?: string[] })?.level)
        ? ((record.eligibility_rules as { level?: string[] }).level ?? []).join("; ")
        : "",
      gender: "",
      region: Array.isArray((record.eligibility_rules as { region?: string[] })?.region)
        ? ((record.eligibility_rules as { region?: string[] }).region ?? []).join("; ")
        : "",
      subjects: Array.isArray((record.eligibility_rules as { subjects_any?: string[] })?.subjects_any)
        ? ((record.eligibility_rules as { subjects_any?: string[] }).subjects_any ?? []).join("; ")
        : "",
      activities: Array.isArray((record.eligibility_rules as { activities_any?: string[] })?.activities_any)
        ? ((record.eligibility_rules as { activities_any?: string[] }).activities_any ?? []).join("; ")
        : "",
      min_grade: String((record.eligibility_rules as { min_grade?: string })?.min_grade ?? ""),
      need_band: String((record.eligibility_rules as { need_band?: string })?.need_band ?? ""),
      renewal_terms: record.renewal_terms ?? "",
      steps: Array.isArray(record.steps)
        ? (record.steps as Array<{ text?: string }>).map((step, index) => `${index + 1}. ${step?.text ?? ""}`).join("\n")
        : "",
    });
  }, [record]);

  useEffect(() => {
    if (!storedRequirements) return;
    setRequirements(
      storedRequirements.map((row) => ({
        id: row.id,
        key: row.key,
        label: row.label,
        why: row.why ?? "",
        example: row.example ?? "",
        doc_type: row.doc_type,
        required: row.required,
        max_files: row.max_files,
        sensitivity: row.sensitivity,
      }))
    );
  }, [storedRequirements]);

  const set = (patch: Partial<ScholarshipFormValues>) => setValues((current) => ({ ...current, ...patch }));

  const preview = useMemo(() => toScholarshipPatch(values, user?.id ?? null), [values, user?.id]);
  const blockers = useMemo(() => publishReadiness(preview), [preview]);
  const requirementErrors = requirements
    .map((row) => validateRequirement(row))
    .filter((result) => !result.ok);

  const persist = async (): Promise<string | null> => {
    if (!isPlatformAdmin) {
      toast({ title: "Platform admin only", variant: "destructive" });
      return null;
    }
    if (!values.title.trim()) {
      toast({ title: "Title required", description: "Give the listing its provider-given name.", variant: "destructive" });
      return null;
    }
    setSaving(true);
    try {
      if (isNew) {
        const created = await createScholarshipDraft(values, user?.id ?? null);
        queryClient.invalidateQueries({ queryKey: ["scholarships"] });
        toast({ title: "Draft created", description: "Add requirements, then publish when the blockers are clear." });
        navigate(`/admin/scholarships/${created.id}/edit`, { replace: true });
        return created.id;
      }
      await updateScholarship(id as string, values, user?.id ?? null);
      queryClient.invalidateQueries({ queryKey: ["scholarships"] });
      queryClient.invalidateQueries({ queryKey: ["scholarship", id] });
      toast({ title: "Saved" });
      return id as string;
    } catch (error) {
      toast({
        title: "Save failed",
        description: getErrorMessage(error, "Unable to save this scholarship."),
        variant: "destructive",
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    const savedId = await persist();
    if (!savedId) return;
    try {
      await setScholarshipStatus(savedId, "published", user?.id ?? null);
      setStatus("published");
      queryClient.invalidateQueries({ queryKey: ["scholarships"] });
      toast({ title: "Published", description: "Students can now see this listing." });
    } catch (error) {
      toast({
        title: "Not published",
        description: getErrorMessage(error, "The database refused to publish this listing."),
        variant: "destructive",
      });
    }
  };

  const changeStatus = async (next: "draft" | "archived") => {
    if (!id) return;
    try {
      await setScholarshipStatus(id, next, user?.id ?? null);
      setStatus(next);
      queryClient.invalidateQueries({ queryKey: ["scholarships"] });
      toast({ title: next === "draft" ? "Moved back to draft" : "Archived" });
    } catch (error) {
      toast({ title: "Could not change status", description: getErrorMessage(error, ""), variant: "destructive" });
    }
  };

  const saveReq = async (index: number) => {
    if (!id) {
      toast({ title: "Save the draft first", description: "Requirements attach to a saved listing." });
      return;
    }
    const draft = requirements[index];
    const check = validateRequirement(draft);
    if (!check.ok) {
      toast({ title: "Requirement not valid", description: check.errors[0], variant: "destructive" });
      return;
    }
    try {
      await saveRequirement(id, draft, index);
      queryClient.invalidateQueries({ queryKey: ["scholarship-requirements", id] });
      toast({ title: "Requirement saved" });
    } catch (error) {
      toast({ title: "Could not save requirement", description: getErrorMessage(error, ""), variant: "destructive" });
    }
  };

  const deleteReq = async (index: number) => {
    const draft = requirements[index];
    if (draft.id) {
      try {
        await removeRequirement(draft.id);
        queryClient.invalidateQueries({ queryKey: ["scholarship-requirements", id] });
      } catch (error) {
        toast({ title: "Could not remove", description: getErrorMessage(error, ""), variant: "destructive" });
        return;
      }
    }
    setRequirements((current) => current.filter((_, i) => i !== index));
  };

  const statusBadge = status === "published" ? "bg-success-soft text-success-ink" : status === "archived" ? "bg-muted" : "bg-warning-soft text-warning-ink";

  return (
    <SchoolAdminLayout>
      <AdminPageHeader
        kicker="Scholarships"
        title={isNew ? "New scholarship" : values.title || "Untitled scholarship"}
        description="A listing may be published only with a verified source, a provider contact, a future closing date and a stated award."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="gap-2">
              <Link to="/admin/scholarships">
                <ArrowLeft className="h-4 w-4" />
                Catalog
              </Link>
            </Button>
            <Badge className={statusBadge}>{status}</Badge>
          </div>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Identity</CardTitle>
                <CardDescription>Who awards it and what it is called.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={values.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Engineering Merit Award 2027" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="provider">Provider</Label>
                  <Input id="provider" value={values.provider_name} onChange={(e) => set({ provider_name: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contact">Provider contact</Label>
                  <Input id="contact" value={values.provider_contact} onChange={(e) => set({ provider_contact: e.target.value })} placeholder="scholarships@…" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <select id="category" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={values.category} onChange={(e) => set({ category: e.target.value })}>
                    {CATEGORIES.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mode">Application mode</Label>
                  <select id="mode" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={values.application_mode} onChange={(e) => set({ application_mode: e.target.value })}>
                    <option value="internal">Internal — apply in Milestone</option>
                    <option value="external">External — provider's own form</option>
                  </select>
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" rows={3} value={values.description} onChange={(e) => set({ description: e.target.value })} placeholder="Plain language, one short paragraph." />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Award and timing</CardTitle>
                <CardDescription>Amounts come from the provider. If they only said “full tuition”, use the award type.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="award_min">Award minimum</Label>
                  <Input id="award_min" inputMode="numeric" value={values.award_min} onChange={(e) => set({ award_min: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="award_max">Award maximum</Label>
                  <Input id="award_max" inputMode="numeric" value={values.award_max} onChange={(e) => set({ award_max: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input id="currency" value={values.currency} onChange={(e) => set({ currency: e.target.value.toUpperCase().slice(0, 3) })} />
                </div>
                <div className="grid gap-2 md:col-span-3">
                  <Label htmlFor="award_type">Award type (if no amount)</Label>
                  <Input id="award_type" value={values.award_type} onChange={(e) => set({ award_type: e.target.value })} placeholder="tuition, stipend, equipment…" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="closes">Closes</Label>
                  <Input id="closes" type="datetime-local" value={values.closes_at} onChange={(e) => set({ closes_at: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="opens">Opens</Label>
                  <Input id="opens" type="datetime-local" value={values.opens_at} onChange={(e) => set({ opens_at: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="decides">Decision expected</Label>
                  <Input id="decides" type="datetime-local" value={values.decision_by} onChange={(e) => set({ decision_by: e.target.value })} />
                </div>
                <div className="grid gap-2 md:col-span-3">
                  <Label htmlFor="renewal">Renewal terms</Label>
                  <Input id="renewal" value={values.renewal_terms} onChange={(e) => set({ renewal_terms: e.target.value })} placeholder="e.g. reviewed annually, minimum B average" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Who can apply</CardTitle>
                <CardDescription>Leave a field empty to mean “anyone”. Semicolons separate values.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="levels">Levels</Label>
                  <Input id="levels" value={values.levels} onChange={(e) => set({ levels: e.target.value })} placeholder={LEVELS.join("; ")} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="region">Region</Label>
                  <Input id="region" value={values.region} onChange={(e) => set({ region: e.target.value })} placeholder="Uganda; Central Region" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="subjects">Subjects</Label>
                  <Input id="subjects" value={values.subjects} onChange={(e) => set({ subjects: e.target.value })} placeholder="Mathematics; Physics" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="activities">Activities</Label>
                  <Input id="activities" value={values.activities} onChange={(e) => set({ activities: e.target.value })} placeholder="debate; football" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="min_grade">Minimum grade</Label>
                  <Input id="min_grade" value={values.min_grade} onChange={(e) => set({ min_grade: e.target.value })} placeholder="e.g. B" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="need">Need band required</Label>
                  <select id="need" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={values.need_band} onChange={(e) => set({ need_band: e.target.value })}>
                    <option value="">Any need level</option>
                    <option value="medium">Medium or higher</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Evidence and steps</CardTitle>
                <CardDescription>Where you verified the terms, and what the student does.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="source">Source URL</Label>
                  <Input id="source" value={values.source_url} onChange={(e) => set({ source_url: e.target.value })} placeholder="https://provider…" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="verified">Verified on</Label>
                  <Input id="verified" type="date" value={values.verified_at} onChange={(e) => set({ verified_at: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="app_url">Application URL</Label>
                  <Input id="app_url" value={values.application_url} onChange={(e) => set({ application_url: e.target.value })} />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="steps">Steps, one per line</Label>
                  <Textarea id="steps" rows={4} value={values.steps} onChange={(e) => set({ steps: e.target.value })} placeholder={"1. Fill the provider's form\n2. Upload your report card"} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>What the student needs</CardTitle>
                  <CardDescription>Each requirement becomes a checklist item and an upload slot.</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setRequirements((current) => [...current, emptyRequirement()])}
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {requirements.length === 0 && (
                  <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No requirements yet. A published listing should tell the student exactly what to bring.
                  </p>
                )}
                {requirements.map((row, index) => (
                  <div key={row.id ?? `new-${index}`} className="space-y-3 rounded-lg border p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="grid gap-2">
                        <Label>Key</Label>
                        <Input value={row.key} onChange={(e) => setRequirements((c) => c.map((r, i) => (i === index ? { ...r, key: e.target.value } : r)))} placeholder="report_card" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Label</Label>
                        <Input value={row.label} onChange={(e) => setRequirements((c) => c.map((r, i) => (i === index ? { ...r, label: e.target.value } : r)))} placeholder="Your latest report card" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Why it is needed</Label>
                        <Input value={row.why} onChange={(e) => setRequirements((c) => c.map((r, i) => (i === index ? { ...r, why: e.target.value } : r)))} placeholder="Shows your grades this term." />
                      </div>
                      <div className="grid gap-2">
                        <Label>Example</Label>
                        <Input value={row.example} onChange={(e) => setRequirements((c) => c.map((r, i) => (i === index ? { ...r, example: e.target.value } : r)))} placeholder="A photo is fine." />
                      </div>
                      <div className="grid gap-2">
                        <Label>Document type</Label>
                        <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={row.doc_type} onChange={(e) => setRequirements((c) => c.map((r, i) => (i === index ? { ...r, doc_type: e.target.value } : r)))}>
                          <option value="either">PDF or image</option>
                          <option value="pdf">PDF only</option>
                          <option value="image">Image only</option>
                          <option value="none">No upload (acknowledgement)</option>
                        </select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Sensitivity</Label>
                        <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={row.sensitivity} onChange={(e) => setRequirements((c) => c.map((r, i) => (i === index ? { ...r, sensitivity: e.target.value } : r)))}>
                          <option value="normal">Normal</option>
                          <option value="financial">Financial</option>
                          <option value="identity">Identity</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={row.required} onChange={(e) => setRequirements((c) => c.map((r, i) => (i === index ? { ...r, required: e.target.checked } : r)))} />
                        Required to submit
                      </label>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => void saveReq(index)}>Save</Button>
                        <Button type="button" size="icon" variant="ghost" aria-label="Remove requirement" onClick={() => void deleteReq(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Publish check</CardTitle>
                <CardDescription>Mirrors the database gate.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {blockers.length === 0 ? (
                  <p className="flex items-center gap-2 text-success-ink">
                    <CheckCircle2 className="h-4 w-4" /> Ready to publish
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {blockers.map((blocker) => (
                      <li key={blocker} className="flex items-start gap-2 text-warning-ink">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {blocker}
                      </li>
                    ))}
                  </ul>
                )}
                {requirementErrors.length > 0 && (
                  <p className="text-destructive">{requirementErrors.length} requirement row(s) are incomplete.</p>
                )}
                <p className="text-xs text-muted-foreground">Preview: {formatAward(preview)}</p>

                <div className="flex flex-col gap-2 pt-2">
                  <Button type="button" onClick={() => void persist()} disabled={saving || !isPlatformAdmin} className="gap-2">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save
                  </Button>
                  {status !== "published" ? (
                    <Button type="button" variant="default" onClick={() => void publish()} disabled={saving || blockers.length > 0 || !isPlatformAdmin}>
                      Publish
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" onClick={() => void changeStatus("draft")} disabled={!isPlatformAdmin}>
                      Unpublish
                    </Button>
                  )}
                  {status !== "archived" && (
                    <Button type="button" variant="ghost" onClick={() => void changeStatus("archived")} disabled={!isPlatformAdmin}>
                      Archive
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {events && events.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  {events.map((event) => (
                    <p key={event.id}>
                      {new Date(event.created_at).toLocaleString()} · {event.action}
                      {event.before && event.after && event.before.status !== event.after.status
                        ? ` · ${String(event.before.status)} → ${String(event.after.status)}`
                        : ""}
                    </p>
                  ))}
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      )}
    </SchoolAdminLayout>
  );
};

export default AdminScholarshipEditor;
