import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { School, SchoolStats } from '@/types/schools';

export const useSchools = (search?: string, country?: string, page = 0, pageSize = 10) => {
  return useQuery({
    queryKey: ['schools', { search, country, page, pageSize }],
    queryFn: async () => {
      let query = supabase
        .from('schools')
        .select('*', { count: 'exact' });

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      if (country) {
        query = query.eq('country', country);
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query
        .range(from, to)
        .order('name');

      if (error) throw error;
      return { schools: data as School[], count };
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useSchool = (id: string) => {
  return useQuery({
    queryKey: ['school', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as School;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useSchoolStats = (id: string) => {
  return useQuery({
    queryKey: ['school-stats', id],
    queryFn: async (): Promise<SchoolStats> => {
      // Aggregate stats: total students, total achievements, total scholarships won
      const [studentsCount, achievementsCount, scholarshipsCount] = await Promise.all([
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', id),
        supabase
          .from('achievements')
          .select('id', { count: 'exact', head: true })
          .filter('user_id', 'in', `(SELECT id FROM profiles WHERE school_id = '${id}')`),
        supabase
          .from('scholarships')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', id),
      ]);

      if (studentsCount.error) throw studentsCount.error;
      if (achievementsCount.error) throw achievementsCount.error;
      if (scholarshipsCount.error) throw scholarshipsCount.error;

      return {
        total_students: studentsCount.count || 0,
        total_achievements: achievementsCount.count || 0,
        total_scholarships_won: scholarshipsCount.count || 0,
      };
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
        .insert(newSchool)
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
