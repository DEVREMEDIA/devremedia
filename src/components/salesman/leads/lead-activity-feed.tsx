'use client';

import { formatDistanceToNow } from 'date-fns';
import { Phone, Mail, Calendar, StickyNote, ArrowRight, MoreHorizontal } from 'lucide-react';
import { LEAD_ACTIVITY_TYPE_LABELS } from '@/lib/constants';
import type { LeadActivity, LeadActivityType } from '@/types';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

type LeadActivityFeedProps = {
  activities: Array<LeadActivity & { user?: { display_name: string } }>;
};

const activityIcons: Record<LeadActivityType, React.ComponentType<{ className?: string }>> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: StickyNote,
  stage_change: ArrowRight,
  other: MoreHorizontal,
};

export function LeadActivityFeed({ activities }: LeadActivityFeedProps) {
  const t = useTranslations('leads');

  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MoreHorizontal className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-sm">{t('noActivities')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((activity) => {
        const Icon = activityIcons[activity.activity_type];

        return (
          <div
            key={activity.id}
            className={cn(
              'flex gap-3 p-3 rounded-lg transition-all duration-200',
              'border border-border/50 hover:border-primary/30 hover:bg-primary/5',
            )}
          >
            <div className="p-2 rounded-lg h-fit shrink-0 bg-muted">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <h4 className="text-sm font-medium">{activity.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    {LEAD_ACTIVITY_TYPE_LABELS[activity.activity_type]}
                    {activity.user && ` • ${activity.user.display_name}`}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </span>
              </div>

              {activity.description && (
                <p className="text-xs text-muted-foreground mt-1">{activity.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
