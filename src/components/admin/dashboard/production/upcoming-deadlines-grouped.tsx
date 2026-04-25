import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getUpcomingDeadlinesGrouped } from '@/lib/queries/dashboard/production';
import type { DeadlineProject } from '@/types/dashboard';

function Row({ p }: { p: DeadlineProject }) {
  return (
    <Link
      href={`/admin/projects/${p.projectId}`}
      className="flex items-center justify-between gap-2 rounded-lg border p-2 hover:bg-accent"
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{p.title}</div>
        <div className="text-xs text-muted-foreground truncate">{p.clientName ?? '—'}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs tabular-nums text-muted-foreground">
          {p.daysUntilDeadline >= 0 ? `+${p.daysUntilDeadline}d` : `${p.daysUntilDeadline}d`}
        </span>
        <Badge variant="outline">{p.status}</Badge>
      </div>
    </Link>
  );
}

function DeadlineSection({ title, rows }: { title: string; rows: DeadlineProject[] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title} ({rows.length})
      </h4>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">—</p>
      ) : (
        rows.map((r) => <Row key={r.projectId} p={r} />)
      )}
    </div>
  );
}

export async function UpcomingDeadlinesGrouped() {
  const t = await getTranslations('dashboard.production');
  const groups = await getUpcomingDeadlinesGrouped(30);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('deadlines')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <DeadlineSection title={t('atRisk')} rows={groups.atRisk} />
        <DeadlineSection title={t('onTrack')} rows={groups.onTrack} />
        <DeadlineSection title={t('recentlyDelivered')} rows={groups.recentlyDelivered} />
      </CardContent>
    </Card>
  );
}
