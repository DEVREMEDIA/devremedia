import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { SectionTabs, type SectionTab } from '@/components/shell-v2/section-tabs';
import { PageHeading } from '@/components/shared/page-heading';
import { Button } from '@/components/ui/button';

import { ProjectsContent } from '@/app/admin/projects/projects-content';
import AdminFilmingRequestsPage from '@/app/admin/filming-requests/requests-page';
import { CrewLoadHeatmap } from '@/components/admin/dashboard/production/crew-load-heatmap';
import { UpcomingDeadlinesGrouped } from '@/components/admin/dashboard/production/upcoming-deadlines-grouped';
import { CardSkeleton } from '@/components/admin/dashboard/shared/card-skeletons';

import { getProjects } from '@/lib/actions/projects';
import type { ProjectWithClient } from '@/types';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shellV2.pages.adminProductions');
  return { title: t('title') };
}

type SearchParams = Promise<{ tab?: string }>;

async function AllTab() {
  const t = await getTranslations('shellV2.pages.adminProductions');
  const result = await getProjects();

  if (result.error) {
    return <p className="text-sm text-destructive">{t('error', { message: result.error })}</p>;
  }

  return <ProjectsContent projects={(result.data as ProjectWithClient[]) ?? []} />;
}

function RequestsTab() {
  return <AdminFilmingRequestsPage />;
}

function OverviewTab() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Suspense fallback={<CardSkeleton rows={4} />}>
        <CrewLoadHeatmap />
      </Suspense>
      <Suspense fallback={<CardSkeleton rows={5} />}>
        <UpcomingDeadlinesGrouped />
      </Suspense>
    </div>
  );
}

export default async function ProductionsPage({ searchParams }: { searchParams: SearchParams }) {
  const t = await getTranslations('shellV2.pages.adminProductions');
  const TABS: SectionTab[] = [
    { key: 'all', label: t('tabAll') },
    { key: 'requests', label: t('tabRequests') },
    { key: 'overview', label: t('tabOverview') },
  ];
  const params = await searchParams;
  const active = TABS.some((tab) => tab.key === params.tab) ? (params.tab as string) : 'all';

  return (
    <div className="space-y-5">
      <PageHeading title={t('title')} subtitle={t('subtitle')}>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/availability">{t('linkAvailability')}</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/filming-prep">{t('linkFilmingPrep')}</Link>
        </Button>
      </PageHeading>

      <SectionTabs basePath="/admin/productions" tabs={TABS} active={active} />

      {active === 'all' && <AllTab />}
      {active === 'requests' && <RequestsTab />}
      {active === 'overview' && <OverviewTab />}
    </div>
  );
}
