import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getRevenueForecast } from '@/lib/queries/dashboard/sales';

const fmtEur = (n: number) =>
  new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);

export async function RevenueForecastCard() {
  const t = await getTranslations('dashboard.sales');
  const forecast = await getRevenueForecast();
  const max = Math.max(1, forecast.confirmed, forecast.likely, forecast.pipeline);

  const Bar = ({ label, value }: { label: string; value: number }) => (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-sm">{label}</span>
        <span className="text-sm font-medium tabular-nums">{fmtEur(value)}</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-emerald-500 transition-all"
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('forecast')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Bar label={t('confirmed')} value={forecast.confirmed} />
        <Bar label={t('likely')} value={forecast.likely} />
        <Bar label={t('pipeline')} value={forecast.pipeline} />
        <div className="border-t pt-2 text-sm text-muted-foreground">
          {t('expected90d')}:{' '}
          <span className="font-medium text-foreground">{fmtEur(forecast.expectedTotal90d)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
