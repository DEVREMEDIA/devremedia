import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { RiskItem } from '@/components/admin/dashboard/risk/risk-item';
import { getRiskItems } from '@/lib/queries/dashboard/risk';
import type { RiskType } from '@/types/dashboard';

const RISK_TYPES: RiskType[] = [
  'overdue_invoice',
  'stale_lead',
  'stale_deliverable',
  'unsigned_contract',
  'deadline_risk',
  'filming_no_crew',
];

export default async function DashboardRiskPage() {
  const t = await getTranslations('dashboard.risk');
  const items = await getRiskItems();

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} />
      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t('empty')}
          </CardContent>
        </Card>
      ) : (
        RISK_TYPES.map((type) => {
          const filtered = items.filter((i) => i.type === type);
          if (filtered.length === 0) return null;
          return (
            <div key={type} className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t(`types.${type}`)} ({filtered.length})
              </h2>
              <div className="space-y-2">
                {filtered.map((it) => (
                  <RiskItem key={it.id} item={it} label={t(`types.${it.type}`)} />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
