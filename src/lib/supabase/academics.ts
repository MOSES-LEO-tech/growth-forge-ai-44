import { supabase } from "@/integrations/supabase/client";
import type { AcademicClass, AcademicSubject, AcademicYear } from "@/integrations/supabase/types";

export const listAcademicClasses = async (schoolId: string): Promise<AcademicClass[]> => {
  const { data, error } = await supabase
    .from("academic_classes")
    .select("*")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []) as AcademicClass[];
};

export const listAcademicSubjects = async (schoolId: string): Promise<AcademicSubject[]> => {
  const { data, error } = await supabase
    .from("academic_subjects")
    .select("*")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []) as AcademicSubject[];
};

export const listAcademicYears = async (schoolId: string): Promise<AcademicYear[]> => {
  const { data, error } = await supabase
    .from("academic_years")
    .select("*")
    .eq("school_id", schoolId)
    .order("start_date", { ascending: false });
  if (error) throw error;
  return (data || []) as AcademicYear[];
};

export const createAcademicClass = async (
  schoolId: string,
  input: Pick<AcademicClass, "name" | "grade" | "student_count" | "teacher_name">
): Promise<void> => {
  const { error } = await supabase
    .from("academic_classes")
    .insert({ school_id: schoolId, ...input });
  if (error) throw error;
};

export const updateAcademicClass = async (
  id: string,
  patch: Pick<AcademicClass, "name" | "grade" | "student_count" | "teacher_name">
): Promise<void> => {
  const { error } = await supabase
    .from("academic_classes")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
};

export const deleteAcademicClass = async (id: string): Promise<void> => {
  const { error } = await supabase.from("academic_classes").delete().eq("id", id);
  if (error) throw error;
};

export const createAcademicSubject = async (
  schoolId: string,
  input: Pick<AcademicSubject, "name" | "code" | "grade">
): Promise<void> => {
  const { error } = await supabase
    .from("academic_subjects")
    .insert({ school_id: schoolId, ...input });
  if (error) throw error;
};

export const updateAcademicSubject = async (
  id: string,
  patch: Pick<AcademicSubject, "name" | "code" | "grade">
): Promise<void> => {
  const { error } = await supabase
    .from("academic_subjects")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
};

export const deleteAcademicSubject = async (id: string): Promise<void> => {
  const { error } = await supabase.from("academic_subjects").delete().eq("id", id);
  if (error) throw error;
};

export const createAcademicYear = async (
  schoolId: string,
  input: Pick<AcademicYear, "name" | "start_date" | "end_date" | "is_active">
): Promise<void> => {
  const { error } = await supabase
    .from("academic_years")
    .insert({ school_id: schoolId, ...input });
  if (error) throw error;
};

export const updateAcademicYear = async (
  id: string,
  patch: Pick<AcademicYear, "name" | "start_date" | "end_date" | "is_active">
): Promise<void> => {
  const { error } = await supabase
    .from("academic_years")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
};

export const deleteAcademicYear = async (id: string): Promise<void> => {
  const { error } = await supabase.from("academic_years").delete().eq("id", id);
  if (error) throw error;
};
