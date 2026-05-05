import { supabase } from "@/integrations/supabase/client";

const SIGNED_URL_TTL_SECONDS = 60 * 60;
const SIGNED_URL_REFRESH_BUFFER_MS = 60 * 1000;

type CachedSignedUrl = {
  url: string;
  expiresAt: number;
};

const signedUrlCache = new Map<string, CachedSignedUrl>();

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;
const STORAGE_PATH_PATTERN = /\/storage\/v1\/(?:object|render\/image)\/(?:public|sign)\/([^/]+)\/(.+)$/;
const KNOWN_MEDIA_BUCKETS = new Set(["avatars", "gallery-media", "project-media"]);

const decodeStoragePath = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const parseSupabaseStorageUrl = (value?: string | null) => {
  if (!value || !ABSOLUTE_URL_PATTERN.test(value)) return null;

  try {
    const url = new URL(value);
    const match = url.pathname.match(STORAGE_PATH_PATTERN);
    if (!match) return null;

    return {
      bucket: decodeURIComponent(match[1]),
      path: decodeStoragePath(match[2]),
    };
  } catch {
    return null;
  }
};

export const getStorageObjectPath = (value?: string | null) => {
  if (!value) return "";
  const trimmed = value.trim();
  const parsed = parseSupabaseStorageUrl(trimmed);

  if (parsed?.path) return parsed.path;
  if (ABSOLUTE_URL_PATTERN.test(trimmed)) return "";

  return trimmed.replace(/^\/+/, "");
};

const parseBucketPrefixedPath = (value: string) => {
  const trimmed = value.replace(/^\/+/, "");
  const [bucket, ...pathParts] = trimmed.split("/");

  if (!KNOWN_MEDIA_BUCKETS.has(bucket) || pathParts.length === 0) return null;

  return {
    bucket,
    path: pathParts.join("/"),
  };
};

export const getMediaTypeFromUrl = (value?: string | null): "image" | "video" | "document" => {
  const path = parseSupabaseStorageUrl(value)?.path || value || "";

  if (/\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(path)) return "video";
  if (/\.pdf(\?|#|$)/i.test(path)) return "document";
  return "image";
};

export const resolveStorageMediaUrl = async (
  value?: string | null,
  fallbackBucket?: string
) => {
  const trimmed = value?.trim();
  if (!trimmed) return "";

  const parsed = parseSupabaseStorageUrl(trimmed);
  const prefixedPath = parsed ? null : parseBucketPrefixedPath(trimmed);
  const bucket = parsed?.bucket || prefixedPath?.bucket || fallbackBucket;
  const path = parsed?.path || prefixedPath?.path || getStorageObjectPath(trimmed);

  if (!bucket || !path) return trimmed;

  const cacheKey = `${bucket}:${path}`;
  const cached = signedUrlCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now() + SIGNED_URL_REFRESH_BUFFER_MS) {
    return cached.url;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.warn(`Unable to sign storage URL for ${bucket}/${path}`, error);
    return trimmed;
  }

  signedUrlCache.set(cacheKey, {
    url: data.signedUrl,
    expiresAt: Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
  });

  return data.signedUrl;
};

export const resolveStorageMediaUrls = async (
  values: string[] | null | undefined,
  fallbackBucket?: string
) => Promise.all((values || []).map((value) => resolveStorageMediaUrl(value, fallbackBucket)));
