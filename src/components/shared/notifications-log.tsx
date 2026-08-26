'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Check } from 'lucide-react';
import { PageHeading } from '@/components/shared/page-heading';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  getMyNotificationsPage,
  markAsRead as markAsReadAction,
  markAllAsRead as markAllAsReadAction,
} from '@/lib/actions/notifications';
import {
  groupNotificationsByDay,
  type NotificationDayGroupKey,
} from '@/lib/notifications-grouping';
import type { Notification } from '@/types';

const PAGE_SIZE = 20;

const GROUP_LABEL_KEY: Record<NotificationDayGroupKey, string> = {
  today: 'groupToday',
  yesterday: 'groupYesterday',
  earlier: 'groupEarlier',
};

type Filter = 'all' | 'unread';

export function NotificationsLog() {
  const t = useTranslations('notificationsPage');
  const router = useRouter();

  const [filter, setFilter] = useState<Filter>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const load = useCallback(async (nextFilter: Filter) => {
    setIsLoading(true);
    const result = await getMyNotificationsPage({
      offset: 0,
      limit: PAGE_SIZE,
      filter: nextFilter,
    });
    if (!result.error && result.data) {
      setNotifications(result.data.notifications);
      setHasMore(result.data.hasMore);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    const result = await getMyNotificationsPage({
      offset: notifications.length,
      limit: PAGE_SIZE,
      filter,
    });
    if (!result.error && result.data) {
      setNotifications((prev) => [...prev, ...result.data!.notifications]);
      setHasMore(result.data.hasMore);
    }
    setIsLoadingMore(false);
  };

  const handleClick = async (notification: Notification) => {
    if (!notification.read) {
      setNotifications((prev) =>
        filter === 'unread'
          ? prev.filter((n) => n.id !== notification.id)
          : prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
      );
      await markAsReadAction(notification.id);
    }
    if (notification.action_url) {
      router.push(notification.action_url);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsReadAction();
    await load(filter);
  };

  const hasUnread = notifications.some((n) => !n.read);
  const groups = groupNotificationsByDay(notifications, new Date());

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 space-y-6">
      <PageHeading title={t('title')}>
        {hasUnread && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <Check className="h-4 w-4 mr-1.5" />
            {t('markAllRead')}
          </Button>
        )}
      </PageHeading>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          <TabsTrigger value="all">{t('tabAll')}</TabsTrigger>
          <TabsTrigger value="unread">{t('tabUnread')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
          <Bell className="h-10 w-10" aria-hidden="true" />
          <p>{filter === 'unread' ? t('emptyUnread') : t('empty')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.key} className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t(GROUP_LABEL_KEY[group.key])}
              </h2>
              <ul className="space-y-2">
                {group.notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => handleClick(notification)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent',
                        !notification.read && 'bg-accent/40',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                          notification.read ? 'bg-transparent' : 'bg-blue-500',
                        )}
                        aria-hidden="true"
                      />
                      <span className="flex-1 min-w-0">
                        <span
                          className={cn(
                            'block text-sm leading-tight',
                            notification.read ? 'font-normal' : 'font-semibold',
                          )}
                        >
                          {notification.title}
                        </span>
                        {notification.body && (
                          <span className="mt-0.5 block text-sm text-muted-foreground">
                            {notification.body}
                          </span>
                        )}
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={handleLoadMore} disabled={isLoadingMore}>
                {t('loadMore')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
