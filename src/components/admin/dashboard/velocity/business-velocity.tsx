import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { DeltaBadge } from '@/components/shared/delta-badge';
import { getBusinessVelocity } from '@/lib/queries/dashboard/velocity';
import type { MoneyDelta, VelocityCounter } from '@/types/dashboard';
import { formatEurInt as fmtEur } from '@/lib/format';

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
        <span className="font-mono text-sm font-medium tabular-nums">
          {c.count}
          {c.sum != null && c.sum > 0 ? ` · ${fmtEur(c.sum)}` : ''}
        </span>
        <DeltaBadge deltaPct={deltaPct} />
      </div>
    </div>
  );
}

function MoneyRow({ label, m }: { label: string; m: MoneyDelta }) {
  const prev = m.sum - m.deltaVsPrevious;
  const deltaPct = m.deltaVsPrevious === 0 ? 0 : prev <= 0 ? 100 : (m.deltaVsPrevious / prev) * 100;
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-b-0">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-medium tabular-nums">{fmtEur(m.sum)}</span>
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
        <CardTitle className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground">
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <VelocityRow label={t('projectsCreated')} c={v.projectsCreated} />
        <VelocityRow label={t('projectsDelivered')} c={v.projectsDelivered} />
        <MoneyRow label={t('revenueIssued')} m={v.revenueIssued} />
        <VelocityRow label={t('collections')} c={v.invoicesPaid} />
        <VelocityRow label={t('contractsSigned')} c={v.contractsSigned} />
        <VelocityRow label={t('proposalsSent')} c={v.proposalsSent} />
      </CardContent>
    </Card>
  );
}
