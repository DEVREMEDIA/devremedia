'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import type { ActivityLogWithUser } from '@/types';

type ActivityFeedProps = {
  activities: ActivityLogWithUser[];
};

function getActivityLink(activity: ActivityLogWithUser): string | null {
  if (!activity.entity_id) return null;

  const routes: Record<string, string> = {
    project: '/admin/projects',
    client: '/admin/clients',
    invoice: '/admin/invoices',
    contract: '/admin/contracts',
    filming_request: '/admin/filming-requests',
  };

  const base = routes[activity.entity_type];
  if (!base) return null;

  return `${base}/${activity.entity_id}`;
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const t = useTranslations('dashboard');

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatAction = (activity: ActivityLogWithUser) => {
    const entityTypeLabel = activity.entity_type.replace('_', ' ');
    return `${activity.action} ${entityTypeLabel}`;
  };

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('recentActivity')}</CardTitle>
          <CardDescription>{t('latestActionsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">{t('noActivity')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('recentActivity')}</CardTitle>
        <CardDescription>{t('latestActionsDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const link = getActivityLink(activity);
            const user = activity.user;
            const content = (
              <>
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.avatar_url || undefined} />
                  <AvatarFallback>{getInitials(user?.display_name || t('user'))}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium leading-none">
                      {user?.display_name ?? t('user')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">{formatAction(activity)}</p>
                </div>
              </>
            );

            return link ? (
              <Link
                key={activity.id}
                href={link}
                className="flex gap-3 rounded-md -mx-2 px-2 py-1 hover:bg-accent transition-colors"
              >
                {content}
              </Link>
            ) : (
              <div key={activity.id} className="flex gap-3 px-2 py-1">
                {content}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
