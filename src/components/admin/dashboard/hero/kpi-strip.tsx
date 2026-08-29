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
import { StatGrid } from '@/components/shared/stat-grid';
import { StatCard } from '@/components/shared/stat-card';
import { getKpiHero } from '@/lib/queries/dashboard/kpi-hero';
import { formatEurInt as fmtEur } from '@/lib/format';

const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;
const fmtInt = (n: number) => n.toLocaleString('el-GR');

export async function KpiStrip() {
  const t = await getTranslations('dashboard.hero');
  const hero = await getKpiHero();

  return (
    <StatGrid columns={7}>
      <StatCard
        label={t('revenueMtd')}
        value={fmtEur(hero.revenueMtd.value)}
        href="/admin/reports"
        icon={Wallet}
        deltaPct={hero.revenueMtd.deltaPct}
        sparkline={hero.revenueMtd.sparkline ?? []}
        exception={hero.revenueMtd.exception}
      />
      <StatCard
        label={t('collectionsMtd')}
        value={fmtEur(hero.collectionsMtd.value)}
        href="/admin/reports"
        icon={Banknote}
        deltaPct={hero.collectionsMtd.deltaPct}
        sparkline={hero.collectionsMtd.sparkline ?? []}
        exception={hero.collectionsMtd.exception}
      />
      <StatCard
        label={t('pipeline')}
        value={fmtEur(hero.pipeline.value)}
        href="/admin/leads"
        icon={TrendingUp}
        deltaPct={hero.pipeline.deltaPct}
        sparkline={hero.pipeline.sparkline ?? []}
        exception={hero.pipeline.exception}
      />
      <StatCard
        label={t('activeProjects')}
        value={fmtInt(hero.activeProjects.value)}
        href="/admin/projects"
        icon={Briefcase}
        deltaPct={hero.activeProjects.deltaPct}
        sparkline={hero.activeProjects.sparkline ?? []}
        exception={hero.activeProjects.exception}
      />
      <StatCard
        label={t('profitMargin')}
        value={fmtPct(hero.profitMargin.value)}
        href="/admin/reports"
        icon={Activity}
        deltaPct={hero.profitMargin.deltaPct}
        sparkline={hero.profitMargin.sparkline ?? []}
        exception={hero.profitMargin.exception}
      />
      <StatCard
        label={t('cashOverdue')}
        value={fmtEur(hero.cashOverdue.value)}
        href="/admin/invoices?status=overdue"
        icon={Coins}
        deltaPct={hero.cashOverdue.deltaPct}
        sparkline={hero.cashOverdue.sparkline ?? []}
        exception={hero.cashOverdue.exception}
        invertDelta
      />
      <StatCard
        label={t('atRisk')}
        value={fmtInt(hero.atRiskCount.value)}
        href="/admin/today"
        icon={AlertTriangle}
        deltaPct={hero.atRiskCount.deltaPct}
        sparkline={hero.atRiskCount.sparkline ?? []}
        exception={hero.atRiskCount.exception}
        invertDelta
      />
    </StatGrid>
  );
}
