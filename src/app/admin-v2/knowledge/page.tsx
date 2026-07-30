import type { ComponentProps } from 'react';
import type { Metadata } from 'next';
import { SectionTabs, type SectionTab } from '@/components/admin-v2/section-tabs';

import { UniversityOverview } from '@/components/admin/university/university-overview';
import { SalesResourcesOverview } from '@/components/admin/sales-resources/sales-resources-overview';

import { getKbCategories } from '@/lib/actions/kb-categories';
import { getKbArticles } from '@/lib/actions/kb-articles';
import { getSalesResourceCategories, getSalesResources } from '@/lib/actions/sales-resources';

export const metadata: Metadata = { title: 'Γνώση' };

const TABS: SectionTab[] = [
  { key: 'team', label: 'Ομάδα παραγωγής' },
  { key: 'sales', label: 'Πωλητές' },
];

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
  const params = await searchParams;
  const active = TABS.some((t) => t.key === params.tab) ? (params.tab as string) : 'team';

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Γνώση</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ένα σύστημα περιεχομένου με ετικέτα κοινού, αντί για τρία ξεχωριστά
        </p>
      </header>

      <SectionTabs basePath="/admin-v2/knowledge" tabs={TABS} active={active} />

      {active === 'team' && <TeamTab />}
      {active === 'sales' && <SalesTab />}
    </div>
  );
}
