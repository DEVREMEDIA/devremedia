import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SectionTabs, type SectionTab } from '@/components/shell-v2/section-tabs';
import { PageHeading } from '@/components/shared/page-heading';

import SalesmanResourcesPage from '@/app/salesman/resources/resources-page';
import HandbookPage from '@/app/salesman/handbook/handbook-page';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shellV2.pages.salesmanLibrary');
  return { title: t('title') };
}

type SearchParams = Promise<{ tab?: string }>;

export default async function SalesmanV2LibraryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const t = await getTranslations('shellV2.pages.salesmanLibrary');
  const TABS: SectionTab[] = [
    { key: 'resources', label: t('tabResources') },
    { key: 'handbook', label: t('tabHandbook') },
  ];
  const params = await searchParams;
  const active = TABS.some((tab) => tab.key === params.tab) ? (params.tab as string) : 'resources';

  return (
    <div className="space-y-5">
      <PageHeading title={t('title')} subtitle={t('subtitle')} />

      <SectionTabs basePath="/salesman/library" tabs={TABS} active={active} />

      {active === 'resources' ? <SalesmanResourcesPage /> : <HandbookPage />}
    </div>
  );
}
