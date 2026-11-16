/**
 * Pure rules for the catalog editor.
 *
 * The database enforces the publish gate (`app_private.validate_scholarship_publish`).
 * These helpers mirror it so the editor can show blockers before a request is
 * sent — and the tests keep the two descriptions honest.
 */

export type CatalogRow = {
  title?: string | null;
  provider_name?: string | null;
  provider_contact?: string | null;
  category?: string | null;
  closes_at?: string | null;
  award_min?: number | string | null;
  award_max?: number | string | null;
  award_type?: string | null;
  source_url?: string | null;
  verified_at?: string | null;
};

export const CATEGORIES = [
  { value: "merit", label: "Merit / academic" },
  { value: "stem", label: "STEM and innovation" },
  { value: "arts_sport", label: "Arts and sport" },
  { value: "bursary", label: "Need-based bursary" },
  { value: "leadership", label: "Leadership and service" },
  { value: "inclusion", label: "Girls and inclusion" },
  { value: "school_internal", label: "School-internal award" },
  { value: "external", label: "External provider" },
] as const;

export const LEVELS = ["S1", "S2", "S3", "S4", "S5", "S6"] as const;

const isBlank = (value: unknown) => value === null || value === undefined || String(value).trim() === "";

const num = (value: unknown): number | null => {
  if (isBlank(value)) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/** Blockers that must be cleared before a listing can be published. */
export function publishReadiness(row: CatalogRow, now: Date = new Date()): string[] {
  const blockers: string[] = [];

  if (isBlank(row.title)) blockers.push("Add a title.");
  if (isBlank(row.provider_name)) blockers.push("Name the provider that awards it.");
  if (isBlank(row.provider_contact)) blockers.push("Add a provider contact someone can reach.");
  if (isBlank(row.category)) blockers.push("Choose a category.");
  if (isBlank(row.source_url)) blockers.push("Add the source URL you verified the terms against.");
  if (isBlank(row.verified_at)) blockers.push("Record when you verified the source.");

  if (isBlank(row.closes_at)) {
    blockers.push("Set a closing date.");
  } else {
    const closes = new Date(row.closes_at);
    if (Number.isNaN(closes.getTime())) blockers.push("Closing date is not a valid date.");
    else if (closes <= now) blockers.push("Closing date is in the past — move it forward or archive the entry.");
  }

  const min = num(row.award_min);
  const max = num(row.award_max);
  if (isBlank(row.award_min) && isBlank(row.award_max) && isBlank(row.award_type)) {
    blockers.push("State the award: a minimum, a maximum, or a type (e.g. tuition).");
  }
  if (min !== null && max !== null && min > max) blockers.push("Award maximum is lower than the minimum.");

  return blockers;
}

export const isPublishable = (row: CatalogRow, now: Date = new Date()) => publishReadiness(row, now).length === 0;

/** "UGX 500,000 – 2,000,000" / "Tuition" / "Not stated" — never a guessed number. */
export function formatAward(row: {
  award_min?: number | string | null;
  award_max?: number | string | null;
  currency?: string | null;
  award_type?: string | null;
}): string {
  const min = num(row.award_min);
  const max = num(row.award_max);
  const currency = (row.currency || "").trim();
  const format = (value: number) => `${currency ? `${currency} ` : ""}${value.toLocaleString()}`;

  if (min !== null && max !== null && min !== max) return `${format(min)} – ${format(max)}`;
  if (min !== null && max !== null) return format(min);
  if (min !== null) return `from ${format(min)}`;
  if (max !== null) return `up to ${format(max)}`;
  if (!isBlank(row.award_type)) return String(row.award_type);
  return "Not stated";
}

/** Split "S5; S6" or "Maths, Physics" into clean, unique values. */
export function parseList(value: string | null | undefined): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  return value
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter((part) => {
      if (!part || seen.has(part.toLowerCase())) return false;
      seen.add(part.toLowerCase());
      return true;
    });
}

export type RequirementInput = {
  key?: string | null;
  label?: string | null;
  why?: string | null;
  doc_type?: string | null;
  required?: boolean;
  max_files?: number | string | null;
  sensitivity?: string | null;
};

const KEY_PATTERN = /^[a-z0-9_]{3,48}$/;

/** Validation for one requirement row, matching the table's constraints. */
export function validateRequirement(input: RequirementInput): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const key = (input.key ?? "").trim();

  if (!KEY_PATTERN.test(key)) {
    errors.push("Key must be 3–48 characters, lowercase letters, numbers or underscores.");
  }
  if (isBlank(input.label)) errors.push("Add a label students will understand.");
  if (input.doc_type && !["pdf", "image", "either", "none"].includes(input.doc_type)) {
    errors.push("Document type must be pdf, image, either or none.");
  }
  if (input.sensitivity && !["normal", "financial", "identity"].includes(input.sensitivity)) {
    errors.push("Sensitivity must be normal, financial or identity.");
  }
  const maxFiles = num(input.max_files ?? 1);
  if (maxFiles === null || maxFiles < 1 || maxFiles > 3) errors.push("Max files must be between 1 and 3.");

  return { ok: errors.length === 0, errors };
}

/** Build the eligibility JSON the matcher reads from the editor's plain fields. */
export function buildEligibilityRules(fields: {
  levels?: string[];
  gender?: string[];
  region?: string[];
  subjects?: string[];
  activities?: string[];
  min_grade?: string | null;
  need_band?: string | null;
}): Record<string, unknown> {
  const rules: Record<string, unknown> = {};
  if (fields.levels?.length) rules.level = fields.levels;
  if (fields.gender?.length) rules.gender = fields.gender;
  if (fields.region?.length) rules.region = fields.region;
  if (fields.subjects?.length) rules.subjects_any = fields.subjects;
  if (fields.activities?.length) rules.activities_any = fields.activities;
  if (!isBlank(fields.min_grade)) rules.min_grade = fields.min_grade;
  if (!isBlank(fields.need_band)) rules.need_band = fields.need_band;
  return rules;
}
