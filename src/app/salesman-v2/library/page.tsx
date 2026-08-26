import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SectionTabs, type SectionTab } from '@/components/shell-v2/section-tabs';

import SalesmanResourcesPage from '@/app/salesman/resources/page';
import HandbookPage from '@/app/salesman/handbook/page';

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
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </header>

      <SectionTabs basePath="/salesman-v2/library" tabs={TABS} active={active} />

      {active === 'resources' ? <SalesmanResourcesPage /> : <HandbookPage />}
    </div>
  );
}
