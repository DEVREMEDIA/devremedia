import { getTranslations } from 'next-intl/server';
import {
  Activity,
  AlertTriangle,
  Banknote,
  Briefcase,
  Coins,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { KpiCard } from './kpi-card';
import { getKpiHero } from '@/lib/queries/dashboard/kpi-hero';
import { formatEurInt as fmtEur } from '@/lib/format';

const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;
const fmtInt = (n: number) => n.toLocaleString('el-GR');

export async function KpiStrip() {
  const t = await getTranslations('dashboard.hero');
  const hero = await getKpiHero();

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-7">
      <KpiCard
        label={t('revenueMtd')}
        metric={hero.revenueMtd}
        href="/admin/reports"
        icon={Wallet}
        formatValue={fmtEur}
      />
      <KpiCard
        label={t('collectionsMtd')}
        metric={hero.collectionsMtd}
        href="/admin/reports"
        icon={Banknote}
        formatValue={fmtEur}
      />
      <KpiCard
        label={t('pipeline')}
        metric={hero.pipeline}
        href="/admin/leads"
        icon={TrendingUp}
        formatValue={fmtEur}
      />
      <KpiCard
        label={t('activeProjects')}
        metric={hero.activeProjects}
        href="/admin/projects"
        icon={Briefcase}
        formatValue={fmtInt}
      />
      <KpiCard
        label={t('profitMargin')}
        metric={hero.profitMargin}
        href="/admin/reports"
        icon={Activity}
        formatValue={fmtPct}
      />
      <KpiCard
        label={t('cashOverdue')}
        metric={hero.cashOverdue}
        href="/admin/invoices?status=overdue"
        icon={Coins}
        formatValue={fmtEur}
        invertDeltaColors
      />
      <KpiCard
        label={t('atRisk')}
        metric={hero.atRiskCount}
        href="/admin/dashboard/risk"
        icon={AlertTriangle}
        formatValue={fmtInt}
        invertDeltaColors
      />
    </div>
  );
}
