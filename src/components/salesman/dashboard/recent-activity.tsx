'use client';

import { useTranslations } from 'next-intl';
import { Phone, Mail, MessageSquare, Calendar, CheckCircle, XCircle, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  activity_type: string;
  title: string;
  notes: string | null;
  created_at: string;
  lead?: {
    contact_name: string;
    company_name: string | null;
  } | null;
}

interface RecentActivityProps {
  activities: Activity[];
}

const ACTIVITY_ICONS: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: MessageSquare,
  proposal_sent: FileText,
  won: CheckCircle,
  lost: XCircle,
};

const ACTIVITY_STYLES: Record<string, { color: string; bg: string }> = {
  call: { color: 'text-blue-500', bg: 'bg-blue-500/10' },
  email: { color: 'text-purple-500', bg: 'bg-purple-500/10' },
  meeting: { color: 'text-amber-500', bg: 'bg-amber-500/10' },
  note: { color: 'text-muted-foreground', bg: 'bg-muted' },
  proposal_sent: { color: 'text-orange-500', bg: 'bg-orange-500/10' },
  won: { color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  lost: { color: 'text-red-500', bg: 'bg-red-500/10' },
};

export function RecentActivity({ activities }: RecentActivityProps) {
  const t = useTranslations('salesman.dashboard');

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border/50">
        <MessageSquare className="h-5 w-5 text-purple-500" />
        <h2 className="text-lg font-semibold">{t('recentActivity')}</h2>
      </div>
      <div className="p-5">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">{t('noRecentActivity')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map((activity) => {
              const Icon = ACTIVITY_ICONS[activity.activity_type] || MessageSquare;
              const style = ACTIVITY_STYLES[activity.activity_type] ?? ACTIVITY_STYLES.note;

              return (
                <div
                  key={activity.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg transition-all duration-200',
                    'border border-border/50 hover:border-amber-500/30 hover:bg-amber-500/5',
                  )}
                >
                  <div className={cn('p-2 rounded-lg shrink-0', style.bg)}>
                    <Icon className={cn('h-4 w-4', style.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm">{activity.title}</p>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {activity.lead && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activity.lead.contact_name}
                        {activity.lead.company_name && ` — ${activity.lead.company_name}`}
                      </p>
                    )}
                    {activity.notes && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {activity.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
