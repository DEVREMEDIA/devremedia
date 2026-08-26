import type { ComponentProps } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SectionTabs, type SectionTab } from '@/components/shell-v2/section-tabs';
import { PageHeading } from '@/components/shared/page-heading';

import { UniversityOverview } from '@/components/admin/university/university-overview';
import { SalesResourcesOverview } from '@/components/admin/sales-resources/sales-resources-overview';

import { getKbCategories } from '@/lib/actions/kb-categories';
import { getKbArticles } from '@/lib/actions/kb-articles';
import { getSalesResourceCategories, getSalesResources } from '@/lib/actions/sales-resources';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('shellV2.pages.adminKnowledge');
  return { title: t('title') };
}

type SearchParams = Promise<{ tab?: string }>;
type UniProps = ComponentProps<typeof UniversityOverview>;
type SalesProps = ComponentProps<typeof SalesResourcesOverview>;

async function TeamTab() {
  const [categoriesResult, articlesResult] = await Promise.all([
    getKbCategories(),
    getKbArticles(),
  ]);

  return (
    <UniversityOverview
      categories={(categoriesResult.data ?? []) as UniProps['categories']}
      articles={(articlesResult.data ?? []) as UniProps['articles']}
    />
  );
}

async function SalesTab() {
  const [categoriesResult, resourcesResult] = await Promise.all([
    getSalesResourceCategories(),
    getSalesResources(),
  ]);

  return (
    <SalesResourcesOverview
      categories={(categoriesResult.data ?? []) as SalesProps['categories']}
      resources={(resourcesResult.data ?? []) as unknown as SalesProps['resources']}
    />
  );
}

export default async function KnowledgePage({ searchParams }: { searchParams: SearchParams }) {
  const t = await getTranslations('shellV2.pages.adminKnowledge');
  const TABS: SectionTab[] = [
    { key: 'team', label: t('tabTeam') },
    { key: 'sales', label: t('tabSales') },
  ];
  const params = await searchParams;
  const active = TABS.some((tab) => tab.key === params.tab) ? (params.tab as string) : 'team';

  return (
    <div className="space-y-5">
      <PageHeading title={t('title')} subtitle={t('subtitle')} />

      <SectionTabs basePath="/admin/knowledge" tabs={TABS} active={active} />

      {active === 'team' && <TeamTab />}
      {active === 'sales' && <SalesTab />}
    </div>
  );
}
