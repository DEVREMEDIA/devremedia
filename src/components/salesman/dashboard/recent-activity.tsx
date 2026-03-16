'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Mail, MessageSquare, Calendar, CheckCircle, XCircle, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

const ACTIVITY_COLORS: Record<string, string> = {
  call: 'text-blue-600 dark:text-blue-400',
  email: 'text-purple-600 dark:text-purple-400',
  meeting: 'text-yellow-600 dark:text-yellow-400',
  note: 'text-gray-600 dark:text-gray-400',
  proposal_sent: 'text-orange-600 dark:text-orange-400',
  won: 'text-green-600 dark:text-green-400',
  lost: 'text-red-600 dark:text-red-400',
};

export function RecentActivity({ activities }: RecentActivityProps) {
  const t = useTranslations('salesman.dashboard');

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('recentActivity')}</CardTitle>
          <CardDescription>{t('latestInteractions')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">{t('noRecentActivity')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('recentActivity')}</CardTitle>
        <CardDescription>{t('latestInteractions')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = ACTIVITY_ICONS[activity.activity_type] || MessageSquare;
            const iconColor = ACTIVITY_COLORS[activity.activity_type] || 'text-gray-600';

            return (
              <div
                key={activity.id}
                className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0"
              >
                <div className={`mt-1 ${iconColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="font-medium">{activity.title}</p>
                  {activity.lead && (
                    <p className="text-sm text-muted-foreground">
                      {activity.lead.contact_name}
                      {activity.lead.company_name && ` - ${activity.lead.company_name}`}
                    </p>
                  )}
                  {activity.notes && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{activity.notes}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
