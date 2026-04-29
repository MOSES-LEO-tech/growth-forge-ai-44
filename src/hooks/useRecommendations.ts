import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ScholarshipMatch {
  scholarship_id: string;
  title: string;
  match_score: number;
  reason: string;
}

export interface ActionItem {
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
}

export interface AIRecommendations {
  profile_completeness: number;
  missing_profile_fields: string[];
  scholarship_matches: ScholarshipMatch[];
  action_items: ActionItem[];
}

export const useRecommendations = () => {
  return useQuery({
    queryKey: ["ai-recommendations"],
    queryFn: async (): Promise<AIRecommendations> => {
      const { data, error } = await supabase.functions.invoke("generate-recommendations", {
        body: { type: "all" }, // Added for compatibility with updated function
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to fetch recommendations");

      return data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
  });
};

export const useRefreshRecommendations = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (): Promise<AIRecommendations> => {
      const { data, error } = await supabase.functions.invoke("generate-recommendations", {
        body: { type: "all" },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Failed to refresh recommendations");

      return data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["ai-recommendations"], data);
    },
  });
};
