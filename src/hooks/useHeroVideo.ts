import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function useHeroVideo() {
  const queryClient = useQueryClient();

  const { data: videoUrl, isLoading } = useQuery({
    queryKey: ["hero-video"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'hero_video_url')
        .single();
      
      if (error) return null;
      return (data?.value as string) || null;
    },
  });

  const uploadVideo = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `hero-video.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('gallery-media')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('gallery-media')
        .getPublicUrl(filePath);
      
      const { error: settingsError } = await supabase
        .from('site_settings')
        .upsert({ key: 'hero_video_url', value: publicUrl, updated_at: new Date().toISOString() });
      
      if (settingsError) throw settingsError;
      
      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hero-video"] });
      toast.success("Hero video uploaded successfully!");
    },
    onError: (error: any) => {
      toast.error("Failed to upload video: " + error.message);
    },
  });

  const removeVideo = useMutation({
    mutationFn: async () => {
      await supabase
        .from('site_settings')
        .update({ value: null, updated_at: new Date().toISOString() })
        .eq('key', 'hero_video_url');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hero-video"] });
      toast.success("Hero video removed");
    },
    onError: (error: any) => {
      toast.error("Failed to remove video: " + error.message);
    },
  });

  return { videoUrl, isLoading, uploadVideo, removeVideo };
}
