import type { Profile } from "@/integrations/supabase/types";

/**
 * The fields a signed-in user may change about their own profile.
 *
 * Everything else on `profiles` is guarded in the database by
 * `app_private.guard_profile_sensitive_update()` (migration
 * 20260505170000), which raises for role / school_id / account_status /
 * approved_* changes made by the profile owner. This module mirrors that
 * allow-list on the client so the failure happens before the round-trip and
 * the payload never contains a privileged column.
 */
export const EDITABLE_PROFILE_FIELDS = [
  "full_name",
  "avatar_url",
  "bio",
  "grade_level",
  "gpa",
  "interests",
  "extracurriculars",
  "email",
  "age",
  "class_name",
  "subjects",
  "clubs",
  "visibility",
  "timezone",
  "education_system",
  "onboarding_completed_at",
  "notification_prefs",
] as const;

export type EditableProfileField = (typeof EDITABLE_PROFILE_FIELDS)[number];

/** Fields no client may ever write; they belong to the approval workflow. */
export const PROTECTED_PROFILE_FIELDS = [
  "id",
  "role",
  "school_id",
  "account_status",
  "approved_by",
  "approved_at",
  "rejection_reason",
  "created_at",
] as const;

const EDITABLE = new Set<string>(EDITABLE_PROFILE_FIELDS);
const PROTECTED = new Set<string>(PROTECTED_PROFILE_FIELDS);

/**
 * Returns a payload containing only editable fields.
 * Protected keys are dropped rather than thrown on, so a stale caller cannot
 * break a save — but they are reported through `strippedProtectedFields`.
 */
export function sanitizeProfileUpdate(input: Partial<Profile>): Partial<Profile> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (EDITABLE.has(key)) output[key] = value;
  }
  return output as Partial<Profile>;
}

/** Names of protected keys the caller tried to write. Empty means clean. */
export function strippedProtectedFields(input: Partial<Profile>): string[] {
  return Object.keys(input).filter((key) => PROTECTED.has(key));
}

/** True when a key may be written by its owner. */
export function isEditableProfileField(field: string): field is EditableProfileField {
  return EDITABLE.has(field);
}
