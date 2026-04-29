import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ScholarshipStatus = 'bookmarked' | 'applied' | 'interview' | 'awarded' | 'rejected';

export interface ScholarshipApplication {
  id: string;
  user_id: string;
  scholarship_id: string;
  status: ScholarshipStatus;
  applied_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  scholarship: {
    id: string;
    title: string;
    amount: number | null;
    deadline: string | null;
    requirements: string | null;
  };
}

export const useMyApplications = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["scholarship-applications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("scholarship_applications")
        .select(`
          *,
          scholarship:scholarships (
            id,
            title,
            amount,
            deadline,
            requirements
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as ScholarshipApplication[];
    },
    enabled: !!user,
  });
};

export const useApplicationStatus = (scholarshipId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["scholarship-application-status", scholarshipId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("scholarship_applications")
        .select("status")
        .eq("user_id", user.id)
        .eq("scholarship_id", scholarshipId)
        .maybeSingle();

      if (error) throw error;
      return data?.status as ScholarshipStatus | null;
    },
    enabled: !!user && !!scholarshipId,
  });
};

export const useBookmarkScholarship = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scholarshipId: string) => {
      if (!user) throw new Error("Authentication required");

      const { data, error } = await supabase
        .from("scholarship_applications")
        .upsert({
          user_id: user.id,
          scholarship_id: scholarshipId,
          status: 'bookmarked'
        }, {
          onConflict: 'user_id,scholarship_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, scholarshipId) => {
      queryClient.invalidateQueries({ queryKey: ["scholarship-applications", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["scholarship-application-status", scholarshipId, user?.id] });
    },
  });
};

export const useUpdateApplicationStatus = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scholarshipId, status, notes }: { scholarshipId: string, status: ScholarshipStatus, notes?: string }) => {
      if (!user) throw new Error("Authentication required");

      const updates: any = { status, updated_at: new Date().toISOString() };
      if (status === 'applied') {
        updates.applied_at = new Date().toISOString();
      }
      if (notes !== undefined) {
        updates.notes = notes;
      }

      const { data, error } = await supabase
        .from("scholarship_applications")
        .update(updates)
        .eq("user_id", user.id)
        .eq("scholarship_id", scholarshipId)
        .select()
        .single();

      if (error) throw error;

      // Gamification tie-in
      if (status === 'applied' || status === 'awarded') {
        const trigger = status === 'applied' ? 'scholarship_applied' : 'scholarship_won';
        await supabase.functions.invoke("award-achievement", {
          body: { trigger_event: trigger }
        }).catch(err => console.error("Achievement award failed:", err));
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["scholarship-applications", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["scholarship-application-status", variables.scholarshipId, user?.id] });
    },
  });
};
