import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/shared/page-header';
import { ActivityFeed } from '@/components/admin/dashboard/activity-feed';
import { KpiStrip } from '@/components/admin/dashboard/hero/kpi-strip';
import { TodayAgenda } from '@/components/admin/dashboard/today/today-agenda';
import { RiskPanel } from '@/components/admin/dashboard/risk/risk-panel';
import { SalesFunnelCard } from '@/components/admin/dashboard/sales/sales-funnel-card';
import { RevenueForecastCard } from '@/components/admin/dashboard/sales/revenue-forecast-card';
import { CostHealthCard } from '@/components/admin/dashboard/finance/cost-health-card';
import { ProjectProfitabilityCard } from '@/components/admin/dashboard/finance/project-profitability-card';
import { CrewLoadHeatmap } from '@/components/admin/dashboard/production/crew-load-heatmap';
import { UpcomingDeadlinesGrouped } from '@/components/admin/dashboard/production/upcoming-deadlines-grouped';
import { BusinessVelocity } from '@/components/admin/dashboard/velocity/business-velocity';
import { CardSkeleton, KpiStripSkeleton } from '@/components/admin/dashboard/shared/card-skeletons';
import { createClient } from '@/lib/supabase/server';
import { getRecentActivity } from '@/lib/queries';
import type { ActivityLogWithUser } from '@/types';

async function getRole(): Promise<'super_admin' | 'admin' | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!data) return null;
  if (data.role === 'super_admin' || data.role === 'admin') return data.role;
  return null;
}

async function ActivityFeedSection() {
  const recentActivity = await getRecentActivity(10);
  return <ActivityFeed activities={recentActivity as ActivityLogWithUser[]} />;
}

export default async function DashboardPage() {
  const t = await getTranslations('dashboard');
  const role = await getRole();

  const isSuper = role === 'super_admin';

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} />

      {isSuper && (
        <Suspense fallback={<KpiStripSkeleton />}>
          <KpiStrip />
        </Suspense>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<CardSkeleton rows={6} />}>
          <TodayAgenda />
        </Suspense>
        <Suspense fallback={<CardSkeleton rows={6} />}>
          <RiskPanel />
        </Suspense>
      </div>

      {isSuper && (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <Suspense fallback={<CardSkeleton rows={5} />}>
              <SalesFunnelCard />
            </Suspense>
            <Suspense fallback={<CardSkeleton rows={5} />}>
              <RevenueForecastCard />
            </Suspense>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Suspense fallback={<CardSkeleton rows={5} />}>
              <CostHealthCard />
            </Suspense>
            <Suspense fallback={<CardSkeleton rows={5} />}>
              <ProjectProfitabilityCard />
            </Suspense>
          </div>
        </>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<CardSkeleton rows={4} />}>
          <CrewLoadHeatmap />
        </Suspense>
        <Suspense fallback={<CardSkeleton rows={5} />}>
          <UpcomingDeadlinesGrouped />
        </Suspense>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<CardSkeleton rows={5} />}>
          <ActivityFeedSection />
        </Suspense>
        {isSuper && (
          <Suspense fallback={<CardSkeleton rows={4} />}>
            <BusinessVelocity />
          </Suspense>
        )}
      </div>
    </div>
  );
}
