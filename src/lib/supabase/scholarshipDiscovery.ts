import { supabase } from "@/integrations/supabase/client";

export type OnlineLead = {
  url: string;
  title: string;
  domain: string;
  snippet: string;
  score?: number;
};

export type DiscoveryResponse = {
  results: OnlineLead[];
  cached?: boolean;
  unavailable?: boolean;
  reason?: string;
};

/**
 * Ask the edge function for web-search leads for this student.
 *
 * The function is the only place that talks to the search API: it rate-limits
 * per student, filters blocked domains and scam patterns, and writes leads to
 * `scholarship_candidates`. Nothing returned here is verified.
 */
export const discoverScholarships = async (): Promise<DiscoveryResponse> => {
  const { data, error } = await supabase.functions.invoke("discover-scholarships", { body: {} });
  if (error) throw error;
  return (data ?? { results: [] }) as DiscoveryResponse;
};

/** Flag a lead as wrong, spam or dead. Admins see the flag in the triage queue. */
export const reportOnlineLead = async (url: string, reason = "reported by student"): Promise<void> => {
  const { error } = await supabase.functions.invoke("discover-scholarships", {
    body: { action: "report", url, reason },
  });
  if (error) throw error;
};
