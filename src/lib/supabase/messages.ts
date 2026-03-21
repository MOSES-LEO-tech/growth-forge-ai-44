import { supabase } from '@/integrations/supabase/client';

export const getMessages = async (userId: string) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:profiles!messages_sender_id_fkey(full_name, avatar_url), receiver:profiles!messages_receiver_id_fkey(full_name, avatar_url)')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(msg => ({
    ...msg,
    sender_name: (msg.sender as any)?.full_name || 'Unknown',
    sender_avatar: (msg.sender as any)?.avatar_url,
    receiver_name: (msg.receiver as any)?.full_name || 'Unknown',
    direction: msg.sender_id === userId ? 'sent' : 'received'
  }));
};

export const sendMessage = async (senderId: string, receiverId: string, content: string, subject?: string) => {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      content,
      subject
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const markMessageRead = async (id: string) => {
  const { error } = await supabase
    .from('messages')
    .update({ read_status: true })
    .eq('id', id);

  if (error) throw error;
};
