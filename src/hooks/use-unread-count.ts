'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UseUnreadCountResult {
  unreadCount: number;
  isLoading: boolean;
}

export function useUnreadCount(currentUserId: string | null): UseUnreadCountResult {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId) {
      setIsLoading(false);
      return;
    }

    const supabase = createClient();
    const fetchUnreadCount = async () => {
      setIsLoading(true);
      try {
        const { count, error } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .not('read_by', 'cs', JSON.stringify([currentUserId]))
          .neq('sender_id', currentUserId);

        if (!error && count !== null) {
          setUnreadCount(count);
        }
      } catch (error) {
        console.error('Failed to fetch unread count:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchUnreadCount();

    // Subscribe to changes
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          // Only increment if it's not from the current user
          if (payload.new.sender_id !== currentUserId) {
            setUnreadCount((prev) => prev + 1);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          // If the current user was added to read_by
          const oldReadBy = (payload.old?.read_by ?? []) as string[];
          const newReadBy = (payload.new?.read_by ?? []) as string[];
          if (
            !oldReadBy.includes(currentUserId!) &&
            newReadBy.includes(currentUserId!) &&
            payload.new.sender_id !== currentUserId
          ) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        },
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [currentUserId]);

  return { unreadCount, isLoading };
}
