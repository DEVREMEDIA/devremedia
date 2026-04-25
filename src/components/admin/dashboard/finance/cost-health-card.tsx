import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCostModelHealth } from '@/lib/queries/dashboard/finance';

const fmtEur = (n: number) =>
  new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
const fmtPct = (n: number | null) => (n == null ? '—' : `${(n * 100).toFixed(1)}%`);

export async function CostHealthCard() {
  const t = await getTranslations('dashboard.finance');
  const health = await getCostModelHealth();
  const max = Math.max(1, ...health.categories.map((c) => c.total));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('costHealth')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground">{t('totalMonthlyCost')}</div>
            <div className="text-xl font-bold tabular-nums">{fmtEur(health.totalMonthlyCost)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t('costPerHour')}</div>
            <div className="text-xl font-bold tabular-nums">{fmtEur(health.costPerHour)}</div>
          </div>
        </div>
        <div className="space-y-2">
          {health.categories.map((c) => (
            <div key={c.name} className="space-y-1">
              <div className="flex items-baseline justify-between text-xs">
                <span>{c.name}</span>
                <span className="tabular-nums">{fmtEur(c.total)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${(c.total / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-sm">
            {t('marginStatus')}: {fmtPct(health.avgProjectMargin90d)} /{' '}
            {fmtPct(health.targetMargin)}
          </span>
          <Badge variant={health.marginOnTarget ? 'default' : 'destructive'}>
            {health.marginOnTarget ? t('marginOnTarget') : t('marginBelow')}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
