'use client';

import { StatusBadge } from '@/components/shared/status-badge';
import { format } from 'date-fns';
import { Video, FileVideo } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/shared/empty-state';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { DeliverableWithProject } from '@/types';

interface RecentDeliverablesProps {
  deliverables: DeliverableWithProject[];
}

export function RecentDeliverables({ deliverables }: RecentDeliverablesProps) {
  const router = useRouter();
  const t = useTranslations('client.dashboard');

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border/50">
        <Video className="h-5 w-5 text-amber-500" />
        <h2 className="text-lg font-semibold">{t('recentDeliverables')}</h2>
      </div>
      <div className="p-5">
        {deliverables.length === 0 ? (
          <EmptyState
            icon={FileVideo}
            title={t('noDeliverables')}
            description={t('noDeliverablesDescription')}
          />
        ) : (
          <div className="space-y-2">
            {deliverables.map((deliverable) => (
              <div
                key={deliverable.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200',
                  'border border-border/50 hover:border-amber-500/30 hover:bg-amber-500/5',
                )}
                onClick={() => router.push(`/client/projects/${deliverable.project_id}`)}
              >
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
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
                    v{deliverable.version} •{' '}
                    {format(new Date(deliverable.created_at), 'MMM d, yyyy')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
