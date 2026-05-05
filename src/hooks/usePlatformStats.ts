import { useQuery } from "@tanstack/react-query";
import { invokePublicData } from "@/lib/supabase/publicData";

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
      return invokePublicData<PlatformStats>("platform_stats");
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
