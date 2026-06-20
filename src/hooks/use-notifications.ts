'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  getMyNotifications,
  markAsRead as markAsReadAction,
  markAllAsRead as markAllAsReadAction,
} from '@/lib/actions/notifications';
import type { Notification } from '@/types/index';

interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useNotifications(currentUserId: string | null): UseNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const t = useTranslations('common');

  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    const result = await getMyNotifications();
    if (!result.error && result.data) {
      setNotifications(result.data);
    }
    setIsLoading(false);
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await markAsReadAction(id);
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllAsReadAction();
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      setIsLoading(false);
      return;
    }

    fetchNotifications();

    // Subscribe to realtime notification inserts
    const supabase = createClient();
    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);

          // Discreet, clickable toast so a new notification is noticed while
          // the user is in the app, beyond the silent badge bump.
          toast(newNotification.title, {
            description: newNotification.body ?? undefined,
            action: newNotification.action_url
              ? {
                  label: t('view'),
                  onClick: () => router.push(newNotification.action_url!),
                }
              : undefined,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, fetchNotifications, router, t]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
