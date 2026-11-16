import { supabase } from "@/integrations/supabase/client";

export type ShowcaseSchool = {
  id: string;
  name: string;
  location: string | null;
  country: string | null;
  logo_url: string | null;
  student_count: number;
};

export type ShowcaseProject = {
  id: string;
  title: string;
  description: string | null;
  tags: string[] | null;
  updated_at: string | null;
  school_name: string | null;
  student: string;
};

export type ShowcaseAward = {
  id: string;
  title: string;
  category: string | null;
  date_earned: string | null;
  school_name: string | null;
  student: string;
};

export type Showcase = {
  schools: ShowcaseSchool[];
  projects: ShowcaseProject[];
  awards: ShowcaseAward[];
};

const EMPTY: Showcase = { schools: [], projects: [], awards: [] };

/**
 * Public showcase for the signed-in home page.
 *
 * One SECURITY DEFINER RPC returns approved schools, approved projects and
 * verified awards together. Student names arrive already masked ("Mark L.") —
 * masking happens in the database so a public surface cannot leak a full name
 * even if a component forgets.
 */
export const getShowcase = async (limit = 6): Promise<Showcase> => {
  const { data, error } = await supabase.rpc("public_showcase", { p_limit: limit });
  if (error) throw error;
  if (!data) return EMPTY;
  return {
    schools: data.schools ?? [],
    projects: data.projects ?? [],
    awards: data.awards ?? [],
  };
};
