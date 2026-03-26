'use client';

import { Bell, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/use-auth';
import { useNotifications } from '@/hooks/use-notifications';
import { formatDistanceToNow } from 'date-fns';
import { GoogleSyncNotification } from '@/components/shared/google-sync-notification';
import type { GoogleSyncActionData } from '@/types';

export function NotificationBell() {
  const t = useTranslations('common');
  const router = useRouter();
  const { user } = useAuth();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications(
    user?.id ?? null,
  );

  const handleNotificationClick = async (notification: {
    id: string;
    action_url: string | null;
    read: boolean;
  }) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    if (notification.action_url) {
      router.push(notification.action_url);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t('notifications')}>
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
              aria-hidden="true"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        {isLoading ? (
          <DropdownMenuItem className="text-center text-muted-foreground cursor-default focus:bg-transparent">
            {t('loading')}...
          </DropdownMenuItem>
        ) : notifications.length === 0 ? (
          <DropdownMenuItem className="text-center text-muted-foreground cursor-default focus:bg-transparent">
            {t('noNotifications')}
          </DropdownMenuItem>
        ) : (
          <>
            {unreadCount > 0 && (
              <>
                <DropdownMenuItem
                  className="text-xs text-center text-primary cursor-pointer justify-center font-medium"
                  onClick={() => markAllAsRead()}
                >
                  <Check className="h-3 w-3 mr-1" />
                  {t('markAllRead')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {notifications.slice(0, 20).map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex flex-col items-start gap-1 cursor-pointer py-3"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex w-full items-start gap-2">
                  {!notification.read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight truncate">
                      {notification.title}
                    </p>
                    {notification.body && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.body}
                      </p>
                    )}
                    {notification.action_data && (
                      <GoogleSyncNotification
                        notificationId={notification.id}
                        actionData={notification.action_data as GoogleSyncActionData}
                        onAction={() => markAsRead(notification.id)}
                      />
                    )}
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
