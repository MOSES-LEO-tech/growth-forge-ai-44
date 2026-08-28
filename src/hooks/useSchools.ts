import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { School, SchoolStats } from '@/types/schools';
import { invokePublicData } from '@/lib/supabase/publicData';

export const useSchools = (search?: string, country?: string, page = 0, pageSize = 10) => {
  return useQuery({
    queryKey: ['schools', { search, country, page, pageSize }],
    queryFn: async () => {
      const data = await invokePublicData<{ schools: School[]; count: number }>('schools', {
        search,
        country,
        page,
        pageSize,
      });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useSchool = (id: string) => {
  return useQuery({
    queryKey: ['school', id],
    queryFn: async () => {
      const { school } = await invokePublicData<{ school: School }>('school_detail', { id });
      return school;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useSchoolStats = (id: string) => {
  return useQuery({
    queryKey: ['school-stats', id],
    queryFn: async (): Promise<SchoolStats> => {
      return invokePublicData<SchoolStats>('school_stats', { id });
    },
    enabled: !!id,
  });
};

export const useCreateSchool = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newSchool: Partial<School>) => {
      const { data, error } = await supabase
        .from('schools')
        .insert(newSchool as any)
        .select()
        .single();

      if (error) throw error;
      return data as School;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
    },
  });
};

export const useUpdateSchool = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<School> & { id: string }) => {
      const { data, error } = await supabase
        .from('schools')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as School;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      queryClient.invalidateQueries({ queryKey: ['school', data.id] });
    },
  });
};
