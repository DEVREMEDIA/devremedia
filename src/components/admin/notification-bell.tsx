'use client';

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslations } from 'next-intl';

export function NotificationBell() {
  const t = useTranslations('common');
  const hasUnread = false; // TODO: connect to real notification system

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t('notifications')}>
          <Bell className="h-5 w-5" aria-hidden="true" />
          {hasUnread && (
            <span
              className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"
              aria-hidden="true"
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem className="text-center text-muted-foreground cursor-default focus:bg-transparent">
          {t('noNotifications')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
