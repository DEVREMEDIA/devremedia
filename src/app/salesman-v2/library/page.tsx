import type { Metadata } from 'next';
import { SectionTabs, type SectionTab } from '@/components/shell-v2/section-tabs';

import SalesmanResourcesPage from '@/app/salesman/resources/page';
import HandbookPage from '@/app/salesman/handbook/page';

export const metadata: Metadata = { title: 'Υλικό' };

const TABS: SectionTab[] = [
  { key: 'resources', label: 'Αρχεία' },
  { key: 'handbook', label: 'Εγχειρίδιο' },
];

type SearchParams = Promise<{ tab?: string }>;

export default async function SalesmanV2LibraryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const active = TABS.some((t) => t.key === params.tab) ? (params.tab as string) : 'resources';

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Υλικό</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ό,τι στέλνεις στον υποψήφιο και ό,τι χρειάζεσαι για να το πεις σωστά
        </p>
      </header>

      <SectionTabs basePath="/salesman-v2/library" tabs={TABS} active={active} />

      {active === 'resources' ? <SalesmanResourcesPage /> : <HandbookPage />}
    </div>
  );
}
