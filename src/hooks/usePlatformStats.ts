import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PlatformStats = {
  studentPortfolios: number;
  projectsRecorded: number;
  partnerSchools: number;
  awardsVerified: number;
};

export function usePlatformStats() {
  return useQuery({
    queryKey: ["platform-stats"],
    queryFn: async (): Promise<PlatformStats> => {
      const [studentPortfolios, projectsRecorded, partnerSchools, awardsVerified] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("projects").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("schools").select("id", { count: "exact", head: true }),
        supabase.from("achievements").select("id", { count: "exact", head: true }).eq("verified", true),
      ]);

      const results = [studentPortfolios, projectsRecorded, partnerSchools, awardsVerified];
      const failedResult = results.find((result) => result.error);

      if (failedResult?.error) {
        throw failedResult.error;
      }

      return {
        studentPortfolios: studentPortfolios.count ?? 0,
        projectsRecorded: projectsRecorded.count ?? 0,
        partnerSchools: partnerSchools.count ?? 0,
        awardsVerified: awardsVerified.count ?? 0,
      };
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
