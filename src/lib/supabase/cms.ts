import { supabase } from '@/integrations/supabase/client';
import type {
  CmsContentVersion,
  CmsEvent,
  CmsNews,
  CmsPage,
  CmsResource,
} from '@/integrations/supabase/types';

export const CMS_ENTITY_TYPES = ['cms_pages', 'cms_news', 'cms_events', 'cms_resources'] as const;
export type CmsEntityType = (typeof CMS_ENTITY_TYPES)[number];

export interface CmsRpcResult {
  entity_type: string;
  entity_id: string;
  status: 'draft' | 'pending_review' | 'published' | 'rejected';
  version?: number;
}

export interface SchoolCmsBundle {
  pages: CmsPage[];
  news: CmsNews[];
  events: CmsEvent[];
  resources: CmsResource[];
}

const fromCms = (table: CmsEntityType) => (supabase as any).from(table);

const parseRpcResult = (data: unknown): CmsRpcResult => {
  if (!data || typeof data !== 'object') throw new Error('Unexpected CMS RPC response.');
  return data as CmsRpcResult;
};

// ---- Pages -----------------------------------------------------------------

export const listSchoolPages = async (schoolId: string): Promise<CmsPage[]> => {
  const { data, error } = await fromCms('cms_pages')
    .select('*')
    .eq('school_id', schoolId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []) as CmsPage[];
};

export const getSchoolPageBySlug = async (schoolId: string, slug: string): Promise<CmsPage | null> => {
  const { data, error } = await fromCms('cms_pages')
    .select('*')
    .eq('school_id', schoolId)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return (data || null) as CmsPage | null;
};

export const createCmsPage = async (input: Pick<CmsPage, 'school_id' | 'slug' | 'title' | 'content' | 'hero_image_url'>): Promise<CmsPage> => {
  const { data, error } = await fromCms('cms_pages').insert(input).select().single();
  if (error) throw error;
  return data as CmsPage;
};

export const updateCmsPage = async (id: string, patch: Partial<CmsPage>): Promise<CmsPage> => {
  const { data, error } = await fromCms('cms_pages').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as CmsPage;
};

export const deleteCmsPage = async (id: string): Promise<void> => {
  const { error } = await fromCms('cms_pages').delete().eq('id', id);
  if (error) throw error;
};

// ---- News ------------------------------------------------------------------

export const listSchoolNews = async (schoolId: string): Promise<CmsNews[]> => {
  const { data, error } = await fromCms('cms_news')
    .select('*')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as CmsNews[];
};

export const createCmsNews = async (input: Pick<CmsNews, 'school_id' | 'title' | 'body' | 'audience' | 'featured' | 'publish_at' | 'expire_at'>): Promise<CmsNews> => {
  const { data, error } = await fromCms('cms_news').insert(input).select().single();
  if (error) throw error;
  return data as CmsNews;
};

export const updateCmsNews = async (id: string, patch: Partial<CmsNews>): Promise<CmsNews> => {
  const { data, error } = await fromCms('cms_news').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as CmsNews;
};

export const deleteCmsNews = async (id: string): Promise<void> => {
  const { error } = await fromCms('cms_news').delete().eq('id', id);
  if (error) throw error;
};

// ---- Events ----------------------------------------------------------------

export const listSchoolEvents = async (schoolId: string): Promise<CmsEvent[]> => {
  const { data, error } = await fromCms('cms_events')
    .select('*')
    .eq('school_id', schoolId)
    .order('event_date', { ascending: false });
  if (error) throw error;
  return (data || []) as CmsEvent[];
};

export const createCmsEvent = async (input: Pick<CmsEvent, 'school_id' | 'title' | 'description' | 'location' | 'event_date' | 'end_date' | 'audience'>): Promise<CmsEvent> => {
  const { data, error } = await fromCms('cms_events').insert(input).select().single();
  if (error) throw error;
  return data as CmsEvent;
};

export const updateCmsEvent = async (id: string, patch: Partial<CmsEvent>): Promise<CmsEvent> => {
  const { data, error } = await fromCms('cms_events').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as CmsEvent;
};

export const deleteCmsEvent = async (id: string): Promise<void> => {
  const { error } = await fromCms('cms_events').delete().eq('id', id);
  if (error) throw error;
};

// ---- Resources -------------------------------------------------------------

export const listSchoolResources = async (schoolId: string): Promise<CmsResource[]> => {
  const { data, error } = await fromCms('cms_resources')
    .select('*')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as CmsResource[];
};

export const createCmsResource = async (input: Pick<CmsResource, 'school_id' | 'title' | 'description' | 'category' | 'file_url' | 'file_type' | 'file_size' | 'tags'>): Promise<CmsResource> => {
  const { data, error } = await fromCms('cms_resources').insert(input).select().single();
  if (error) throw error;
  return data as CmsResource;
};

export const updateCmsResource = async (id: string, patch: Partial<CmsResource>): Promise<CmsResource> => {
  const { data, error } = await fromCms('cms_resources').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as CmsResource;
};

export const deleteCmsResource = async (id: string): Promise<void> => {
  const { error } = await fromCms('cms_resources').delete().eq('id', id);
  if (error) throw error;
};

// ---- Review workflow -------------------------------------------------------

/** Author/teacher: moves a draft into the school admin review queue. */
export const submitCmsForReview = async (entityType: CmsEntityType, entityId: string): Promise<CmsRpcResult> => {
  const { data, error } = await supabase.rpc('cms_submit_for_review', {
    p_entity_type: entityType,
    p_entity_id: entityId,
  });
  if (error) throw error;
  return parseRpcResult(data);
};

/** School admin: publishes pending/draft content. */
export const publishCms = async (entityType: CmsEntityType, entityId: string): Promise<CmsRpcResult> => {
  const { data, error } = await supabase.rpc('cms_publish', {
    p_entity_type: entityType,
    p_entity_id: entityId,
  });
  if (error) throw error;
  return parseRpcResult(data);
};

/** School admin: rejects content with an optional reason. */
export const rejectCms = async (entityType: CmsEntityType, entityId: string, reason?: string): Promise<CmsRpcResult> => {
  const { data, error } = await supabase.rpc('cms_reject', {
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_reason: reason || null,
  });
  if (error) throw error;
  return parseRpcResult(data);
};

/** School staff: full version history for an entity (newest first). */
export const listCmsVersions = async (entityType: CmsEntityType, entityId: string): Promise<CmsContentVersion[]> => {
  const { data, error } = await supabase.rpc('cms_list_versions', {
    p_entity_type: entityType,
    p_entity_id: entityId,
  });
  if (error) throw error;
  return (data || []) as CmsContentVersion[];
};

/** School admin: restores a snapshot as a new draft revision. */
export const restoreCmsVersion = async (entityType: CmsEntityType, entityId: string, version: number): Promise<CmsRpcResult> => {
  const { data, error } = await supabase.rpc('cms_restore_version', {
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_version: version,
  });
  if (error) throw error;
  return parseRpcResult(data);
};

// ---- Public rendering ------------------------------------------------------

/** Everything published for the school's public profile (public audience only). */
export const getPublishedSchoolCms = async (schoolId: string): Promise<SchoolCmsBundle> => {
  const now = new Date();

  const [pagesResult, newsResult, eventsResult, resourcesResult] = await Promise.all([
    fromCms('cms_pages')
      .select('*')
      .eq('school_id', schoolId)
      .eq('status', 'published')
      .order('updated_at', { ascending: false }),
    fromCms('cms_news')
      .select('*')
      .eq('school_id', schoolId)
      .eq('status', 'published')
      .eq('audience', 'public')
      .order('created_at', { ascending: false }),
    fromCms('cms_events')
      .select('*')
      .eq('school_id', schoolId)
      .eq('status', 'published')
      .eq('audience', 'public')
      .order('event_date', { ascending: true }),
    fromCms('cms_resources')
      .select('*')
      .eq('school_id', schoolId)
      .eq('status', 'published')
      .order('created_at', { ascending: false }),
  ]);

  const [pages, news, events, resources] = [pagesResult, newsResult, eventsResult, resourcesResult].map(
    (result) => {
      if (result.error) throw result.error;
      return (result.data || []) as any[];
    }
  );

  const isWithinWindow = (row: { publish_at?: string | null; expire_at?: string | null }) => {
    if (row.publish_at && new Date(row.publish_at) > now) return false;
    if (row.expire_at && new Date(row.expire_at) <= now) return false;
    return true;
  };

  return {
    pages: pages as CmsPage[],
    news: (news.filter(isWithinWindow) as CmsNews[]),
    events: (events.filter((row: CmsEvent) => new Date(row.event_date) >= now) as CmsEvent[]),
    resources: resources as CmsResource[],
  };
};

/** Public rendering fallback for the About section: the school's published "about" page. */
export const getPublishedSchoolPage = async (schoolId: string, slug = 'about'): Promise<CmsPage | null> => {
  const { data, error } = await fromCms('cms_pages')
    .select('*')
    .eq('school_id', schoolId)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw error;
  return (data || null) as CmsPage | null;
};

// ---- Media uploads ---------------------------------------------------------

export interface CmsUploadOptions {
  schoolId: string;
  file: File;
  folder?: 'images' | 'files';
}

/**
 * Uploads a CMS asset into the public school-assets bucket under
 * `{schoolId}/cms/{folder}/...` and returns its public URL. Storage policies
 * allow admins and approved teachers of the school to upload there.
 */
export const uploadCmsMedia = async ({
  schoolId,
  file,
  folder = 'images',
}: CmsUploadOptions): Promise<string> => {
  const extension =
    file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const safeName =
    file.name
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || folder;
  const randomId = crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${schoolId}/cms/${folder}/${randomId}-${safeName}.${extension}`;

  const { error } = await supabase.storage
    .from('school-assets')
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from('school-assets').getPublicUrl(path);
  return data.publicUrl;
};
