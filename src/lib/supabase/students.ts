import { supabase } from "@/integrations/supabase/client";
import type {
  Enrollment,
  EnrollmentStatus,
  Json,
  Profile,
} from "@/integrations/supabase/types";
import { getActiveSchoolJoinCode } from "./schoolSystem";

/**
 * Student management lib (Phase 3 — profiles + enrollment + CSV import/export).
 *
 * Privileged profile edits go through the `admin_update_student_profile` RPC
 * (school-admin gate + whitelist), enrollment rows are plain RLS-driven CRUD,
 * and the public roster read goes through the `school_public_roster` SECURITY
 * DEFINER function so anonymous visitors can only ever see name + grade.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A student profile row joined with their most recent enrollment. */
export type StudentRosterEntry = Profile & {
  latestEnrollment: Enrollment | null;
};

export type RosterFilters = {
  /** Case-insensitive match on full name or email. */
  search?: string;
  /** Matches profile.grade_level OR latest enrollment grade_level. */
  grade?: string;
  /** Matches the latest enrollment status. */
  status?: EnrollmentStatus;
};

/** Whitelisted fields accepted by `admin_update_student_profile`. */
export type StudentEditableFields = Partial<
  Pick<Profile, "grade_level" | "class_name" | "bio" | "subjects" | "clubs" | "interests">
>;

export type EnrollmentInput = Pick<Enrollment, "school_id" | "student_id"> &
  Partial<Pick<Enrollment, "grade_level" | "class_name" | "school_year" | "status">>;

/** One data row parsed from an uploaded roster CSV. */
export type ParsedRosterRow = {
  email: string;
  name: string;
  grade: string | null;
  class_name: string | null;
  school_year: string | null;
  status: EnrollmentStatus;
};

export type ImportRosterResult = {
  /** Rows matched to an existing profile in this school and processed. */
  matched: number;
  /** Matched rows whose grade/class profile fields were updated. */
  updated: number;
  /** Rows with no matching profile (or belonging to another school). */
  unmatched: ParsedRosterRow[];
};

/** Public roster row — name + grade only (FERPA, plan §7.5). */
export type PublicStudentRow = {
  student_id: string;
  full_name: string | null;
  grade_level: string | null;
};

// ---------------------------------------------------------------------------
// Roster
// ---------------------------------------------------------------------------

/**
 * Fetch a school's student roster (role='student', same school, not rejected)
 * with each student's latest enrollment. Search/grade/status filtering happens
 * in JS after a single pair of queries (mirrors `getTaskStatsForProjects`).
 */
export const getStudentRoster = async (
  schoolId: string,
  filters: RosterFilters = {}
): Promise<StudentRosterEntry[]> => {
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "student")
    .eq("school_id", schoolId)
    .neq("account_status", "rejected")
    .order("full_name", { ascending: true });

  if (profilesError) throw profilesError;

  const students = (profiles || []) as Profile[];
  const ids = students.map((s) => s.id);

  const { data: enrollments, error: enrollmentsError } = ids.length
    ? await supabase
        .from("enrollments")
        .select("*")
        .in("student_id", ids)
        .order("enrolled_at", { ascending: true })
    : { data: [], error: null };

  if (enrollmentsError) throw enrollmentsError;

  // Group enrollments per student, keep the most recent as `latestEnrollment`.
  const byStudent = new Map<string, Enrollment[]>();
  for (const e of (enrollments || []) as Enrollment[]) {
    const list = byStudent.get(e.student_id) ?? [];
    list.push(e);
    byStudent.set(e.student_id, list);
  }

  const { search, grade, status } = filters;
  const needle = search?.trim().toLowerCase();

  return students
    .map((profile) => {
      const studentEnrollments = byStudent.get(profile.id) ?? [];
      const latestEnrollment =
        studentEnrollments[studentEnrollments.length - 1] ?? null;
      return { ...profile, latestEnrollment };
    })
    .filter((entry) => {
      if (needle) {
        const haystack = `${entry.full_name ?? ""} ${entry.email ?? ""}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (grade) {
        const g = entry.grade_level ?? entry.latestEnrollment?.grade_level ?? null;
        if (g !== grade) return false;
      }
      if (status && entry.latestEnrollment?.status !== status) return false;
      return true;
    });
};

/**
 * Public roster read (used by the public /schools/:id Students tab). Goes
 * through the SECURITY DEFINER `school_public_roster` function so only
 * name + grade of approved students is ever exposed.
 */
export const getPublicSchoolStudents = async (
  schoolId: string
): Promise<PublicStudentRow[]> => {
  const { data, error } = await (supabase as any).rpc("school_public_roster", {
    p_school_id: schoolId,
  });
  if (error) throw error;
  return (data || []) as PublicStudentRow[];
};

// ---------------------------------------------------------------------------
// Student detail + profile updates
// ---------------------------------------------------------------------------

export type StudentDetail = {
  profile: Profile | null;
  enrollments: Enrollment[];
  recentActivity: {
    type: "project" | "achievement";
    label: string;
    status_text: string;
    created_at: string;
  }[];
};

/** Profile + enrollment history + recent projects/achievements for one student. */
export const getStudentDetail = async (studentId: string): Promise<StudentDetail> => {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", studentId)
    .maybeSingle();

  if (profileError) throw profileError;

  const [enrollmentRes, projectsRes, achievementsRes] = await Promise.all([
    supabase
      .from("enrollments")
      .select("*")
      .eq("student_id", studentId)
      .order("enrolled_at", { ascending: false }),
    supabase
      .from("projects")
      .select("id, title, status, created_at")
      .eq("owner_id", studentId)
      .is("deleted_at", null)
      .limit(50),
    supabase
      .from("achievements")
      .select("id, title, verified, created_at")
      .eq("user_id", studentId)
      .limit(50),
  ]);

  if (enrollmentRes.error) throw enrollmentRes.error;
  if (projectsRes.error) throw projectsRes.error;
  if (achievementsRes.error) throw achievementsRes.error;

  const recentActivity = [
    ...(projectsRes.data || []).map((p) => ({
      type: "project" as const,
      label: p.title,
      status_text: p.status || "pending",
      created_at: p.created_at,
    })),
    ...(achievementsRes.data || []).map((a) => ({
      type: "achievement" as const,
      label: a.title,
      status_text: a.verified ? "verified" : "pending",
      created_at: a.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  return {
    profile: (profile as Profile) || null,
    enrollments: (enrollmentRes.data || []) as Enrollment[],
    recentActivity,
  };
};

/**
 * Update whitelisted student profile fields via the school-admin RPC.
 * Returns the updated profile row (or null if the student no longer exists).
 */
export const updateStudentProfile = async (
  studentId: string,
  fields: StudentEditableFields
): Promise<Profile | null> => {
  const { data, error } = await supabase.rpc("admin_update_student_profile", {
    p_student_id: studentId,
    p_fields: fields as unknown as Json,
  });
  if (error) throw error;
  return (data as Profile) ?? null;
};

// ---------------------------------------------------------------------------
// Enrollment CRUD (plain RLS-driven, admin policies on enrollments)
// ---------------------------------------------------------------------------

export const createEnrollment = async (input: EnrollmentInput): Promise<Enrollment> => {
  const { data, error } = await supabase
    .from("enrollments")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Enrollment;
};

/**
 * Update an enrollment row. When the status moves to a terminal state
 * (withdrawn/graduated) and no exit date is set, `exited_at` is stamped; when
 * it moves back to active/pending the exit date is cleared.
 */
export const updateEnrollment = async (
  enrollmentId: string,
  patch: Partial<Pick<Enrollment, "grade_level" | "class_name" | "school_year" | "status">>
): Promise<Enrollment> => {
  const current = await getEnrollmentById(enrollmentId);

  const next: Partial<Enrollment> = { ...patch };
  if (patch.status) {
    if (patch.status === "withdrawn" || patch.status === "graduated") {
      next.exited_at = current?.exited_at ?? new Date().toISOString();
    } else {
      next.exited_at = null;
    }
  }

  const { data, error } = await supabase
    .from("enrollments")
    .update(next)
    .eq("id", enrollmentId)
    .select()
    .single();
  if (error) throw error;
  return data as Enrollment;
};

export const getEnrollmentById = async (enrollmentId: string): Promise<Enrollment | null> => {
  const { data, error } = await supabase
    .from("enrollments")
    .select("*")
    .eq("id", enrollmentId)
    .maybeSingle();
  if (error) throw error;
  return (data as Enrollment) || null;
};

export const listEnrollments = async (studentId: string): Promise<Enrollment[]> => {
  const { data, error } = await supabase
    .from("enrollments")
    .select("*")
    .eq("student_id", studentId)
    .order("enrolled_at", { ascending: false });
  if (error) throw error;
  return (data || []) as Enrollment[];
};

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

const escapeCsvField = (value: string | null | undefined): string => {
  const s = value ?? "";
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const STATUS_LABEL: Record<EnrollmentStatus, string> = {
  active: "Active",
  pending: "Pending",
  withdrawn: "Withdrawn",
  graduated: "Graduated",
};

/** Build the roster CSV string for a set of roster entries. */
export const buildRosterCsv = (entries: StudentRosterEntry[]): string => {
  const header = ["name", "email", "grade", "class", "status", "enrolled_at"];
  const lines = entries.map((e) =>
    [
      escapeCsvField(e.full_name),
      escapeCsvField(e.email),
      escapeCsvField(e.grade_level ?? e.latestEnrollment?.grade_level),
      escapeCsvField(e.class_name ?? e.latestEnrollment?.class_name),
      escapeCsvField(e.latestEnrollment ? STATUS_LABEL[e.latestEnrollment.status] : "No enrollment"),
      escapeCsvField(e.latestEnrollment?.enrolled_at),
    ].join(",")
  );
  return [header.join(","), ...lines].join("\n");
};

/** Trigger a browser download of a CSV string (mirrors `downloadChatExport`). */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Fetch the roster and download it as `<school>-roster-YYYY-MM-DD.csv`. */
export const exportRosterCsv = async (schoolId: string): Promise<void> => {
  const entries = await getStudentRoster(schoolId);
  const date = new Date().toISOString().slice(0, 10);
  downloadCsv(buildRosterCsv(entries), `student-roster-${date}.csv`);
};

// ---------------------------------------------------------------------------
// CSV import
// ---------------------------------------------------------------------------

const VALID_STATUSES: EnrollmentStatus[] = ["active", "withdrawn", "graduated", "pending"];

/** Hand-rolled CSV parser supporting quoted fields, commas and CRLF. */
export const parseCsvRows = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      pushField();
    } else if (ch === "\n") {
      pushRow();
    } else if (ch === "\r") {
      // skip; CRLF handled by the \n branch
    } else {
      field += ch;
    }
    i += 1;
  }
  // Trailing content without a final newline.
  if (field.length > 0 || row.length > 0) pushRow();
  return rows;
};

/**
 * Parse and validate a roster CSV into rows. Header validation is strict about
 * `email`; `name`, `grade`/`grade_level`, `class`/`class_name`, `school_year`
 * and `status` are optional. Throws with a readable message on bad input.
 */
export const parseRosterCsv = (text: string): ParsedRosterRow[] => {
  const rows = parseCsvRows(text).filter((r) => r.some((c) => c.trim() !== ""));
  if (rows.length === 0) throw new Error("The CSV file is empty.");

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (names: string[]) => header.findIndex((h) => names.includes(h));

  const emailIdx = col(["email"]);
  if (emailIdx === -1) throw new Error('The CSV must include an "email" column.');

  const nameIdx = col(["name", "full_name"]);
  const gradeIdx = col(["grade", "grade_level"]);
  const classIdx = col(["class", "class_name"]);
  const yearIdx = col(["school_year"]);
  const statusIdx = col(["status"]);

  return rows.slice(1).map((r) => {
    const rawStatus = (statusIdx >= 0 ? r[statusIdx]?.trim().toLowerCase() : "") || "active";
    if (!VALID_STATUSES.includes(rawStatus as EnrollmentStatus)) {
      throw new Error(`Invalid status "${rawStatus}". Use active, pending, withdrawn or graduated.`);
    }
    return {
      email: (emailIdx >= 0 ? r[emailIdx]?.trim() : "") || "",
      name: (nameIdx >= 0 ? r[nameIdx]?.trim() : "") || "",
      grade: gradeIdx >= 0 && r[gradeIdx]?.trim() ? r[gradeIdx].trim() : null,
      class_name: classIdx >= 0 && r[classIdx]?.trim() ? r[classIdx].trim() : null,
      school_year: yearIdx >= 0 && r[yearIdx]?.trim() ? r[yearIdx].trim() : null,
      status: rawStatus as EnrollmentStatus,
    };
  });
};

/**
 * Import a roster CSV: match rows to existing profiles by email (same school),
 * update grade/class via `admin_update_student_profile`, then upsert an
 * enrollment per row. Rows with no matching profile are returned as `unmatched`
 * so the UI can offer the invite-join-code CSV (we cannot create auth users
 * server-side — plan §9.4).
 */
export const importRosterCsv = async (schoolId: string, text: string): Promise<ImportRosterResult> => {
  const rows = parseRosterCsv(text);
  if (rows.length === 0) throw new Error("The CSV file contains no data rows.");

  const emails = [...new Set(rows.map((r) => r.email.toLowerCase()).filter(Boolean))];

  const { data: profiles, error: profilesError } = emails.length
    ? await supabase
        .from("profiles")
        .select("id, email, school_id, grade_level, class_name")
        .in("email", emails)
    : { data: [], error: null };

  if (profilesError) throw profilesError;

  const byEmail = new Map<string, Profile>();
  for (const p of (profiles || []) as Profile[]) {
    const key = (p.email || "").toLowerCase();
    if (!byEmail.has(key)) byEmail.set(key, p);
  }

  const matched: { row: ParsedRosterRow; profile: Profile }[] = [];
  const unmatched: ParsedRosterRow[] = [];
  for (const row of rows) {
    const profile = byEmail.get(row.email.toLowerCase());
    if (profile && profile.school_id === schoolId) {
      matched.push({ row, profile });
    } else {
      unmatched.push(row);
    }
  }

  // Update grade/class profile fields (school-admin RPC, audited).
  let updated = 0;
  for (const { row, profile } of matched) {
    const fields: StudentEditableFields = {};
    if (row.grade && row.grade !== profile.grade_level) fields.grade_level = row.grade;
    if (row.class_name && row.class_name !== profile.class_name) fields.class_name = row.class_name;
    if (Object.keys(fields).length > 0) {
      await updateStudentProfile(profile.id, fields);
      updated += 1;
    }
  }

  // Upsert enrollments (unique on school_id + student_id + school_year).
  const enrollmentRows = matched
    .filter(({ row }) => row.school_year)
    .map(({ row, profile }) => ({
      school_id: schoolId,
      student_id: profile.id,
      grade_level: row.grade,
      class_name: row.class_name,
      school_year: row.school_year,
      status: row.status,
    }));

  if (enrollmentRows.length > 0) {
    const { error: upsertError } = await supabase
      .from("enrollments")
      .upsert(enrollmentRows, { onConflict: "school_id,student_id,school_year" });
    if (upsertError) throw upsertError;
  }

  return { matched: matched.length, updated, unmatched };
};

/**
 * Build the invite-join-code CSV for unmatched import rows. Every row carries
 * the school's active join code so recipients can self-join via the existing
 * `school_connection_requests` flow (plan §7.3). Returns null when no active
 * join code exists.
 */
export const buildInviteCsv = async (
  schoolId: string,
  rows: ParsedRosterRow[]
): Promise<string | null> => {
  const joinCode = await getActiveSchoolJoinCode(schoolId);
  if (!joinCode) return null;

  const header = ["email", "name", "school_join_code"];
  const lines = rows.map((r) =>
    [escapeCsvField(r.email), escapeCsvField(r.name), escapeCsvField(joinCode.code)].join(",")
  );
  return [header.join(","), ...lines].join("\n");
};
