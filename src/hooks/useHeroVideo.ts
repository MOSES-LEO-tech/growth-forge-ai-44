import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { settings } from "@/services/api";
import api from "@/services/api";

export function useHeroVideo() {
  const queryClient = useQueryClient();

  const { data: videoUrl, isLoading } = useQuery({
    queryKey: ["hero-video"],
    queryFn: async () => {
      const response = await settings.get("hero_video_url");
      return response.data?.data?.value || null;
    },
  });

  const uploadVideo = useMutation({
    mutationFn: async (file: File) => {
      // Upload to local backend
      const formData = new FormData();
      formData.append("file", file);
      
      const uploadResponse = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      const fileUrl = uploadResponse.data?.data?.url || uploadResponse.data?.url;
      
      // Update site settings with the video URL
      await settings.update("hero_video_url", fileUrl);
      
      return fileUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hero-video"] });
      toast.success("Hero video uploaded successfully!");
    },
    onError: (error: any) => {
      toast.error("Failed to upload video: " + (error.response?.data?.message || error.message));
    },
  });

  const removeVideo = useMutation({
    mutationFn: async () => {
      await settings.update("hero_video_url", null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hero-video"] });
      toast.success("Hero video removed");
    },
    onError: (error: any) => {
      toast.error("Failed to remove video: " + (error.response?.data?.message || error.message));
    },
  });

  return { videoUrl, isLoading, uploadVideo, removeVideo };
}
