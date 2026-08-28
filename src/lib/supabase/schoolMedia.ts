import { supabase } from "@/integrations/supabase/client";
import type { SchoolGalleryMedia } from "@/integrations/supabase/types";

export type SchoolGalleryMediaType = "image" | "video";

const SCHOOL_ASSETS_BUCKET = "school-assets";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

const mediaTypeOf = (file: File): SchoolGalleryMediaType =>
  file.type.startsWith("video/") ? "video" : "image";

const buildAssetPath = (schoolId: string, folder: "hero" | "gallery", file: File) => {
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const safeName =
    file.name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || folder;
  const randomId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${schoolId}/${folder}/${randomId}-${safeName}.${extension}`;
};

/** Upload an image or video into the school's public asset bucket. */
export const uploadSchoolMedia = async (
  schoolId: string,
  file: File,
  folder: "hero" | "gallery"
): Promise<{ url: string; mediaType: SchoolGalleryMediaType }> => {
  const mediaType = mediaTypeOf(file);
  const maxBytes = mediaType === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;

  if (mediaType === "video" && !file.type.startsWith("video/")) {
    throw new Error("Choose a video file.");
  }
  if (mediaType === "image" && !file.type.startsWith("image/")) {
    throw new Error("Choose an image file.");
  }
  if (file.size > maxBytes) {
    throw new Error(
      mediaType === "video" ? "Videos must be 100 MB or smaller." : "Images must be 10 MB or smaller."
    );
  }

  const path = buildAssetPath(schoolId, folder, file);
  const { error: uploadError } = await supabase.storage
    .from(SCHOOL_ASSETS_BUCKET)
    .upload(path, file, { cacheControl: "3600", contentType: file.type, upsert: false });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(SCHOOL_ASSETS_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, mediaType };
};

export const listSchoolGalleryMedia = async (schoolId: string): Promise<SchoolGalleryMedia[]> => {
  const { data, error } = await supabase
    .from("school_gallery_media")
    .select("*")
    .eq("school_id", schoolId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []) as SchoolGalleryMedia[];
};

export const addSchoolGalleryMedia = async (
  schoolId: string,
  url: string,
  mediaType: SchoolGalleryMediaType,
  caption?: string | null
): Promise<SchoolGalleryMedia> => {
  const { data: last, error: orderError } = await supabase
    .from("school_gallery_media")
    .select("sort_order")
    .eq("school_id", schoolId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (orderError) throw orderError;

  const nextOrder = (last?.sort_order ?? -1) + 1;
  const { data, error } = await supabase
    .from("school_gallery_media")
    .insert({ school_id: schoolId, url, media_type: mediaType, caption: caption || null, sort_order: nextOrder })
    .select()
    .single();
  if (error) throw error;
  return data as SchoolGalleryMedia;
};

export const updateSchoolGalleryMedia = async (
  id: string,
  patch: Partial<Pick<SchoolGalleryMedia, "caption" | "url" | "media_type">>
): Promise<void> => {
  const { error } = await supabase
    .from("school_gallery_media")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
};

export const removeSchoolGalleryMedia = async (id: string): Promise<void> => {
  const { error } = await supabase.from("school_gallery_media").delete().eq("id", id);
  if (error) throw error;
};

/** Persist the new ordering by rewriting sort_order for each id in sequence. */
export const reorderSchoolGalleryMedia = async (orderedIds: string[]): Promise<void> => {
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("school_gallery_media")
        .update({ sort_order: index, updated_at: new Date().toISOString() })
        .eq("id", id)
    )
  );
};

export interface SchoolHeroInput {
  cover_url?: string | null;
  hero_video_url?: string | null;
  tagline?: string | null;
  founded_year?: number | null;
}

export const saveSchoolHero = async (schoolId: string, patch: SchoolHeroInput): Promise<void> => {
  const { error } = await supabase
    .from("schools")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", schoolId);
  if (error) throw error;
};
