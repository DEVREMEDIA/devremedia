import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { DeltaBadge } from '../shared/delta-badge';
import { getBusinessVelocity } from '@/lib/queries/dashboard/velocity';
import type { VelocityCounter } from '@/types/dashboard';

const fmtEur = (n: number) =>
  new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);

function VelocityRow({ label, c }: { label: string; c: VelocityCounter }) {
  const deltaPct =
    c.deltaVsPrevious === 0
      ? 0
      : c.count === 0
        ? -100
        : (c.deltaVsPrevious / Math.max(1, c.count - c.deltaVsPrevious)) * 100;
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-b-0">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium tabular-nums">
          {c.count}
          {c.sum != null && c.sum > 0 ? ` · ${fmtEur(c.sum)}` : ''}
        </span>
        <DeltaBadge deltaPct={deltaPct} />
      </div>
    </div>
  );
}

export async function BusinessVelocity() {
  const t = await getTranslations('dashboard.velocity');
  const v = await getBusinessVelocity(7);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Activity className="h-5 w-5 text-muted-foreground" />
        <CardTitle className="text-lg">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <VelocityRow label={t('projectsCreated')} c={v.projectsCreated} />
        <VelocityRow label={t('projectsDelivered')} c={v.projectsDelivered} />
        <VelocityRow label={t('invoicesPaid')} c={v.invoicesPaid} />
        <VelocityRow label={t('contractsSigned')} c={v.contractsSigned} />
        <VelocityRow label={t('proposalsSent')} c={v.proposalsSent} />
      </CardContent>
    </Card>
  );
}
