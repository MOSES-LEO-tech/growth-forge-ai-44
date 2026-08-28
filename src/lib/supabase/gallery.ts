import { supabase } from '@/integrations/supabase/client';
import type { GalleryEvent, GalleryFolder, GalleryMedia } from '@/integrations/supabase/types';
import { getMediaTypeFromUrl, resolveStorageMediaUrl } from './storageMedia';
import { invokePublicData } from './publicData';

const EVENT_TABLES = ['gallery_events', 'events'] as const;

type EventTable = (typeof EVENT_TABLES)[number];

type EventRow = GalleryEvent & {
  gallery_media?: GalleryMedia[];
  media?: GalleryMedia[];
  media_count?: number;
  media_type?: 'image' | 'video' | 'document';
  media_url?: string;
  thumbnail_url?: string;
  visibility?: 'private' | 'public' | 'parents';
};

type EventRowWithProfile = GalleryEvent & {
  profiles?: {
    full_name: string | null;
    email: string | null;
  } | null;
};

const isSchemaError = (error: any) => {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42P01' || message.includes('schema cache') || message.includes('does not exist');
};

const getMediaType = (url: string): 'image' | 'video' | 'document' => {
  return getMediaTypeFromUrl(url);
};

const appendMediaToProject = async (projectId: string, mediaUrl: string) => {
  const { data: project, error: fetchError } = await (supabase as any)
    .from('projects')
    .select('media_urls')
    .eq('id', projectId)
    .single();

  if (fetchError) throw fetchError;

  const currentUrls = Array.isArray(project?.media_urls) ? project.media_urls : [];
  const nextUrls = currentUrls.includes(mediaUrl) ? currentUrls : [...currentUrls, mediaUrl];

  const { error: updateError } = await (supabase as any)
    .from('projects')
    .update({ media_urls: nextUrls })
    .eq('id', projectId);

  if (updateError) throw updateError;
};

const getProjectMediaEvents = async (userId: string) => {
  const attempts = [
    { ownerColumn: 'owner_id', includeDeletedFilter: true },
    { ownerColumn: 'owner_id', includeDeletedFilter: false },
    { ownerColumn: 'user_id', includeDeletedFilter: true },
    { ownerColumn: 'user_id', includeDeletedFilter: false },
  ];

  let projects: any[] = [];
  let lastError: any;

  for (const attempt of attempts) {
    let query = (supabase as any)
      .from('projects')
      .select('id,title,description,media_urls,created_at')
      .eq(attempt.ownerColumn, userId)
      .order('created_at', { ascending: false });

    if (attempt.includeDeletedFilter) {
      query = query.is('deleted_at', null);
    }

    const { data, error } = await query;

    if (!error) {
      projects = data || [];
      break;
    }

    lastError = error;
  }

  if (lastError && projects.length === 0) throw lastError;

  const rows = projects.flatMap((project) => {
    const urls = Array.isArray(project.media_urls) ? project.media_urls : [];

    return urls.map((url: string, index: number) => ({
      project,
      url,
      index,
    }));
  });

  const events = await Promise.all(
    rows.map(async ({ project, url, index }) => {
      const signedUrl = await resolveStorageMediaUrl(url, 'project-media');
      const media = {
        id: `${project.id}-media-${index}`,
        event_id: project.id,
        url: signedUrl,
        type: getMediaType(url),
        created_at: project.created_at,
        deleted_at: null,
      };

      return {
        id: `${project.id}-${index}`,
        user_id: userId,
        title: index === 0 ? project.title : `${project.title} media ${index + 1}`,
        description: project.description,
        location: null,
        event_date: project.created_at,
        is_public: false,
        created_at: project.created_at,
        deleted_at: null,
        gallery_media: [media],
        media: [media],
        media_count: 1,
        media_type: media.type,
        media_url: signedUrl,
        thumbnail_url: signedUrl,
        visibility: 'private',
      };
    })
  );

  return events as EventRow[];
};

const queryEvents = async (
  build: (table: EventTable) => any,
  allowMissingDeletedAt = false
) => {
  let lastError: any;

  for (const table of EVENT_TABLES) {
    const { data, error } = await build(table);

    if (!error) {
      return { data: data || [], table };
    }

    lastError = error;

    if (allowMissingDeletedAt && String(error.message || '').includes('deleted_at')) {
      const { data: fallbackData, error: fallbackError } = await build(table).throwOnError?.() ?? { data: null, error };
      if (!fallbackError) {
        return { data: fallbackData || [], table };
      }
      lastError = fallbackError;
    }

    if (!isSchemaError(error)) {
      throw error;
    }
  }

  throw lastError;
};

const withActiveFilter = (query: any) => query.is('deleted_at', null);

const getMediaForEvents = async (eventIds: string[]) => {
  if (eventIds.length === 0) return new Map<string, GalleryMedia[]>();

  const { data, error } = await (supabase as any)
    .from('gallery_media')
    .select('*')
    .in('event_id', eventIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).reduce((map: Map<string, GalleryMedia[]>, media: GalleryMedia) => {
    if (!media.event_id) return map;
    const list = map.get(media.event_id) || [];
    list.push(media);
    map.set(media.event_id, list);
    return map;
  }, new Map<string, GalleryMedia[]>());
};

const normalizeEvents = async (events: GalleryEvent[]) => {
  const mediaByEventId = await getMediaForEvents(events.map((event) => event.id));

  const normalizedEvents = await Promise.all(events.map(async (event) => {
    const media = mediaByEventId.get(event.id) || [];
    const signedMedia = await Promise.all(media.map(async (item) => ({
      ...item,
      url: await resolveStorageMediaUrl(item.url, 'gallery-media'),
    })));
    const primary = signedMedia[0];

    return {
      ...event,
      gallery_media: signedMedia,
      media: signedMedia,
      media_count: signedMedia.length,
      media_type: (primary?.type || getMediaType(primary?.url || '') || 'image') as EventRow['media_type'],
      media_url: primary?.url || '',
      thumbnail_url: primary?.url || undefined,
      visibility: event.is_public ? 'public' : 'private',
    };
  }));

  return normalizedEvents as EventRow[];
};

const normalizePublicEvents = async (events: EventRow[]) => {
  const normalizedEvents = await Promise.all(events.map(async (event) => {
    const media = event.gallery_media || event.media || [];
    const signedMedia = await Promise.all(media.map(async (item) => ({
      ...item,
      url: await resolveStorageMediaUrl(item.url, 'gallery-media'),
    })));
    const primary = signedMedia[0];

    return {
      ...event,
      gallery_media: signedMedia,
      media: signedMedia,
      media_count: signedMedia.length,
      media_type: (primary?.type || getMediaType(primary?.url || '') || 'image') as EventRow['media_type'],
      media_url: primary?.url || '',
      thumbnail_url: primary?.url || undefined,
      visibility: event.is_public ? 'public' : 'private',
    };
  }));

  return normalizedEvents as EventRow[];
};

export const getGalleryEvents = async (userId: string) => {
  try {
    const { data } = await queryEvents((table) =>
      withActiveFilter((supabase as any).from(table).select('*').eq('user_id', userId))
        .order('created_at', { ascending: false })
    );

    return normalizeEvents(data as GalleryEvent[]);
  } catch (error) {
    if (isSchemaError(error)) return getProjectMediaEvents(userId);
    throw error;
  }
};

export const getPublicEvents = async () => {
  try {
    const { events } = await invokePublicData<{ events: EventRow[] }>('gallery_events');
    return normalizePublicEvents(events);
  } catch (error) {
    if (isSchemaError(error)) return [];
    throw error;
  }
};

export const getPendingMediaEvents = async () => {
  const { data } = await queryEvents((table) =>
    withActiveFilter((supabase as any)
      .from(table)
      .select('*, profiles(full_name,email)')
      .eq('approval_status', 'pending'))
      .order('created_at', { ascending: false })
  );

  const rows = (data || []) as EventRowWithProfile[];
  const profilesByEventId = new Map(rows.map((event) => [event.id, event.profiles || null]));
  const normalized = await normalizeEvents(rows);

  return normalized.map((event) => ({
    ...event,
    student_name: profilesByEventId.get(event.id)?.full_name || null,
    student_email: profilesByEventId.get(event.id)?.email || null,
  })) as (EventRow & { student_name: string | null; student_email: string | null })[];
};

export const approveMediaEvent = async (id: string) => {
  const { error } = await supabase.rpc('approve_student_media_event', { p_event_id: id });
  if (error) throw error;
};

export const rejectMediaEvent = async (id: string, reason?: string) => {
  const { error } = await supabase.rpc('reject_student_media_event', {
    p_event_id: id,
    p_reason: reason || null,
  });
  if (error) throw error;
};

export const createEvent = async (data: Partial<GalleryEvent>) => {
  try {
    const { data: event } = await queryEvents((table) =>
      (supabase as any)
        .from(table)
        .insert({ ...data, approval_status: data.approval_status || 'pending' })
        .select()
        .single()
    );

    return event as GalleryEvent;
  } catch (error) {
    if (!isSchemaError(error)) throw error;

    const projectShell = {
      owner_id: data.user_id,
      title: data.title || 'Gallery item',
      description: data.description || null,
    };

    const attempts = [
      projectShell,
      { user_id: data.user_id, title: projectShell.title, description: projectShell.description },
    ];

    let lastError: any;

    for (const payload of attempts) {
      const { data: project, error: projectError } = await (supabase as any)
        .from('projects')
        .insert(payload)
        .select('id,title,description,created_at')
        .single();

      if (!projectError) {
        return {
          id: project.id,
          user_id: data.user_id || null,
          title: project.title,
          description: project.description,
          location: null,
          event_date: project.created_at,
          is_public: false,
          created_at: project.created_at,
          deleted_at: null,
        } as GalleryEvent;
      }

      lastError = projectError;
    }

    throw lastError;
  }
};

export const deleteEvent = async (id: string) => {
  await queryEvents((table) =>
    (supabase as any)
      .from(table)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
  );
};

export const updateEvent = async (id: string, data: Partial<GalleryEvent>) => {
  const { data: event } = await queryEvents((table) =>
    (supabase as any)
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single()
  );

  return event as GalleryEvent;
};

export const getAllEvents = async () => {
  const { data } = await queryEvents((table) =>
    withActiveFilter((supabase as any).from(table).select('*'))
      .order('event_date', { ascending: false })
  );

  return normalizeEvents(data as GalleryEvent[]);
};

export const getEventDetails = async (id: string) => {
  try {
    const { event } = await invokePublicData<{ event: EventRow & { school_name?: string } }>('gallery_event_detail', { id });
    const normalized = await normalizePublicEvents([event]);
    const publicEvent = normalized[0];

    return {
      ...publicEvent,
      school_name: event.school_name || 'No school',
      media: (publicEvent.media || []).map((media, index) => ({
        ...media,
        title: index === 0 ? publicEvent.title : `${publicEvent.title} media ${index + 1}`,
        description: publicEvent.description || '',
        media_url: media.url,
        media_type: media.type,
      })),
    };
  } catch {
    // Private owner/admin views still use RLS-backed table access.
  }

  const { data } = await queryEvents((table) =>
    (supabase as any)
      .from(table)
      .select('*, profiles(full_name, schools(name))')
      .eq('id', id)
      .single()
  );

  const normalized = await normalizeEvents([data as GalleryEvent]);
  const event = normalized[0] as EventRow & { profiles?: any };

  return {
    ...event,
    school_name: event.profiles?.schools?.name || 'No school',
    media: (event.media || []).map((media, index) => ({
      ...media,
      title: index === 0 ? event.title : `${event.title} media ${index + 1}`,
      description: event.description || '',
      media_url: media.url,
      media_type: media.type,
    })),
  };
};

export const uploadMedia = async (eventId: string, file: File) => {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('User not authenticated');

  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${eventId}/${Math.random()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('gallery-media')
    .upload(fileName, file, { upsert: false });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('gallery-media')
    .getPublicUrl(fileName);

  const { data: media, error: dbError } = await (supabase as any)
    .from('gallery_media')
    .insert({
      event_id: eventId,
      url: fileName,
      type: file.type.startsWith('video') ? 'video' : file.type === 'application/pdf' ? 'document' : 'image'
    })
    .select()
    .single();

  if (dbError) {
    if (isSchemaError(dbError)) {
      await appendMediaToProject(eventId, publicUrl);
      return {
        id: `${eventId}-${Date.now()}`,
        event_id: eventId,
        url: publicUrl,
        type: file.type.startsWith('video') ? 'video' : file.type === 'application/pdf' ? 'document' : 'image',
        created_at: new Date().toISOString(),
        deleted_at: null,
      } as GalleryMedia;
    }

    throw dbError;
  }

  return media as GalleryMedia;
};

export const uploadMultipleMedia = async (eventId: string, files: File[]): Promise<GalleryMedia[]> => {
  const results: GalleryMedia[] = [];
  for (const file of files) {
    results.push(await uploadMedia(eventId, file));
  }
  return results;
};

// ---- Gallery folders -----------------------------------------------------

export const getGalleryFolders = async (userId: string): Promise<GalleryFolder[]> => {
  const { data, error } = await (supabase as any)
    .from('gallery_folders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as GalleryFolder[];
};

export const createGalleryFolder = async (userId: string, name: string): Promise<GalleryFolder> => {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Folder name is required');

  const { data, error } = await (supabase as any)
    .from('gallery_folders')
    .insert({ user_id: userId, name: trimmed })
    .select()
    .single();

  if (error) throw error;
  return data as GalleryFolder;
};

export const renameGalleryFolder = async (id: string, name: string): Promise<GalleryFolder> => {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Folder name is required');

  const { data, error } = await (supabase as any)
    .from('gallery_folders')
    .update({ name: trimmed })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as GalleryFolder;
};

export const deleteGalleryFolder = async (id: string): Promise<void> => {
  const { error } = await (supabase as any)
    .from('gallery_folders')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
