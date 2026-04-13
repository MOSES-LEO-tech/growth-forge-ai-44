import { supabase } from '@/integrations/supabase/client';
import type { GalleryEvent, GalleryMedia } from '@/integrations/supabase/types';

export const getGalleryEvents = async (userId: string) => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as GalleryEvent[];
};

export const getPublicEvents = async () => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('is_public', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as GalleryEvent[];
};

export const createEvent = async (data: Partial<GalleryEvent>) => {
  const { data: event, error } = await supabase
    .from('events')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return event as GalleryEvent;
};

export const deleteEvent = async (id: string) => {
  const { error } = await supabase
    .from('events')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
};

export const updateEvent = async (id: string, data: Partial<GalleryEvent>) => {
  const { data: event, error } = await supabase
    .from('events')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return event as GalleryEvent;
};

export const getAllEvents = async () => {
  const { data, error } = await supabase
    .from('events')
    .select('*, gallery_media(url)')
    .is('deleted_at', null)
    .order('event_date', { ascending: false });

  if (error) throw error;
  return data.map(event => ({
    ...event,
    media_count: (event.gallery_media as any)?.length || 0,
    thumbnail_url: (event.gallery_media as any)?.[0]?.url
  }));
};

export const getEventDetails = async (id: string) => {
  const { data, error } = await supabase
    .from('events')
    .select('*, gallery_media(*), profiles(full_name, schools(name))')
    .eq('id', id)
    .single();

  if (error) throw error;
  return {
    ...data,
    school_name: (data.profiles as any)?.schools?.name || 'No school',
    media: data.gallery_media
  };
};

export const uploadMedia = async (eventId: string, file: File) => {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('User not authenticated');

  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${eventId}/${Math.random()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('gallery-media')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('gallery-media')
    .getPublicUrl(filePath);

  const { data: media, error: dbError } = await supabase
    .from('gallery_media')
    .insert({
      event_id: eventId,
      url: publicUrl,
      type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document'
    })
    .select()
    .single();

  if (dbError) throw dbError;
  return media as GalleryMedia;
};
