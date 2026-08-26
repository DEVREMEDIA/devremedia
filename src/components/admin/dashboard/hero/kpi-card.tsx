import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DeltaBadge } from '@/components/shared/delta-badge';
import { ExceptionBadge } from '../shared/exception-badge';
import { Sparkline } from '@/components/shared/sparkline';
import { cn } from '@/lib/utils';
import type { KpiMetric } from '@/types/dashboard';

type Props = {
  label: string;
  metric: KpiMetric;
  href: string;
  icon: LucideIcon;
  formatValue?: (n: number) => string;
  invertDeltaColors?: boolean;
};

export function KpiCard({
  label,
  metric,
  href,
  icon: Icon,
  formatValue,
  invertDeltaColors,
}: Props) {
  const display = formatValue ? formatValue(metric.value) : String(metric.value);
  return (
    <Link href={href}>
      <Card
        className={cn(
          'transition-colors hover:bg-accent',
          metric.exception && 'border-tone-critical',
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
          </div>
          <ExceptionBadge active={metric.exception} />
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono text-2xl font-bold tabular-nums">{display}</span>
            <DeltaBadge deltaPct={metric.deltaPct} invertColors={invertDeltaColors} />
          </div>
          {metric.sparkline && metric.sparkline.length > 0 ? (
            <Sparkline data={metric.sparkline} />
          ) : (
            <div className="h-8" />
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
