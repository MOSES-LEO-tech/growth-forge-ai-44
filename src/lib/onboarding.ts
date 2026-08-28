import { supabase } from "@/integrations/supabase/client";
import { updateProfile } from "@/lib/supabase/profile";
import { requestSchoolConnection } from "@/lib/supabase/schoolSystem";
import type { Profile, UserRole } from "@/integrations/supabase/types";

export const EDUCATION_SYSTEMS = [
  "Cambridge (IGCSE)",
  "Cambridge (A-Levels)",
  "IB (International Baccalaureate)",
  "National curriculum",
  "Vocational / technical",
  "Homeschool",
  "Other",
] as const;

export const GRADE_OPTIONS = [
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
  "Year 1",
  "Year 2",
  "Year 3",
  "Year 4",
  "Year 5",
  "Year 6",
  "Year 7",
  "Year 8",
  "Year 9",
  "Year 10",
  "Year 11",
  "Year 12",
  "Other",
] as const;

/** A profile still needs onboarding when it has never been marked complete. */
export const needsOnboarding = (profile: Profile | null | undefined): boolean =>
  Boolean(profile && !profile.onboarding_completed_at);

/** Marks onboarding complete (called when the wizard finishes). */
export const completeOnboarding = async (userId: string): Promise<void> => {
  await updateProfile(userId, { onboarding_completed_at: new Date().toISOString() });
};

/** Parent onboarding: link to a student account by the student's email. */
export const linkParentToStudentByEmail = async (studentEmail: string): Promise<{ child_id: string; status: "linked" }> => {
  const { data, error } = await supabase.rpc("link_parent_to_student_by_email", {
    p_student_email: studentEmail,
  });
  if (error) throw error;
  return data as { child_id: string; status: "linked" };
};

const textToList = (value?: string | null) => {
  const list = (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return list.length > 0 ? list : null;
};

export interface SignupOnboardingInput {
  role: UserRole;
  educationSystem?: string | null;
  gradeLevel?: string | null;
  className?: string | null;
  subjects?: string | null;
  interests?: string | null;
  schoolCode?: string | null;
  childEmail?: string | null;
}

/**
 * Persists the role-specific fields collected in the signup form and marks
 * onboarding complete, so a brand-new account skips the post-login wizard.
 * School connection and parent-child linking are best-effort: a rejected code
 * or email must never block account creation.
 */
export const applySignupOnboarding = async (userId: string, input: SignupOnboardingInput): Promise<void> => {
  const updates: Partial<Profile> = {};
  if (input.educationSystem) updates.education_system = input.educationSystem;
  if (input.gradeLevel) updates.grade_level = input.gradeLevel;
  if (input.className) updates.class_name = input.className;
  updates.subjects = textToList(input.subjects);
  updates.interests = textToList(input.interests);

  if (Object.keys(updates).length > 0) {
    await updateProfile(userId, updates);
  }

  if (input.schoolCode?.trim()) {
    await requestSchoolConnection(input.schoolCode.trim().toUpperCase());
  }

  if (input.role === "parent" && input.childEmail?.trim()) {
    await linkParentToStudentByEmail(input.childEmail.trim());
  }

  await completeOnboarding(userId);
};

/** Role home used when a route guard redirects a signed-in user. */
export const roleHome = (role?: UserRole | null): string => {
  switch (role) {
    case "parent":
      return "/parent";
    case "teacher":
      return "/teacher";
    case "admin":
    case "super_admin":
      return "/admin/overview";
    default:
      return "/dashboard";
  }
};
