import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { buildEligibilityRules, parseList } from "@/lib/scholarshipAdmin";

type Row = Database["public"]["Tables"]["scholarships"]["Row"];
type Insert = Database["public"]["Tables"]["scholarships"]["Insert"];
type Update = Database["public"]["Tables"]["scholarships"]["Update"];
type Requirement = Database["public"]["Tables"]["scholarship_requirements"]["Row"];

export type ScholarshipRecord = Row;
export type RequirementRecord = Requirement;

/** Everything, drafts included. RLS shows non-platform admins only published rows. */
export const listScholarshipsAdmin = async (): Promise<ScholarshipRecord[]> => {
  const { data, error } = await supabase
    .from("scholarships")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ScholarshipRecord[];
};

export const getScholarshipAdmin = async (id: string): Promise<ScholarshipRecord | null> => {
  const { data, error } = await supabase.from("scholarships").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as ScholarshipRecord | null;
};

export type ScholarshipFormValues = {
  title: string;
  provider_name: string;
  provider_contact: string;
  category: string;
  description: string;
  application_mode: string;
  application_url: string;
  source_url: string;
  verified_at: string;
  award_min: string;
  award_max: string;
  currency: string;
  award_type: string;
  opens_at: string;
  closes_at: string;
  decision_by: string;
  levels: string;
  gender: string;
  region: string;
  subjects: string;
  activities: string;
  min_grade: string;
  need_band: string;
  renewal_terms: string;
  steps: string;
};

const toNumber = (value: string): number | null => {
  const trimmed = value.trim().replace(/,/g, "");
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const toIso = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/** Map the editor's plain fields onto the database columns. */
export const toScholarshipPatch = (
  values: ScholarshipFormValues,
  userId: string | null
): Update => {
  const levels = parseList(values.levels);
  const steps = values.steps
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({ order: index + 1, text: line.replace(/^\d+[.)]\s*/, "") }));

  return {
    title: values.title.trim(),
    provider_name: values.provider_name.trim() || null,
    provider_contact: values.provider_contact.trim() || null,
    category: values.category,
    description: values.description.trim() || null,
    application_mode: values.application_mode,
    application_url: values.application_url.trim() || null,
    source_url: values.source_url.trim() || null,
    verified_at: toIso(values.verified_at),
    award_min: toNumber(values.award_min),
    award_max: toNumber(values.award_max),
    currency: values.currency.trim().toUpperCase() || "UGX",
    award_type: values.award_type.trim() || null,
    opens_at: toIso(values.opens_at),
    // The legacy date column feeds the public-data function; keep it aligned.
    deadline: values.closes_at ? values.closes_at.slice(0, 10) : null,
    closes_at: toIso(values.closes_at),
    decision_by: toIso(values.decision_by),
    eligibility_rules: buildEligibilityRules({
      levels,
      gender: parseList(values.gender),
      region: parseList(values.region),
      subjects: parseList(values.subjects),
      activities: parseList(values.activities),
      min_grade: values.min_grade,
      need_band: values.need_band,
    }),
    steps,
    renewal_terms: values.renewal_terms.trim() || null,
    updated_by: userId,
  };
};

export const createScholarshipDraft = async (
  values: ScholarshipFormValues,
  userId: string | null
): Promise<ScholarshipRecord> => {
  const payload: Insert = {
    ...toScholarshipPatch(values, userId),
    title: values.title.trim() || "Untitled scholarship",
    status: "draft",
    created_by: userId,
  };
  const { data, error } = await supabase.from("scholarships").insert(payload).select().single();
  if (error) throw error;
  return data as ScholarshipRecord;
};

export const updateScholarship = async (
  id: string,
  values: ScholarshipFormValues,
  userId: string | null
): Promise<ScholarshipRecord> => {
  const { data, error } = await supabase
    .from("scholarships")
    .update(toScholarshipPatch(values, userId))
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Only a platform admin can edit this scholarship.");
  return data as ScholarshipRecord;
};

/** Publishing is gated in the database; the thrown message is the real reason. */
export const setScholarshipStatus = async (
  id: string,
  status: "draft" | "published" | "archived",
  userId: string | null
): Promise<void> => {
  const { data, error } = await supabase
    .from("scholarships")
    .update({ status, updated_by: userId, ...(status === "published" ? {} : {}) })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Only a platform admin can change this scholarship.");
};

export const listRequirements = async (scholarshipId: string): Promise<RequirementRecord[]> => {
  const { data, error } = await supabase
    .from("scholarship_requirements")
    .select("*")
    .eq("scholarship_id", scholarshipId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as RequirementRecord[];
};

export type RequirementDraft = {
  id?: string;
  key: string;
  label: string;
  why: string;
  example: string;
  doc_type: string;
  required: boolean;
  max_files: number;
  sensitivity: string;
};

export const saveRequirement = async (
  scholarshipId: string,
  draft: RequirementDraft,
  sortOrder: number
): Promise<void> => {
  const payload = {
    scholarship_id: scholarshipId,
    key: draft.key.trim(),
    label: draft.label.trim(),
    why: draft.why.trim() || null,
    example: draft.example.trim() || null,
    doc_type: draft.doc_type,
    required: draft.required,
    max_files: draft.max_files,
    sensitivity: draft.sensitivity,
    sort_order: sortOrder,
    updated_at: new Date().toISOString(),
  };

  const { error } = draft.id
    ? await supabase.from("scholarship_requirements").update(payload).eq("id", draft.id)
    : await supabase.from("scholarship_requirements").insert(payload);

  if (error) throw error;
};

export const removeRequirement = async (id: string): Promise<void> => {
  const { error } = await supabase.from("scholarship_requirements").delete().eq("id", id);
  if (error) throw error;
};

export type CatalogEvent = Database["public"]["Tables"]["catalog_events"]["Row"];

export const listCatalogEvents = async (scholarshipId: string): Promise<CatalogEvent[]> => {
  const { data, error } = await supabase
    .from("catalog_events")
    .select("*")
    .eq("scholarship_id", scholarshipId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as CatalogEvent[];
};

// ---------------------------------------------------------------------------
// Online discovery triage
// ---------------------------------------------------------------------------

export type CandidateRow = Database["public"]["Tables"]["scholarship_candidates"]["Row"];

export const listCandidates = async (): Promise<CandidateRow[]> => {
  const { data, error } = await supabase
    .from("scholarship_candidates")
    .select("*")
    .in("status", ["new"])
    .order("score", { ascending: false })
    .order("last_seen_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as CandidateRow[];
};

/**
 * Turn a lead into a draft. It carries the URL across as the source, but the
 * listing still cannot publish until a person verifies the provider, contact,
 * closing date and award.
 */
export const promoteCandidate = async (candidate: CandidateRow, userId: string | null): Promise<string> => {
  const { data, error } = await supabase
    .from("scholarships")
    .insert({
      title: candidate.title.slice(0, 180) || candidate.domain,
      provider_name: candidate.domain,
      category: "external",
      application_mode: "external",
      description: candidate.snippet ?? null,
      source_url: candidate.url,
      status: "draft",
      created_by: userId,
    })
    .select("id")
    .single();

  if (error) throw error;

  const { error: markError } = await supabase
    .from("scholarship_candidates")
    .update({ status: "promoted", promoted_scholarship_id: data.id })
    .eq("id", candidate.id);
  if (markError) throw markError;

  return data.id as string;
};

export const dismissCandidate = async (id: string): Promise<void> => {
  const { error } = await supabase.from("scholarship_candidates").update({ status: "dismissed" }).eq("id", id);
  if (error) throw error;
};
