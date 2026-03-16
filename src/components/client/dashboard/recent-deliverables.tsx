'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { format } from 'date-fns';
import { Video, FileVideo } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/shared/empty-state';
import { useTranslations } from 'next-intl';
import type { DeliverableWithProject } from '@/types';

interface RecentDeliverablesProps {
  deliverables: DeliverableWithProject[];
}

export function RecentDeliverables({ deliverables }: RecentDeliverablesProps) {
  const router = useRouter();
  const t = useTranslations('client.dashboard');

  if (deliverables.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('recentDeliverables')}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={FileVideo}
            title={t('noDeliverables')}
            description={t('noDeliverablesDescription')}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('recentDeliverables')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {deliverables.map((deliverable) => (
            <div
              key={deliverable.id}
              className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => router.push(`/client/projects/${deliverable.project_id}`)}
            >
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Video className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-sm line-clamp-1">{deliverable.title}</div>
                  <StatusBadge status={deliverable.status} />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {deliverable.project?.title || 'Unknown Project'}
                </div>
                <div className="text-xs text-muted-foreground">
                  v{deliverable.version} • {format(new Date(deliverable.created_at), 'MMM d, yyyy')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
