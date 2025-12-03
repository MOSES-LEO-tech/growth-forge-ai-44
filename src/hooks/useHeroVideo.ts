import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useHeroVideo() {
  const queryClient = useQueryClient();

  const { data: videoUrl, isLoading } = useQuery({
    queryKey: ["hero-video"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "hero_video_url")
        .single();
      
      if (error) throw error;
      return data?.value || null;
    },
  });

  const uploadVideo = useMutation({
    mutationFn: async (file: File) => {
      // Upload to storage
      const fileName = `hero-video-${Date.now()}.${file.name.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("hero-media")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("hero-media")
        .getPublicUrl(fileName);

      // Update site settings
      const { error: updateError } = await supabase
        .from("site_settings")
        .update({ value: urlData.publicUrl, updated_at: new Date().toISOString() })
        .eq("key", "hero_video_url");

      if (updateError) throw updateError;

      return urlData.publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hero-video"] });
      toast.success("Hero video updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to upload video: " + error.message);
    },
  });

  const removeVideo = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("site_settings")
        .update({ value: null, updated_at: new Date().toISOString() })
        .eq("key", "hero_video_url");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hero-video"] });
      toast.success("Hero video removed");
    },
    onError: (error) => {
      toast.error("Failed to remove video: " + error.message);
    },
  });

  return {
    videoUrl,
    isLoading,
    uploadVideo,
    removeVideo,
  };
}
