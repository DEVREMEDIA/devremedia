import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { PageHeading } from '@/components/shared/page-heading';
import { StatGrid } from '@/components/shared/stat-grid';
import { StatCard } from '@/components/shared/stat-card';
import { RiskItem } from '@/components/admin/dashboard/risk/risk-item';
import { KpiStrip } from '@/components/admin/dashboard/hero/kpi-strip';
import { TodayAgenda } from '@/components/admin/dashboard/today/today-agenda';
import { ActivityFeed } from '@/components/admin/dashboard/activity-feed';
import { BusinessVelocity } from '@/components/admin/dashboard/velocity/business-velocity';
import { CardSkeleton, KpiStripSkeleton } from '@/components/admin/dashboard/shared/card-skeletons';
import { getRiskItems } from '@/lib/queries/dashboard/risk';
import { getRecentActivity } from '@/lib/queries';
import { getAdminRole } from '@/lib/auth-helpers';
import type { RiskType } from '@/types/dashboard';
import type { ActivityLogWithUser } from '@/types';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shellV2.pages.adminToday');
  return { title: t('title') };
}

async function Subtitle() {
  const t = await getTranslations('shellV2.pages.adminToday');
  const items = await getRiskItems();
  return <span>{t('subtitle', { count: items.length })}</span>;
}

async function ActivityFeedSection() {
  const recentActivity = await getRecentActivity(10);
  return <ActivityFeed activities={recentActivity as ActivityLogWithUser[]} />;
}

async function RiskRadar() {
  const t = await getTranslations('shellV2.pages.adminToday');
  const RISK_GROUPS: { type: RiskType; label: string }[] = [
    { type: 'overdue_invoice', label: t('riskOverdueInvoice') },
    { type: 'filming_no_crew', label: t('riskFilmingNoCrew') },
    { type: 'deadline_risk', label: t('riskDeadlineRisk') },
    { type: 'stale_deliverable', label: t('riskStaleDeliverable') },
    { type: 'unsigned_contract', label: t('riskUnsignedContract') },
    { type: 'stale_lead', label: t('riskStaleLead') },
  ];
  const items = await getRiskItems();

  return (
    <>
      {/* Ραντάρ: μία ματιά σε ό,τι σαπίζει σιωπηλά */}
      <section>
        <h2 className="mb-2.5 border-b border-border pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {t('sectionAtRisk')}
        </h2>
        <StatGrid columns={6}>
          {RISK_GROUPS.map((group) => {
            const count = items.filter((i) => i.type === group.type).length;
            return (
              <StatCard
                key={group.type}
                label={group.label}
                value={count}
                tone={count > 0 ? 'critical' : 'neutral'}
              />
            );
          })}
        </StatGrid>
      </section>

      {/* Οι ίδιες οι εκκρεμότητες, ομαδοποιημένες */}
      {items.length === 0 ? (
        <div className="border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {t('emptyState')}
        </div>
      ) : (
        RISK_GROUPS.map((group) => {
          const groupItems = items.filter((i) => i.type === group.type);
          if (groupItems.length === 0) return null;

          return (
            <section key={group.type}>
              <h2 className="mb-2.5 border-b border-border pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {group.label} ({groupItems.length})
              </h2>
              <div>
                {groupItems.map((item) => (
                  <RiskItem key={`${item.type}-${item.id}`} item={item} label={group.label} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </>
  );
}

/**
 * Η αρχική δεν είναι αναφορά — είναι λίστα εκκρεμοτήτων.
 * Τα γραφήματα ζουν στα Οικονομικά, όπου τα ψάχνεις όταν τα θέλεις.
 */
export default async function TodayPage() {
  const [t, role] = await Promise.all([
    getTranslations('shellV2.pages.adminToday'),
    getAdminRole(),
  ]);
  const isSuper = role === 'super_admin';

  return (
    <div className="space-y-6">
      <PageHeading
        title={t('title')}
        subtitle={
          <Suspense fallback={<span>&nbsp;</span>}>
            <Subtitle />
          </Suspense>
        }
      />

      {isSuper && (
        <Suspense fallback={<KpiStripSkeleton />}>
          <KpiStrip />
        </Suspense>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<CardSkeleton rows={6} />}>
          <TodayAgenda />
        </Suspense>
        <Suspense fallback={<CardSkeleton rows={5} />}>
          <ActivityFeedSection />
        </Suspense>
      </div>

      <Suspense fallback={<CardSkeleton rows={6} />}>
        <RiskRadar />
      </Suspense>

      {isSuper && (
        <Suspense fallback={<CardSkeleton rows={4} />}>
          <BusinessVelocity />
        </Suspense>
      )}

      <p className="text-xs text-muted-foreground">
        {t('footerPrefix')}{' '}
        <Link href="/admin/finance?tab=reports" className="text-primary underline">
          {t('footerLink')}
        </Link>
        .
      </p>
    </div>
  );
}
