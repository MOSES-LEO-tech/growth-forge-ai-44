import type { UserRole } from "@/integrations/supabase/types";

/**
 * Single source of truth for onboarding.
 *
 * Both entry points — the signup form and the post-login wizard — must read
 * their steps from here. Anything that hardcodes its own step list is a
 * duplicate flow and will drift (that is exactly what happened between
 * SignupOnboarding and RoleOnboardingWizard before 2026-11-10).
 */

export type OnboardingFieldKind = "text" | "email" | "select" | "code" | "password";

export interface OnboardingField {
  name: string;
  label: string;
  kind: OnboardingFieldKind;
  required: boolean;
  /** Minimum trimmed length for text-ish fields. */
  minLength?: number;
  placeholder?: string;
  options?: readonly string[];
}

export interface OnboardingStep {
  key: string;
  title: string;
  description: string;
  /** Empty for status-only steps (e.g. "awaiting approval"). */
  fields: readonly OnboardingField[];
  skippable: boolean;
}

export interface OnboardingFlow {
  role: UserRole;
  steps: readonly OnboardingStep[];
  /** Where the role lands on completion. */
  firstSuccessPath: string;
}

const NAME: OnboardingField = { name: "fullName", label: "Full name", kind: "text", required: true, minLength: 2 };

const SCHOOL_CODE: OnboardingField = {
  name: "schoolCode",
  label: "School join code",
  kind: "code",
  required: true,
  minLength: 4,
  placeholder: "ABC-1234",
};

export const ONBOARDING_FLOWS: Record<UserRole, OnboardingFlow> = {
  student: {
    role: "student",
    firstSuccessPath: "/dashboard",
    steps: [
      { key: "basics", title: "Tell us about yourself", description: "Let's start with your name.", fields: [NAME], skippable: false },
      {
        key: "education",
        title: "Your education",
        description: "What you're studying helps us tailor your experience.",
        fields: [
          {
            name: "educationSystem",
            label: "Education system",
            kind: "select",
            required: true,
            options: ["Cambridge (IGCSE)", "Cambridge (A-Levels)", "IB (International Baccalaureate)", "National curriculum", "Vocational / technical", "Homeschool", "Other"],
          },
          { name: "gradeLevel", label: "Grade", kind: "select", required: true, options: ["Grade 9", "Grade 10", "Grade 11", "Grade 12", "Year 10", "Year 11", "Year 12", "Other"] },
        ],
        skippable: false,
      },
      { key: "interests", title: "Your interests", description: "Optional, but great for recommendations.", fields: [{ name: "interests", label: "Interests", kind: "text", required: false, placeholder: "Robotics, Debate" }], skippable: true },
      { key: "school", title: "Connect a school", description: "Optional — enter a school join code if you have one.", fields: [{ ...SCHOOL_CODE, required: false }], skippable: true },
    ],
  },

  parent: {
    role: "parent",
    firstSuccessPath: "/parent",
    steps: [
      { key: "basics", title: "Tell us about yourself", description: "Let's start with your name.", fields: [NAME], skippable: false },
      {
        key: "child",
        title: "Link your child",
        description: "Optional — enter your child's student email. They will be asked to accept.",
        fields: [{ name: "childEmail", label: "Child's student email", kind: "email", required: false, placeholder: "student@example.com" }],
        skippable: true,
      },
      { key: "school", title: "Connect a school", description: "Optional — enter a school join code if you have one.", fields: [{ ...SCHOOL_CODE, required: false }], skippable: true },
    ],
  },

  teacher: {
    role: "teacher",
    firstSuccessPath: "/teacher",
    steps: [
      { key: "basics", title: "Tell us about yourself", description: "Let's start with your name.", fields: [NAME], skippable: false },
      { key: "school", title: "Connect your school", description: "Enter your school's join code. Your school admin approves the connection.", fields: [SCHOOL_CODE], skippable: false },
      { key: "subjects", title: "What do you teach?", description: "Optional — helps match you to classes.", fields: [{ name: "teacherSubjects", label: "Subjects", kind: "text", required: false, placeholder: "Mathematics, Physics" }], skippable: true },
    ],
  },

  admin: {
    role: "admin",
    firstSuccessPath: "/admin/overview",
    steps: [
      { key: "basics", title: "Tell us about yourself", description: "Let's start with your name.", fields: [NAME], skippable: false },
      {
        key: "school",
        title: "Connect your school",
        description: "Enter your school's join code. New schools are registered by Milestone support.",
        fields: [{ ...SCHOOL_CODE, required: false }],
        skippable: true,
      },
    ],
  },

  super_admin: {
    role: "super_admin",
    firstSuccessPath: "/admin/overview",
    steps: [
      { key: "basics", title: "Confirm your details", description: "Super admins skip onboarding; confirm your name.", fields: [NAME], skippable: false },
    ],
  },
};

/** Steps for a role; unknown roles fall back to student (the default account role). */
export function onboardingSteps(role: UserRole | null | undefined): readonly OnboardingStep[] {
  return (ONBOARDING_FLOWS[role ?? "student"] ?? ONBOARDING_FLOWS.student).steps;
}

export function firstSuccessPath(role: UserRole | null | undefined): string {
  return (ONBOARDING_FLOWS[role ?? "student"] ?? ONBOARDING_FLOWS.student).firstSuccessPath;
}

export interface StepValidation {
  ok: boolean;
  errors: Record<string, string>;
}

/** Pure validation for one step. Empty values count as missing for required fields. */
export function validateStep(step: OnboardingStep, values: Record<string, string | null | undefined>): StepValidation {
  const errors: Record<string, string> = {};

  for (const field of step.fields) {
    const raw = values[field.name];
    const value = typeof raw === "string" ? raw.trim() : raw ?? "";

    if (!value) {
      if (field.required) errors[field.name] = `${field.label} is required.`;
      continue;
    }

    if (field.minLength && String(value).length < field.minLength) {
      errors[field.name] = `${field.label} must be at least ${field.minLength} characters.`;
      continue;
    }

    if (field.kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
      errors[field.name] = "Enter a valid email address.";
    }

    if (field.kind === "select" && field.options && !field.options.includes(String(value))) {
      errors[field.name] = `Choose one of the listed options.`;
    }
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

/** A step may be left empty when it has no fields at all, or is skippable with only optional fields. */
export function canSkip(step: OnboardingStep): boolean {
  if (step.fields.length === 0) return true;
  return step.skippable && step.fields.every((f) => !f.required);
}
