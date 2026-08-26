import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SectionTabs, type SectionTab } from '@/components/shell-v2/section-tabs';

import { ProjectsContent } from '@/app/admin/projects/projects-content';
import AdminFilmingRequestsPage from '@/app/admin/filming-requests/page';

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

export default async function ProductionsPage({ searchParams }: { searchParams: SearchParams }) {
  const t = await getTranslations('shellV2.pages.adminProductions');
  const TABS: SectionTab[] = [
    { key: 'all', label: t('tabAll') },
    { key: 'requests', label: t('tabRequests') },
  ];
  const params = await searchParams;
  const active = TABS.some((tab) => tab.key === params.tab) ? (params.tab as string) : 'all';

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </header>

      <SectionTabs basePath="/admin-v2/productions" tabs={TABS} active={active} />

      {active === 'all' && <AllTab />}
      {active === 'requests' && <RequestsTab />}
    </div>
  );
}
