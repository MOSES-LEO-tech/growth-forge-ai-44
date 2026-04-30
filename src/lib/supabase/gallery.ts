import { supabase } from '@/integrations/supabase/client';
import type { GalleryEvent, GalleryMedia } from '@/integrations/supabase/types';

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

const isSchemaError = (error: any) => {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42P01' || message.includes('schema cache') || message.includes('does not exist');
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

  return events.map((event) => {
    const media = mediaByEventId.get(event.id) || [];
    const primary = media[0];

    return {
      ...event,
      gallery_media: media,
      media,
      media_count: media.length,
      media_type: (primary?.type || 'image') as EventRow['media_type'],
      media_url: primary?.url || '',
      thumbnail_url: primary?.url || undefined,
      visibility: event.is_public ? 'public' : 'private',
    };
  }) as EventRow[];
};

export const getGalleryEvents = async (userId: string) => {
  const { data } = await queryEvents((table) =>
    withActiveFilter((supabase as any).from(table).select('*').eq('user_id', userId))
      .order('created_at', { ascending: false })
  );

  return normalizeEvents(data as GalleryEvent[]);
};

export const getPublicEvents = async () => {
  const { data } = await queryEvents((table) =>
    withActiveFilter((supabase as any).from(table).select('*').eq('is_public', true))
      .order('created_at', { ascending: false })
  );

  return normalizeEvents(data as GalleryEvent[]);
};

export const createEvent = async (data: Partial<GalleryEvent>) => {
  const { data: event } = await queryEvents((table) =>
    (supabase as any)
      .from(table)
      .insert(data)
      .select()
      .single()
  );

  return event as GalleryEvent;
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
    media: event.media || [],
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
      url: publicUrl,
      type: file.type.startsWith('video') ? 'video' : file.type === 'application/pdf' ? 'document' : 'image'
    })
    .select()
    .single();

  if (dbError) throw dbError;
  return media as GalleryMedia;
};
