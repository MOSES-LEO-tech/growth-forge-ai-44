import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type EventRow = Tables<'events'>;
type MediaRow = Tables<'media_items'>;

export const getGalleryEvents = async (userId: string) => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as EventRow[];
};

export const getPublicEvents = async () => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('verified', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as EventRow[];
};

export const createEvent = async (input: {
  title: string;
  description?: string;
  event_date?: string;
  created_by?: string;
}) => {
  const { data: event, error } = await supabase
    .from('events')
    .insert({
      title: input.title,
      description: input.description || null,
      event_date: input.event_date || new Date().toISOString(),
      created_by: input.created_by || null,
    })
    .select()
    .single();

  if (error) throw error;
  return event as EventRow;
};

export const deleteEvent = async (id: string) => {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const updateEvent = async (id: string, data: Partial<EventRow>) => {
  const { data: event, error } = await supabase
    .from('events')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return event as EventRow;
};

export const getAllEvents = async () => {
  const { data, error } = await supabase
    .from('events')
    .select('*, media_items(media_url)')
    .order('event_date', { ascending: false });

  if (error) throw error;
  return data.map(event => ({
    ...event,
    media_count: (event.media_items as any)?.length || 0,
    thumbnail_url: (event.media_items as any)?.[0]?.media_url
  }));
};

export const getEventDetails = async (id: string) => {
  const { data, error } = await supabase
    .from('events')
    .select('*, media_items(*)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return {
    ...data,
    media: data.media_items
  };
};

export const uploadMedia = async (eventId: string, file: File) => {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('User not authenticated');

  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${eventId}/${Math.random()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('gallery-media')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('gallery-media')
    .getPublicUrl(fileName);

  const mediaType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document';

  const { data: media, error: dbError } = await supabase
    .from('media_items')
    .insert({
      event_id: eventId,
      media_url: publicUrl,
      media_type: mediaType,
      title: file.name,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (dbError) throw dbError;
  return media as MediaRow;
};
