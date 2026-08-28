import { supabase } from "@/integrations/supabase/client";
import type { SchoolAnnouncement } from "@/integrations/supabase/types";

export type AnnouncementAudience = SchoolAnnouncement["audience"];

export interface PublishAnnouncementResult {
  id: string;
  status: "published";
  recipients: number;
}

export const listSchoolAnnouncements = async (schoolId: string): Promise<SchoolAnnouncement[]> => {
  const { data, error } = await supabase
    .from("school_announcements")
    .select("*")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as SchoolAnnouncement[];
};

export const createAnnouncement = async (
  input: Pick<SchoolAnnouncement, "school_id" | "title" | "message" | "audience">
): Promise<SchoolAnnouncement> => {
  const { data, error } = await supabase
    .from("school_announcements")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as SchoolAnnouncement;
};

export const updateAnnouncement = async (
  id: string,
  patch: Partial<Pick<SchoolAnnouncement, "title" | "message" | "audience">>
): Promise<SchoolAnnouncement> => {
  const { data, error } = await supabase
    .from("school_announcements")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as SchoolAnnouncement;
};

export const deleteAnnouncement = async (id: string): Promise<void> => {
  const { error } = await supabase.from("school_announcements").delete().eq("id", id);
  if (error) throw error;
};

/** School admin: publishes and fans out notifications via the RPC. */
export const publishAnnouncement = async (id: string): Promise<PublishAnnouncementResult> => {
  const { data, error } = await supabase.rpc("announcements_publish", {
    p_announcement_id: id,
  });
  if (error) throw error;
  return data as PublishAnnouncementResult;
};
