import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getRevenueForecast } from '@/lib/queries/dashboard/sales';
import { formatEurInt as fmtEur } from '@/lib/format';

function ForecastBar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-sm">{label}</span>
        <span className="text-sm font-medium tabular-nums">{fmtEur(value)}</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-tone-positive transition-all"
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
    </div>
  );
}

export async function RevenueForecastCard() {
  const t = await getTranslations('dashboard.sales');
  const forecast = await getRevenueForecast();
  const max = Math.max(1, forecast.confirmed, forecast.likely, forecast.pipeline);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('forecast')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ForecastBar max={max} label={t('confirmed')} value={forecast.confirmed} />
        <ForecastBar max={max} label={t('likely')} value={forecast.likely} />
        <ForecastBar max={max} label={t('pipeline')} value={forecast.pipeline} />
        <div className="border-t pt-2 text-sm text-muted-foreground">
          {t('expected90d')}:{' '}
          <span className="font-medium text-foreground">{fmtEur(forecast.expectedTotal90d)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
