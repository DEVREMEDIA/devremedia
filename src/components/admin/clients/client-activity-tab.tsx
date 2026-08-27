'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { getActivityByClient } from '@/lib/actions/activity';
import type { ActivityLogWithUser } from '@/types/relations';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { statusTone, type Tone } from '@/lib/status-tone';

const PAGE_SIZE = 20;
const RECENT_THRESHOLD_DAYS = 7;

interface ClientActivityTabProps {
  clientId: string;
  refreshKey: number;
}

export function ClientActivityTab({ clientId, refreshKey }: ClientActivityTabProps) {
  const t = useTranslations('clients');
  const [entries, setEntries] = useState<ActivityLogWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    async function fetchInitial() {
      setIsLoading(true);
      const result = await getActivityByClient(clientId, { limit: PAGE_SIZE, offset: 0 });
      if (!result.error && result.data) {
        setEntries(result.data);
        setHasMore(result.data.length === PAGE_SIZE);
      }
      setIsLoading(false);
    }
    fetchInitial();
  }, [clientId, refreshKey]);

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    const result = await getActivityByClient(clientId, {
      limit: PAGE_SIZE,
      offset: entries.length,
    });
    if (!result.error && result.data) {
      setEntries((prev) => [...prev, ...result.data!]);
      setHasMore(result.data.length === PAGE_SIZE);
    }
    setIsLoadingMore(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={Activity}
            title={t('activityTab.noActivity')}
            description={t('activityTab.noActivityDescription')}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('activityTab.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {entries.map((entry) => {
            const date = new Date(entry.created_at);
            const isRecent = Date.now() - date.getTime() < RECENT_THRESHOLD_DAYS * 86400000;

            return (
              <div key={entry.id} className="flex items-center gap-3">
                <ActivityDot action={entry.action} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    {entry.action} {entry.entity_type}
                  </p>
                  {entry.user && (
                    <p className="text-xs text-muted-foreground">{entry.user.display_name}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {isRecent
                    ? formatDistanceToNow(date, { addSuffix: true })
                    : format(date, 'dd/MM/yyyy')}
                </span>
              </div>
            );
          })}
        </div>

        {hasMore && (
          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={handleLoadMore} disabled={isLoadingMore}>
              {isLoadingMore ? '...' : t('activityTab.loadMore')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Same tone map task-card.tsx and project-card.tsx already use — the dot's
// colour is the action's tone (statusTone), not a hand-picked hue per action.
const TONE_DOT: Record<Tone, string> = {
  critical: 'bg-tone-critical',
  caution: 'bg-tone-caution',
  positive: 'bg-tone-positive',
  neutral: 'bg-tone-neutral',
};

function ActivityDot({ action }: { action: string }) {
  return <div className={`h-2 w-2 rounded-full ${TONE_DOT[statusTone(action)]}`} />;
}
