import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

type TableName = 
  | 'profiles'
  | 'projects'
  | 'achievements'
  | 'scholarships'
  | 'scholarship_applications'
  | 'recommendations';

interface SubscribeOptions<T> {
  table: TableName;
  filter?: string;
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: T) => void;
  onDelete?: (payload: T) => void;
  enabled?: boolean;
}

export function useRealtimeSubscription<T extends { id: string }>({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
}: SubscribeOptions<T>) {
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const queryClient = useQueryClient();
  const tableKey = [table, filter].filter(Boolean).join(':');

  const handleInsert = useCallback((payload: { new: T }) => {
    queryClient.setQueryData<T[]>([tableKey], (old) => {
      if (!old) return [payload.new];
      return [payload.new, ...old];
    });
    onInsert?.(payload.new);
  }, [tableKey, onInsert, queryClient]);

  const handleUpdate = useCallback((payload: { new: T; old: Partial<T> }) => {
    queryClient.setQueryData<T[]>([tableKey], (old) => {
      if (!old) return old;
      return old.map(item => item.id === payload.new.id ? payload.new : item);
    });
    onUpdate?.(payload.new);
  }, [tableKey, onUpdate, queryClient]);

  const handleDelete = useCallback((payload: { old: Partial<T> }) => {
    queryClient.setQueryData<T[]>([tableKey], (old) => {
      if (!old) return old;
      return old.filter(item => item.id !== payload.old.id);
    });
    onDelete?.(payload.old as T);
  }, [tableKey, onDelete, queryClient]);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel(`${table}-changes-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table,
          filter: filter || undefined,
        },
        handleInsert
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table,
          filter: filter || undefined,
        },
        handleUpdate
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table,
          filter: filter || undefined,
        },
        handleDelete
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [table, filter, enabled, handleInsert, handleUpdate, handleDelete]);
}

export function usePolling({
  queryKey,
  interval = 30000,
  enabled = true,
}: {
  queryKey: string[];
  interval?: number;
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const intervalId = setInterval(() => {
      queryClient.invalidateQueries({ queryKey });
    }, interval);

    return () => clearInterval(intervalId);
  }, [queryKey, interval, enabled, queryClient]);
}

export function invalidateTableQuery(table: TableName) {
  return { queryKey: [table] };
}