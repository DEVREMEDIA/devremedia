import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCostModelHealth, getProjectProfitability } from '@/lib/queries/dashboard/finance';
import type { ProjectProfitabilityRow } from '@/types/dashboard';
import { formatEurInt as fmtEur } from '@/lib/format';

function Row({ row, target }: { row: ProjectProfitabilityRow; target: number }) {
  const pct = row.marginPct;
  const tone = pct >= target ? 'default' : pct >= target - 0.1 ? 'secondary' : 'destructive';
  return (
    <Link
      href={`/admin/projects/${row.projectId}`}
      className="flex items-center justify-between gap-3 rounded-lg border p-2 hover:bg-accent"
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{row.title}</div>
        <div className="text-xs text-muted-foreground truncate">
          {row.clientName ?? '—'} · {fmtEur(row.quotedPrice)} / {fmtEur(row.cost)}
        </div>
      </div>
      <Badge variant={tone}>{(pct * 100).toFixed(0)}%</Badge>
    </Link>
  );
}

export async function ProjectProfitabilityCard() {
  const t = await getTranslations('dashboard.finance');
  const [data, health] = await Promise.all([getProjectProfitability(), getCostModelHealth()]);
  const targetMargin = health.targetMargin;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('profitability')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('topProfitable')}
          </h4>
          {data.topProfitable.length === 0 ? (
            <p className="text-xs text-muted-foreground">—</p>
          ) : (
            data.topProfitable.map((r) => <Row key={r.projectId} row={r} target={targetMargin} />)
          )}
        </div>
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('topUnprofitable')}
          </h4>
          {data.topUnprofitable.length === 0 ? (
            <p className="text-xs text-muted-foreground">—</p>
          ) : (
            data.topUnprofitable.map((r) => <Row key={r.projectId} row={r} target={targetMargin} />)
          )}
        </div>
      </CardContent>
    </Card>
  );
}
