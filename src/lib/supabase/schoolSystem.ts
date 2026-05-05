import { supabase } from "@/integrations/supabase/client";
import type { Profile, School, SchoolConnectionRequest, SchoolJoinCode } from "@/integrations/supabase/types";

export type PendingSchoolApplication = School & {
  admin_name: string | null;
  admin_email: string | null;
};

export type SchoolConnectionRequestWithProfile = SchoolConnectionRequest & {
  profile?: Pick<Profile, "full_name" | "email" | "avatar_url" | "role"> | null;
  school?: Pick<School, "name" | "location" | "country"> | null;
};

export const requestSchoolConnection = async (code: string) => {
  const { data, error } = await supabase.rpc("request_school_connection", { p_code: code.trim() });
  if (error) throw error;
  return data;
};

export const rotateSchoolJoinCode = async (schoolId?: string | null) => {
  const { data, error } = await supabase.rpc("rotate_school_join_code", { p_school_id: schoolId ?? null });
  if (error) throw error;
  return data;
};

export const approveSchoolApplication = async (schoolId: string) => {
  const { data, error } = await (supabase as any).rpc("super_admin_approve_school_application", { p_school_id: schoolId });
  if (error) throw error;
  return data;
};

export const rejectSchoolApplication = async (schoolId: string, reason?: string) => {
  const { data, error } = await (supabase as any).rpc("super_admin_reject_school_application", {
    p_school_id: schoolId,
    p_reason: reason || null,
  });
  if (error) throw error;
  return data;
};

export const approveSchoolConnection = async (requestId: string) => {
  const { data, error } = await supabase.rpc("approve_school_connection", { p_request_id: requestId });
  if (error) throw error;
  return data;
};

export const rejectSchoolConnection = async (requestId: string, reason?: string) => {
  const { data, error } = await supabase.rpc("reject_school_connection", {
    p_request_id: requestId,
    p_reason: reason || null,
  });
  if (error) throw error;
  return data;
};

export const disconnectMySchool = async () => {
  const { data, error } = await supabase.rpc("disconnect_my_school");
  if (error) throw error;
  return data;
};

export const getActiveSchoolJoinCode = async (schoolId: string) => {
  await supabase.auth.getSession();

  const { data, error } = await supabase.rpc("get_active_school_join_code", { p_school_id: schoolId });

  if (error) throw error;
  return (data?.[0] || null) as SchoolJoinCode | null;
};

export const getSchoolConnectionRequests = async (schoolId: string) => {
  const { data, error } = await supabase
    .from("school_connection_requests")
    .select("*, profile:profiles!school_connection_requests_user_id_fkey(full_name,email,avatar_url,role)")
    .eq("school_id", schoolId)
    .eq("status", "pending")
    .order("requested_at", { ascending: true });

  if (error) throw error;
  return (data || []) as SchoolConnectionRequestWithProfile[];
};

export const getMyPendingSchoolConnectionRequest = async (userId: string) => {
  const { data, error } = await supabase
    .from("school_connection_requests")
    .select("*, school:schools(name,location,country)")
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as SchoolConnectionRequestWithProfile | null;
};

export const getSchoolById = async (schoolId: string) => {
  const { data, error } = await supabase.from("schools").select("*").eq("id", schoolId).maybeSingle();
  if (error) throw error;
  return data as School | null;
};
