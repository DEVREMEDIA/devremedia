import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSalesFunnel } from '@/lib/queries/dashboard/sales';

export async function SalesFunnelCard() {
  const t = await getTranslations('dashboard.sales');
  const { stages, conversions } = await getSalesFunnel();
  const max = Math.max(1, ...stages.map((s) => s.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('funnel')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stages.map((s, i) => {
          const widthPct = (s.count / max) * 100;
          const conv = i < conversions.length ? conversions[i] : null;
          return (
            <div key={s.key} className="space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">{t(`stages.${s.key}`)}</span>
                <span className="text-sm tabular-nums">{s.count}</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              {conv && (
                <div className="pl-2 text-xs text-muted-foreground">
                  ↓ {conv.ratePct.toFixed(0)}%
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
